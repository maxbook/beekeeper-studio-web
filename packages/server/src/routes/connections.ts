import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, getSessionId } from '../middleware/auth';
import { getSession, createSession, checkConnection } from '../state/sessionState';
import { ConnectionHandlers } from '../handlers/connectionHandlers';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/connections/create
 * Create and connect to a database
 *
 * Body: {
 *   config: IConnection,
 *   auth?: { input: string; mode: "pin" },
 *   osUser: string
 * }
 */
router.post('/create', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const { config, auth, osUser } = req.body;

    if (!config) {
      res.status(400).json({
        success: false,
        error: 'Connection config is required'
      });
      return;
    }

    // Get or create session
    let session = getSession(sessionId);
    if (!session) {
      session = createSession(sessionId, req.user!.id);
    }

    // Call the handler
    await ConnectionHandlers.create({
      config,
      auth,
      osUser: osUser || req.user!.username,
      sId: sessionId
    });

    res.json({
      success: true,
      message: 'Connection created successfully',
      data: {
        sessionId,
        database: config.defaultDatabase
      }
    });
  } catch (err: any) {
    console.error('Connection create error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to create connection'
    });
  }
});

/**
 * POST /api/connections/test
 * Test a database connection
 */
router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const { config, osUser } = req.body;

    if (!config) {
      res.status(400).json({
        success: false,
        error: 'Connection config is required'
      });
      return;
    }

    // Call the handler
    await ConnectionHandlers.test({
      config,
      osUser: osUser || req.user!.username,
      sId: sessionId
    });

    res.json({
      success: true,
      message: 'Connection test successful'
    });
  } catch (err: any) {
    console.error('Connection test error:', err);
    res.status(400).json({
      success: false,
      error: err.message || 'Connection test failed'
    });
  }
});

/**
 * POST /api/connections/connect
 * Explicitly connect to database
 */
router.post('/connect', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = getSessionId(req);

    // TODO: Import and call ConnHandlers['conn/connect']
    // await ConnHandlers['conn/connect']({ sId: sessionId });

    res.json({
      success: true,
      message: 'Connected successfully'
    });
  } catch (err: any) {
    console.error('Connection error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Connection failed'
    });
  }
});

/**
 * POST /api/connections/disconnect
 * Disconnect from database
 */
router.post('/disconnect', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = getSessionId(req);

    // TODO: Import and call ConnHandlers['conn/disconnect']
    // await ConnHandlers['conn/disconnect']({ sId: sessionId });

    res.json({
      success: true,
      message: 'Disconnected successfully'
    });
  } catch (err: any) {
    console.error('Disconnect error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Disconnect failed'
    });
  }
});

/**
 * POST /api/connections/change-database
 * Change the active database
 */
router.post('/change-database', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const { database } = req.body;

    if (!database) {
      res.status(400).json({
        success: false,
        error: 'Database name is required'
      });
      return;
    }

    // TODO: Import and call ConnHandlers['conn/changeDatabase']
    // await ConnHandlers['conn/changeDatabase']({
    //   newDatabase: database,
    //   sId: sessionId
    // });

    res.json({
      success: true,
      message: 'Database changed successfully',
      data: { database }
    });
  } catch (err: any) {
    console.error('Change database error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to change database'
    });
  }
});

/**
 * GET /api/connections/databases
 * List available databases
 */
router.get('/databases', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    checkConnection(sessionId);

    // Call the handler
    const databases = await ConnectionHandlers.listDatabases({
      filter: req.query.filter as any,
      sId: sessionId
    });

    res.json({
      success: true,
      data: databases
    });
  } catch (err: any) {
    console.error('List databases error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to list databases'
    });
  }
});

/**
 * GET /api/connections/supported-features
 * Get supported features for current connection
 */
router.get('/supported-features', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    checkConnection(sessionId);

    // TODO: Import and call ConnHandlers['conn/supportedFeatures']
    // const features = await ConnHandlers['conn/supportedFeatures']({ sId: sessionId });

    res.json({
      success: true,
      data: {} // Placeholder
    });
  } catch (err: any) {
    console.error('Supported features error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to get supported features'
    });
  }
});

/**
 * GET /api/connections/version
 * Get database version string
 */
router.get('/version', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    checkConnection(sessionId);

    // Call the handler
    const version = await ConnectionHandlers.versionString({ sId: sessionId });

    res.json({
      success: true,
      data: { version }
    });
  } catch (err: any) {
    console.error('Version error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to get version'
    });
  }
});

export default router;
