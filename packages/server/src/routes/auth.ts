import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';
import { AuthUser } from '../types';

const router = Router();

/**
 * Simple in-memory user store for MVP
 * TODO: Replace with actual database (PostgreSQL/SQLite)
 */
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
}

const users = new Map<string, User>();

// Create a default user for testing
const defaultUser: User = {
  id: '1',
  username: 'admin',
  email: 'admin@beekeeper.studio',
  passwordHash: bcrypt.hashSync('admin', 10), // Password: admin
};
users.set(defaultUser.username, defaultUser);

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
      return;
    }

    // Check if user already exists
    if (users.has(username)) {
      res.status(409).json({
        success: false,
        error: 'Username already exists'
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user: User = {
      id: Date.now().toString(),
      username,
      email: email || '',
      passwordHash,
    };

    users.set(username, user);

    // Generate token
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    const token = generateToken(authUser);

    res.status(201).json({
      success: true,
      data: {
        user: authUser,
        token
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
      return;
    }

    // Find user
    const user = users.get(username);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
      return;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
      return;
    }

    // Generate token
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    const token = generateToken(authUser);

    res.json({
      success: true,
      data: {
        user: authUser,
        token
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side should delete token)
 */
router.post('/logout', (req: Request, res: Response) => {
  // With JWT, logout is primarily client-side (delete token)
  // Could implement token blacklist here if needed
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;
