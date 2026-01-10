/**
 * Simple Database Client - Minimal Working Implementation
 *
 * This is a simplified database client that demonstrates the basic flow.
 * It supports PostgreSQL as an example. Once this works, it can be replaced
 * with the full Beekeeper Studio DB clients.
 */

import { Pool, PoolConfig } from 'pg';
import rawLog from './logger';

const log = rawLog.scope('simpleDbClient');

export interface SimpleConnectionConfig {
  type: 'postgresql' | 'mysql' | 'sqlite';
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export class SimplePostgresClient {
  private pool: Pool;
  private config: SimpleConnectionConfig;
  private connected: boolean = false;

  constructor(config: SimpleConnectionConfig) {
    this.config = config;

    const poolConfig: PoolConfig = {
      host: config.host || 'localhost',
      port: config.port || 5432,
      user: config.user,
      password: config.password,
      database: config.database,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on('error', (err) => {
      log.error('Unexpected pool error:', err);
    });
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.connected = true;
      log.info('Connected to PostgreSQL database');
    } catch (err: any) {
      log.error('Connection failed:', err.message);
      throw new Error(`Failed to connect to database: ${err.message}`);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.connected = false;
      log.info('Disconnected from database');
    } catch (err: any) {
      log.error('Disconnect error:', err.message);
      throw err;
    }
  }

  /**
   * Execute a SQL query
   */
  async executeQuery(sql: string): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to database');
    }

    try {
      log.debug('Executing query:', sql.substring(0, 100));
      const result = await this.pool.query(sql);

      return {
        rows: result.rows,
        fields: result.fields?.map(f => ({
          name: f.name,
          dataTypeID: f.dataTypeID
        })),
        rowCount: result.rowCount,
        command: result.command
      };
    } catch (err: any) {
      log.error('Query execution error:', err.message);
      throw new Error(`Query failed: ${err.message}`);
    }
  }

  /**
   * List all tables in the current database
   */
  async listTables(schema: string = 'public'): Promise<any[]> {
    const sql = `
      SELECT
        schemaname as schema,
        tablename as name,
        'table' as type
      FROM pg_catalog.pg_tables
      WHERE schemaname = $1
      ORDER BY tablename
    `;

    const result = await this.pool.query(sql, [schema]);
    return result.rows;
  }

  /**
   * List all databases
   */
  async listDatabases(): Promise<string[]> {
    const sql = `
      SELECT datname
      FROM pg_database
      WHERE datistemplate = false
      ORDER BY datname
    `;

    const result = await this.pool.query(sql);
    return result.rows.map(row => row.datname);
  }

  /**
   * List all schemas
   */
  async listSchemas(): Promise<string[]> {
    const sql = `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name
    `;

    const result = await this.pool.query(sql);
    return result.rows.map(row => row.schema_name);
  }

  /**
   * List columns for a table
   */
  async listTableColumns(tableName: string, schema: string = 'public'): Promise<any[]> {
    const sql = `
      SELECT
        column_name as name,
        data_type as type,
        is_nullable as nullable,
        column_default as default_value
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
      ORDER BY ordinal_position
    `;

    const result = await this.pool.query(sql, [schema, tableName]);
    return result.rows;
  }

  /**
   * Get database version
   */
  async versionString(): Promise<string> {
    const result = await this.pool.query('SELECT version()');
    return result.rows[0].version;
  }

  /**
   * Get supported features
   */
  async supportedFeatures(): Promise<any> {
    return {
      customRoutines: true,
      comments: true,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: true,
      backupsOnly: false,
      restore: true,
      indexNullsNotDistinct: true,
    };
  }

  /**
   * Get table data with pagination
   */
  async selectTop(
    tableName: string,
    offset: number = 0,
    limit: number = 100,
    schema: string = 'public'
  ): Promise<any> {
    const sql = `
      SELECT *
      FROM "${schema}"."${tableName}"
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const result = await this.pool.query(sql);

    // Get total count
    const countSql = `SELECT COUNT(*) FROM "${schema}"."${tableName}"`;
    const countResult = await this.pool.query(countSql);
    const totalRows = parseInt(countResult.rows[0].count, 10);

    return {
      rows: result.rows,
      fields: result.fields,
      totalRows,
      affectedRows: result.rowCount
    };
  }
}

/**
 * Factory function to create a database client
 */
export function createSimpleClient(config: SimpleConnectionConfig): SimplePostgresClient {
  if (config.type !== 'postgresql') {
    throw new Error(`Database type ${config.type} not yet supported in simple client. Use PostgreSQL for now.`);
  }

  return new SimplePostgresClient(config);
}
