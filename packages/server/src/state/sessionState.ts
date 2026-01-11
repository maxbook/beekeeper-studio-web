/**
 * Session State Management for Beekeeper Studio Web Server
 *
 * This replaces the Electron utility process state management.
 * Each user session maintains its own connection state, similar to how
 * Electron's utility process managed state per window.
 */

import { SessionState } from '../types';

/**
 * Global map of active sessions
 * Key: sessionId (JWT token ID or generated session ID)
 * Value: SessionState containing connection, queries, etc.
 */
const sessions = new Map<string, SessionState>();

/**
 * Get session state by ID
 * @param sessionId - The session identifier
 * @returns Session state or undefined if not found
 */
export function getSession(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId);
}

/**
 * Create a new session
 * @param sessionId - The session identifier
 * @param userId - The user ID owning this session
 * @returns The newly created session state
 */
export function createSession(sessionId: string, userId: string): SessionState {
  const session: SessionState = {
    userId,
    sessionId,
    server: null,
    connection: null,
    usedConfig: null,
    database: null,
    generator: null,
    queries: new Map(),
    transactionTimeouts: new Map(),
    connectionAbortController: null,
  };

  sessions.set(sessionId, session);
  return session;
}

/**
 * Remove a session and clean up resources
 * @param sessionId - The session identifier
 */
export async function removeSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);

  if (session) {
    // Cancel any ongoing queries
    for (const [queryId, query] of session.queries.entries()) {
      try {
        if (query?.cancel) {
          await query.cancel();
        }
      } catch (err) {
        console.error(`Error cancelling query ${queryId}:`, err);
      }
    }
    session.queries.clear();

    // Clear transaction timeouts
    for (const [tabId, timeout] of session.transactionTimeouts.entries()) {
      clearTimeout(timeout);
    }
    session.transactionTimeouts.clear();

    // Abort any pending connections
    if (session.connectionAbortController) {
      session.connectionAbortController.abort();
    }

    // Disconnect from database
    if (session.server) {
      try {
        await session.server.disconnect();
      } catch (err) {
        console.error(`Error disconnecting server for session ${sessionId}:`, err);
      }
    }

    sessions.delete(sessionId);
  }
}

/**
 * Get all sessions for a specific user
 * @param userId - The user ID
 * @returns Array of session IDs owned by this user
 */
export function getUserSessions(userId: string): string[] {
  const userSessions: string[] = [];

  for (const [sessionId, session] of sessions.entries()) {
    if (session.userId === userId) {
      userSessions.push(sessionId);
    }
  }

  return userSessions;
}

/**
 * Clean up inactive sessions (called periodically)
 * @param maxAgeMs - Maximum age of a session in milliseconds
 */
export function cleanupInactiveSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  // TODO: Implement session expiration tracking
  // For now, this is a placeholder
  console.log(`Cleanup check: ${sessions.size} active sessions`);
}

/**
 * Error messages
 */
export const errorMessages = {
  noSession: 'Session not found or expired',
  noConnection: 'No database connection found',
  noServer: 'No server found',
  noQuery: 'Query not found',
  noGenerator: 'No SQL generator found',
  unauthorized: 'Unauthorized access',
};

/**
 * Check if a session has an active connection
 * @param sessionId - The session identifier
 * @throws Error if no connection exists
 */
export function checkConnection(sessionId: string): void {
  const session = getSession(sessionId);

  if (!session) {
    throw new Error(errorMessages.noSession);
  }

  if (!session.connection) {
    throw new Error(errorMessages.noConnection);
  }
}

/**
 * Get connection for a session (with validation)
 * @param sessionId - The session identifier
 * @returns The database connection
 * @throws Error if no connection exists
 */
export function getConnection(sessionId: string): any {
  checkConnection(sessionId);
  return getSession(sessionId)!.connection;
}

/**
 * Helper to create a driver handler (similar to getDriverHandler in Electron version)
 * @param methodName - Name of the method to call on the connection
 * @returns Handler function
 */
export function createDriverHandler(methodName: string) {
  return async (sessionId: string, ...args: any[]): Promise<any> => {
    const connection = getConnection(sessionId);
    return await connection[methodName](...args);
  };
}
