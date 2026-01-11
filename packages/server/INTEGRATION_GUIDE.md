# Handler Integration Guide

This guide explains how to complete the integration of database handlers from Beekeeper Studio into the web server.

## Current Status ✅

- ✅ Server structure created
- ✅ REST API routes defined
- ✅ Session state management
- ✅ Handler placeholders created
- ⏳ **NEXT: Import DB clients and wire up handlers**

## Integration Steps

### Step 1: Copy Database Client Code

The database client code from Beekeeper Studio needs to be made available to the server. You have two options:

#### Option A: Symbolic Link (Recommended for Development)

```bash
cd packages/server/src
ln -s ../../../apps/studio/src/lib lib-studio
```

Then in handlers, import as:
```typescript
import { findClient } from '../lib-studio/db/clients';
import { createServer } from '../lib-studio/db-server';
```

#### Option B: Copy Files (Better for Production)

```bash
# From project root
cp -r apps/studio/src/lib/db packages/server/src/lib/
cp -r apps/studio/src-commercial/backend/lib packages/server/src/lib-commercial/
```

### Step 2: Install Required Dependencies

Add database driver dependencies to `packages/server/package.json`:

```bash
cd packages/server

# Core DB drivers
yarn add mysql2 pg better-sqlite3 tedious oracledb mongodb

# Additional drivers (optional)
yarn add cassandra-driver knex @google-cloud/bigquery
yarn add @clickhouse/client @redis/client libsql
```

### Step 3: Create Connection Provider Adapter

Create `packages/server/src/lib/connectionProvider.ts`:

```typescript
import { IConnection, IDbConnectionServerConfig, IDbConnectionPublicServer } from './types';

// Import from studio code (adjust path based on Step 1)
import { findClient } from '../lib-studio/db/clients';
import { createServer as studioCreateServer } from '../lib-studio/db-server';

export class ConnectionProvider {
  static convertConfig(
    config: IConnection,
    osUsername: string,
    settings: any = {}
  ): IDbConnectionServerConfig {
    // Simplified version - adapt as needed
    const ssh = config.sshEnabled ? {
      host: config.sshHost?.trim() || null,
      port: config.sshPort,
      user: config.sshUsername?.trim() || null,
      password: config.sshPassword,
      privateKey: config.sshKeyfile,
      passphrase: config.sshKeyfilePassword,
      bastionHost: config.sshBastionHost,
      useAgent: config.sshMode === 'agent',
      keepaliveInterval: config.sshKeepaliveInterval,
    } : null;

    return {
      client: config.connectionType,
      host: config.host?.trim() || null,
      port: config.port,
      url: config.url,
      serviceName: config.serviceName || null,
      domain: config.domain || null,
      socketPath: config.socketPath,
      socketPathEnabled: config.socketPathEnabled,
      user: config.username?.trim() || null,
      osUser: osUsername,
      password: config.password,
      ssh,
      ssl: config.ssl,
      sslCaFile: config.sslCaFile,
      sslCertFile: config.sslCertFile,
      sslKeyFile: config.sslKeyFile,
      sslRejectUnauthorized: config.sslRejectUnauthorized,
      trustServerCertificate: config.trustServerCertificate,
      options: config.options,
      redshiftOptions: config.redshiftOptions,
      readOnlyMode: config.readOnlyMode,
      cassandraOptions: config.cassandraOptions,
      bigQueryOptions: config.bigQueryOptions,
      azureAuthOptions: config.azureAuthOptions,
      authId: config.authId,
      libsqlOptions: config.libsqlOptions,
      sqlAnywhereOptions: config.sqlAnywhereOptions,
      surrealDbOptions: config.surrealDbOptions,
      runtimeExtensions: []
    };
  }

  static for(
    config: IConnection,
    osUsername: string,
    settings: any = {}
  ): IDbConnectionPublicServer {
    const convertedConfig = this.convertConfig(config, osUsername, settings);
    return studioCreateServer(convertedConfig);
  }
}
```

### Step 4: Update Connection Handlers

In `packages/server/src/handlers/connectionHandlers.ts`, replace the TODO sections:

```typescript
import { ConnectionProvider } from '../lib/connectionProvider';
import { SqlGenerator } from '../lib-studio/sql/SqlGenerator';
import { dialectFor } from '../lib-studio/dialects/models';

export const ConnectionHandlers = {
  async create({ config, auth, osUser, sId }: ConnCreateArgs): Promise<void> {
    // ... validation code ...

    const session = getSession(sId);
    const abortController = new AbortController();
    session.connectionAbortController = abortController;

    let database = config.defaultDatabase || undefined;

    // Handle SurrealDB namespace
    if (config.connectionType === 'surrealdb' && config?.surrealDbOptions?.namespace && database) {
      database = `${config?.surrealDbOptions?.namespace}::${database}`;
    }

    // Mock settings for now (or load from DB)
    const settings = {};

    const server = ConnectionProvider.for(config, osUser, settings);
    const connection = server.createConnection(database);
    await connection.connect(abortController.signal);

    // Update session state
    session.server = server;
    session.usedConfig = config;
    session.connection = connection;
    session.database = config.defaultDatabase;
    session.generator = new SqlGenerator(dialectFor(config.connectionType), {
      dbConfig: connection.server.config,
      dbName: connection.database.database
    });
    session.connectionAbortController = null;
  },

  async test({ config, osUser, sId }: ConnTestArgs): Promise<void> {
    const session = getSession(sId);
    const settings = {};

    const server = ConnectionProvider.for(config, osUser, settings);
    const abortController = new AbortController();
    session.connectionAbortController = abortController;

    await server.createConnection(config.defaultDatabase).connect(abortController.signal);
    abortController.abort();
    server.disconnect();
    session.connectionAbortController = null;
  },

  async listTables({ filter, sId }: FilterArgs): Promise<TableOrView[]> {
    checkConnection(sId);
    const session = getSession(sId);
    return await session.connection.listTables(filter);
  },

  // ... implement other methods similarly ...
};
```

### Step 5: Wire Up Routes

Update `packages/server/src/routes/connections.ts`:

```typescript
import { ConnectionHandlers } from '../handlers/connectionHandlers';

router.post('/create', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const { config, auth, osUser } = req.body;

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
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
```

Repeat for all routes in:
- `packages/server/src/routes/connections.ts`
- `packages/server/src/routes/query.ts`
- `packages/server/src/routes/schema.ts`

### Step 6: Handle Type Imports

Create type re-exports in `packages/server/src/lib/types.ts`:

```typescript
// Re-export types from studio
export type {
  IConnection,
  IDbConnectionServerConfig,
  IDbConnectionPublicServer,
  FilterOptions,
  SchemaFilterOptions,
  DatabaseFilterOptions,
  TableOrView,
  Routine,
  TableColumn,
  ExtendedTableColumn,
  TableTrigger,
  TableIndex,
  TableKey,
  TablePartition,
  NgQueryResult,
  SupportedFeatures,
  TableProperties,
  PrimaryKeyColumn,
  OrderBy,
  TableFilter,
  TableResult,
  StreamResults,
  TableChanges,
  TableUpdateResult,
  AlterTableSpec,
  CreateTableSpec,
  IndexAlterations,
  RelationAlterations,
  AlterPartitionsSpec,
  TableInsert,
  DatabaseElement
} from '../../lib-studio/db/types';
```

### Step 7: Test End-to-End

```bash
# 1. Start server
cd packages/server
yarn dev

# 2. Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Save the token

# 3. Test connection (example with PostgreSQL)
curl -X POST http://localhost:3000/api/connections/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "connectionType": "postgresql",
      "host": "localhost",
      "port": 5432,
      "username": "postgres",
      "password": "password",
      "defaultDatabase": "postgres"
    },
    "osUser": "admin"
  }'

# 4. Test listing tables
curl -X GET "http://localhost:3000/api/schema/tables" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Test query execution
curl -X POST http://localhost:3000/api/query/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT version()",
    "options": {}
  }'
```

## Common Issues and Solutions

### Issue: Module not found

**Problem:** `Cannot find module '../lib-studio/db/clients'`

**Solution:** Make sure you completed Step 1 (symlink or copy). Verify the path is correct.

### Issue: Type errors

**Problem:** TypeScript errors about missing types

**Solution:**
1. Set `"strict": false` in tsconfig.json temporarily
2. Add proper type imports (Step 6)
3. Use `any` for complex types initially

### Issue: Database driver errors

**Problem:** `Cannot find module 'pg'` or similar

**Solution:** Install the specific driver: `yarn add pg` (or mysql2, better-sqlite3, etc.)

### Issue: SSH tunnel errors

**Problem:** SSH connections failing

**Solution:** SSH tunneling requires additional setup. You may need to install and configure SSH libraries.

## Alternative: Minimal Implementation

If the full integration is complex, you can start with a minimal implementation:

1. **PostgreSQL only** - Implement just PostgreSQL support first
2. **Direct imports** - Import pg driver directly, skip ConnectionProvider
3. **Basic features** - Implement only create, connect, listTables, executeQuery
4. **Expand later** - Add more databases and features incrementally

Example minimal implementation:

```typescript
// packages/server/src/lib/simplePostgresClient.ts
import { Pool } from 'pg';

export class SimplePostgresClient {
  private pool: Pool;

  constructor(config: any) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });
  }

  async connect(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async listTables(): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT tablename FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
    `);
    return result.rows;
  }

  async executeQuery(query: string): Promise<any> {
    return await this.pool.query(query);
  }
}
```

## Next Steps After Integration

Once handlers are working:

1. ✅ Test with real databases
2. ✅ Add error handling and validation
3. ✅ Implement WebSocket streaming for large results
4. ✅ Add connection pooling
5. ✅ Implement caching where appropriate
6. ✅ Add query logging and monitoring
7. ✅ Security hardening (SQL injection prevention, rate limiting)
8. ✅ Write tests

## Need Help?

Check these resources:
- Original handlers: `apps/studio/src-commercial/backend/handlers/connHandlers.ts`
- DB clients: `apps/studio/src/lib/db/clients/`
- Connection provider: `apps/studio/src-commercial/backend/lib/connection-provider.ts`
