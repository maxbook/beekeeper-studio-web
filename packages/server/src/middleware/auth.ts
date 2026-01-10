import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthUser } from '../types';

/**
 * JWT Secret - should be loaded from environment variables
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET in .env for production!');
}

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

    // Attach user to request
    req.user = decoded;

    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    } else if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Authentication token expired'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Authentication error'
      });
    }
  }
}

/**
 * Optional authentication middleware
 * Does not fail if token is missing, but validates if present
 */
export function optionalAuthenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = decoded;
    }

    next();
  } catch (err) {
    // Continue without authentication
    next();
  }
}

/**
 * Generate JWT token for a user
 * @param user - User information to encode in token
 * @returns JWT token string
 */
export function generateToken(user: AuthUser): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(user, JWT_SECRET, { expiresIn });
}

/**
 * Verify and decode JWT token
 * @param token - JWT token string
 * @returns Decoded user information
 */
export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

/**
 * Extract session ID from request
 * Uses JWT token's user ID as session identifier
 * @param req - Authenticated request
 * @returns Session ID
 */
export function getSessionId(req: AuthRequest): string {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  // Use user ID as session ID for now
  // In a more complex setup, could be jti (JWT ID) or separate session management
  return req.user.id;
}
