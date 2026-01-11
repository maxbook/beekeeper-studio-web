import axios, { AxiosInstance, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import rawLog from '@bksLogger';

const log = rawLog?.scope ? rawLog.scope('client/apiconnection') : console;

/**
 * ApiConnection - HTTP/WebSocket replacement for UtilityConnection
 *
 * This class replaces the Electron IPC communication (MessagePort) with
 * HTTP REST API calls and WebSocket for streaming.
 *
 * It maintains the same interface as UtilityConnection to minimize
 * changes in the Vue components.
 */

type Listener = (input: any) => void;

interface ApiConnectionConfig {
  baseURL?: string;
  token?: string;
}

export class ApiConnection {
  private axios: AxiosInstance;
  private token: string | null = null;
  private _sessionId: string | null = null;
  private listeners: Array<{ type: string; id: string; listener: Listener }> = [];
  private ws: WebSocket | null = null;
  private wsUrl: string;

  constructor(config?: ApiConnectionConfig) {
    const baseURL = config?.baseURL || process.env.VUE_APP_API_URL || 'http://localhost:3000';

    this.axios = axios.create({
      baseURL: `${baseURL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.wsUrl = baseURL.replace(/^http/, 'ws') + '/ws';

    // Set token if provided
    if (config?.token) {
      this.setToken(config.token);
    }

    // Request interceptor to add auth token
    this.axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          log.error('Authentication error - token invalid or expired');
          this.token = null;
          // Emit auth error event
          this.emitEvent('auth:error', { error: 'Unauthorized' });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get session ID (derived from JWT token user ID)
   */
  public get sId(): string | null {
    return this._sessionId;
  }

  /**
   * Set authentication token
   */
  public setToken(token: string): void {
    this.token = token;

    // Decode JWT to get user ID (session ID)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this._sessionId = payload.id;
    } catch (err) {
      log.error('Failed to decode JWT token:', err);
    }
  }

  /**
   * Clear authentication token
   */
  public clearToken(): void {
    this.token = null;
    this._sessionId = null;
  }

  /**
   * Login and get authentication token
   */
  public async login(username: string, password: string): Promise<{ user: any; token: string }> {
    const response = await this.axios.post('/auth/login', { username, password });

    if (response.data.success) {
      const { user, token } = response.data.data;
      this.setToken(token);
      return { user, token };
    }

    throw new Error(response.data.error || 'Login failed');
  }

  /**
   * Register a new user
   */
  public async register(username: string, password: string, email?: string): Promise<{ user: any; token: string }> {
    const response = await this.axios.post('/auth/register', { username, password, email });

    if (response.data.success) {
      const { user, token } = response.data.data;
      this.setToken(token);
      return { user, token };
    }

    throw new Error(response.data.error || 'Registration failed');
  }

  /**
   * Send a handler request (replaces MessagePort.postMessage)
   *
   * This method maps handler names to REST API endpoints.
   * Format: 'conn/create' -> POST /api/connections/create
   */
  public async send(handlerName: string, args?: any): Promise<any> {
    try {
      const { method, url } = this.mapHandlerToEndpoint(handlerName);

      log.info('API REQUEST:', method, url, args);

      let response;
      if (method === 'GET') {
        response = await this.axios.get(url, { params: args });
      } else if (method === 'POST') {
        response = await this.axios.post(url, args);
      } else if (method === 'PUT') {
        response = await this.axios.put(url, args);
      } else if (method === 'DELETE') {
        response = await this.axios.delete(url, { data: args });
      }

      if (response?.data.success) {
        return response.data.data;
      } else {
        throw new Error(response?.data.error || 'Request failed');
      }
    } catch (error: any) {
      log.error('API ERROR:', handlerName, error);

      if (error.response?.data?.error) {
        const err = new Error(error.response.data.error);
        if (error.response.data.stack) {
          err.stack = error.response.data.stack;
        }
        throw err;
      }

      throw error;
    }
  }

  /**
   * Map Electron handler names to REST API endpoints
   */
  private mapHandlerToEndpoint(handlerName: string): { method: string; url: string } {
    // Connection handlers
    const connectionMappings: Record<string, { method: string; url: string }> = {
      'conn/create': { method: 'POST', url: '/connections/create' },
      'conn/test': { method: 'POST', url: '/connections/test' },
      'conn/connect': { method: 'POST', url: '/connections/connect' },
      'conn/disconnect': { method: 'POST', url: '/connections/disconnect' },
      'conn/changeDatabase': { method: 'POST', url: '/connections/change-database' },
      'conn/listDatabases': { method: 'GET', url: '/connections/databases' },
      'conn/supportedFeatures': { method: 'GET', url: '/connections/supported-features' },
      'conn/versionString': { method: 'GET', url: '/connections/version' },

      // Query handlers
      'conn/executeQuery': { method: 'POST', url: '/query/execute' },
      'conn/query': { method: 'POST', url: '/query/start' },
      'conn/executeCommand': { method: 'POST', url: '/query/command' },
      'conn/getCompletions': { method: 'GET', url: '/query/completions' },

      // Transaction handlers
      'conn/reserveConnection': { method: 'POST', url: '/query/transaction/reserve' },
      'conn/releaseConnection': { method: 'POST', url: '/query/transaction/release' },
      'conn/startTransaction': { method: 'POST', url: '/query/transaction/start' },
      'conn/commitTransaction': { method: 'POST', url: '/query/transaction/commit' },
      'conn/rollbackTransaction': { method: 'POST', url: '/query/transaction/rollback' },

      // Schema handlers
      'conn/listTables': { method: 'GET', url: '/schema/tables' },
      'conn/listViews': { method: 'GET', url: '/schema/views' },
      'conn/listMaterializedViews': { method: 'GET', url: '/schema/materialized-views' },
      'conn/listRoutines': { method: 'GET', url: '/schema/routines' },
      'conn/listSchemas': { method: 'GET', url: '/schema/schemas' },
      'conn/listTableColumns': { method: 'GET', url: '/schema/tables/:table/columns' },
      'conn/listTableIndexes': { method: 'GET', url: '/schema/tables/:table/indexes' },
      'conn/listTableTriggers': { method: 'GET', url: '/schema/tables/:table/triggers' },
      'conn/getTableKeys': { method: 'GET', url: '/schema/tables/:table/keys' },
      'conn/getTableProperties': { method: 'GET', url: '/schema/tables/:table/properties' },
      'conn/getTableCreateScript': { method: 'GET', url: '/schema/tables/:table/create-script' },
      'conn/selectTop': { method: 'GET', url: '/schema/tables/:table/data' },
      'conn/createTable': { method: 'POST', url: '/schema/tables/:table/create' },
      'conn/alterTable': { method: 'PUT', url: '/schema/tables/:table' },
      'conn/dropElement': { method: 'DELETE', url: '/schema/tables/:table' },
    };

    const mapping = connectionMappings[handlerName];
    if (!mapping) {
      throw new Error(`Unknown handler: ${handlerName}`);
    }

    return mapping;
  }

  /**
   * Add event listener (for WebSocket events)
   */
  public addListener(type: string, listener: Listener): string {
    const id = uuidv4();
    this.listeners.push({ type, id, listener });
    log.info('ADDED LISTENER:', type, id);

    // Connect to WebSocket if not already connected
    this.connectWebSocket();

    return id;
  }

  /**
   * Remove event listener
   */
  public removeListener(id: string): void {
    this.listeners = this.listeners.filter((l) => l.id !== id);
  }

  /**
   * Connect to WebSocket for streaming
   */
  private connectWebSocket(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        log.info('WebSocket connected');

        // Send authentication token
        if (this.token) {
          this.ws?.send(JSON.stringify({
            type: 'auth',
            token: this.token,
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (err) {
          log.error('WebSocket message parse error:', err);
        }
      };

      this.ws.onerror = (error) => {
        log.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        log.info('WebSocket disconnected');
        this.ws = null;
      };
    } catch (err) {
      log.error('WebSocket connection error:', err);
    }
  }

  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(data: any): void {
    const { type, ...payload } = data;

    // Find matching listeners
    const matchingListeners = this.listeners.filter((l) => l.type === type);

    if (matchingListeners.length > 0) {
      matchingListeners.forEach((l) => {
        try {
          l.listener(payload);
        } catch (err) {
          log.error('Listener error:', err);
        }
      });
    } else {
      log.warn('No listener for WebSocket message type:', type);
    }
  }

  /**
   * Emit an event to listeners
   */
  private emitEvent(type: string, data: any): void {
    const matchingListeners = this.listeners.filter((l) => l.type === type);
    matchingListeners.forEach((l) => {
      try {
        l.listener(data);
      } catch (err) {
        log.error('Event emit error:', err);
      }
    });
  }

  /**
   * Disconnect and cleanup
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners = [];
  }
}

// Export singleton instance
export const apiConnection = new ApiConnection();
