import { Request } from 'express';

/**
 * User authentication data stored in JWT token
 */
export interface AuthUser {
  id: string;
  username: string;
  email?: string;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Session management
 * Each user session maintains its own connection state
 */
export interface SessionState {
  userId: string;
  sessionId: string;
  server: any; // ConnectionProvider
  connection: any; // IBasicDatabaseClient
  usedConfig: any; // IConnection
  database: string | null;
  generator: any; // SqlGenerator
  queries: Map<string, any>; // CancelableQuery
  transactionTimeouts: Map<number, NodeJS.Timeout>;
  connectionAbortController: AbortController | null;
}

/**
 * Connection configuration stored in database
 */
export interface StoredConnection {
  id: string;
  userId: string;
  name: string;
  connectionType: string;
  config: any; // IDbConnectionServerConfig (encrypted)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  stack?: string;
}

/**
 * WebSocket message types
 */
export type WSMessageType =
  | 'query:start'
  | 'query:data'
  | 'query:error'
  | 'query:complete'
  | 'stream:start'
  | 'stream:chunk'
  | 'stream:error'
  | 'stream:complete';

export interface WSMessage {
  type: WSMessageType;
  queryId?: string;
  data?: any;
  error?: string;
}
