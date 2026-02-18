/**
 * Token validation utility for OnedriveAudit application
 * Validates OAuth access tokens by making a test call to Microsoft Graph
 */

import { Client } from '@microsoft/microsoft-graph-client';

/**
 * Result of token validation
 */
export interface TokenValidationResult {
  isValid: boolean;
  error?: string;
  userPrincipalName?: string;
  userId?: string;
  expiresIn?: number;
}

/**
 * Validate an OAuth access token by making a test call to Microsoft Graph
 * @param accessToken The OAuth access token to validate
 * @returns TokenValidationResult indicating if the token is valid
 */
export async function validateToken(accessToken: string): Promise<TokenValidationResult> {
  try {
    // Create Graph client with the provided token
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
    
    // Make a test call to verify the token works
    // Use /me endpoint which requires the token to have delegated permissions
    const user = await client.api('/me').get();
    
    // Token is valid if we get a successful response
    return {
      isValid: true,
      userPrincipalName: user.userPrincipalName,
      userId: user.id,
    };
  } catch (error: any) {
    // Token is invalid or expired
    let errorMessage = 'Unknown error';
    
    if (error.statusCode === 401) {
      errorMessage = 'Token is invalid or expired (401 Unauthorized)';
    } else if (error.statusCode === 403) {
      errorMessage = 'Token does not have required permissions (403 Forbidden)';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      isValid: false,
      error: errorMessage,
    };
  }
}

/**
 * Validate token and throw error if invalid
 * Useful for startup validation where we want to fail fast
 * @param accessToken The OAuth access token to validate
 * @throws Error if token is invalid
 */
export async function validateTokenOrThrow(accessToken: string): Promise<void> {
  const result = await validateToken(accessToken);
  
  if (!result.isValid) {
    throw new Error(`OAuth token validation failed: ${result.error}`);
  }
}

/**
 * Extract claims from a JWT token without validation
 * NOTE: This does NOT validate the token signature, only decodes the payload
 * @param token JWT token string
 * @returns Decoded token payload
 */
export function decodeToken(token: string): any {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    // Decode the payload (second part)
    const payload = parts[1];
    const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decodedPayload);
  } catch (error) {
    throw new Error(`Failed to decode JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a JWT token is expired based on the 'exp' claim
 * NOTE: This does NOT validate the token signature
 * @param token JWT token string
 * @returns true if token is expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeToken(token);
    
    if (!payload.exp) {
      // If no expiration claim, assume not expired
      return false;
    }
    
    // exp claim is in seconds since epoch
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return currentTime >= expirationTime;
  } catch (error) {
    // If we can't decode the token, assume it's invalid/expired
    return true;
  }
}

/**
 * Get time until token expiration in seconds
 * @param token JWT token string
 * @returns Number of seconds until expiration, or null if no expiration or invalid token
 */
export function getTokenExpirationSeconds(token: string): number | null {
  try {
    const payload = decodeToken(token);
    
    if (!payload.exp) {
      return null;
    }
    
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const secondsUntilExpiration = Math.floor((expirationTime - currentTime) / 1000);
    
    return secondsUntilExpiration > 0 ? secondsUntilExpiration : 0;
  } catch (error) {
    return null;
  }
}
