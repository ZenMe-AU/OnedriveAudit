/**
 * Unit tests for tokenValidator utility
 */

import { validateToken, decodeToken, isTokenExpired, getTokenExpirationSeconds } from '../../src/utils/tokenValidator';

// Mock Microsoft Graph Client
jest.mock('@microsoft/microsoft-graph-client', () => {
  return {
    Client: {
      init: jest.fn().mockReturnValue({
        api: jest.fn().mockReturnValue({
          get: jest.fn(),
        }),
      }),
    },
  };
});

describe('tokenValidator', () => {
  describe('validateToken', () => {
    it('should return valid for a working token', async () => {
      // Mock successful API call
      const { Client } = require('@microsoft/microsoft-graph-client');
      const mockGet = jest.fn().mockResolvedValue({
        id: 'user123',
        userPrincipalName: 'test@example.com',
      });
      
      Client.init.mockReturnValue({
        api: jest.fn().mockReturnValue({
          get: mockGet,
        }),
      });

      const result = await validateToken('valid-token');

      expect(result.isValid).toBe(true);
      expect(result.userPrincipalName).toBe('test@example.com');
      expect(result.userId).toBe('user123');
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for an expired token (401)', async () => {
      // Mock 401 error
      const { Client } = require('@microsoft/microsoft-graph-client');
      const mockGet = jest.fn().mockRejectedValue({
        statusCode: 401,
        message: 'Unauthorized',
      });
      
      Client.init.mockReturnValue({
        api: jest.fn().mockReturnValue({
          get: mockGet,
        }),
      });

      const result = await validateToken('expired-token');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('401 Unauthorized');
    });

    it('should return invalid for insufficient permissions (403)', async () => {
      // Mock 403 error
      const { Client } = require('@microsoft/microsoft-graph-client');
      const mockGet = jest.fn().mockRejectedValue({
        statusCode: 403,
        message: 'Forbidden',
      });
      
      Client.init.mockReturnValue({
        api: jest.fn().mockReturnValue({
          get: mockGet,
        }),
      });

      const result = await validateToken('insufficient-token');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('403 Forbidden');
    });

    it('should handle unknown errors', async () => {
      // Mock unknown error
      const { Client } = require('@microsoft/microsoft-graph-client');
      const mockGet = jest.fn().mockRejectedValue(new Error('Network error'));
      
      Client.init.mockReturnValue({
        api: jest.fn().mockReturnValue({
          get: mockGet,
        }),
      });

      const result = await validateToken('error-token');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid JWT token', () => {
      // Create a simple JWT token (header.payload.signature)
      const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'RS256' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ sub: 'user123', name: 'Test User', exp: 1234567890 })).toString('base64');
      const signature = 'fake-signature';
      const token = `${header}.${payload}.${signature}`;

      const decoded = decodeToken(token);

      expect(decoded.sub).toBe('user123');
      expect(decoded.name).toBe('Test User');
      expect(decoded.exp).toBe(1234567890);
    });

    it('should throw error for invalid JWT format', () => {
      expect(() => decodeToken('invalid-token')).toThrow('Invalid JWT format');
    });

    it('should throw error for malformed payload', () => {
      const token = 'header.invalid-base64.signature';
      expect(() => decodeToken(token)).toThrow();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      // Create token that expires 1 hour in the future
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const header = Buffer.from(JSON.stringify({ typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ exp: futureExp })).toString('base64');
      const token = `${header}.${payload}.signature`;

      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      // Create token that expired 1 hour ago
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      const header = Buffer.from(JSON.stringify({ typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ exp: pastExp })).toString('base64');
      const token = `${header}.${payload}.signature`;

      expect(isTokenExpired(token)).toBe(true);
    });

    it('should return false for token without expiration', () => {
      const header = Buffer.from(JSON.stringify({ typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ sub: 'user123' })).toString('base64');
      const token = `${header}.${payload}.signature`;

      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for invalid token', () => {
      expect(isTokenExpired('invalid-token')).toBe(true);
    });
  });

  describe('getTokenExpirationSeconds', () => {
    it('should return seconds until expiration for valid token', () => {
      // Create token that expires 1 hour in the future
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const header = Buffer.from(JSON.stringify({ typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ exp: futureExp })).toString('base64');
      const token = `${header}.${payload}.signature`;

      const seconds = getTokenExpirationSeconds(token);

      expect(seconds).toBeGreaterThan(3500); // Allow some margin
      expect(seconds).toBeLessThanOrEqual(3600);
    });

    it('should return 0 for expired token', () => {
      // Create token that expired 1 hour ago
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      const header = Buffer.from(JSON.stringify({ typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ exp: pastExp })).toString('base64');
      const token = `${header}.${payload}.signature`;

      const seconds = getTokenExpirationSeconds(token);

      expect(seconds).toBe(0);
    });

    it('should return null for token without expiration', () => {
      const header = Buffer.from(JSON.stringify({ typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ sub: 'user123' })).toString('base64');
      const token = `${header}.${payload}.signature`;

      const seconds = getTokenExpirationSeconds(token);

      expect(seconds).toBeNull();
    });

    it('should return null for invalid token', () => {
      const seconds = getTokenExpirationSeconds('invalid-token');
      expect(seconds).toBeNull();
    });
  });
});
