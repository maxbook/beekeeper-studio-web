# Beekeeper Studio Web Server

REST API server for Beekeeper Studio Web - transforms the Electron-based database client into a client/server web application.

## Overview

This server exposes the database connection and query functionality from Beekeeper Studio as REST APIs, replacing the Electron IPC communication with HTTP/WebSocket.

## Architecture

```
┌─────────────────┐         HTTP/WS          ┌──────────────────┐
│  Web Client     │ ◄──────────────────────► │  Express Server  │
│  (Vue.js)       │                           │  (Node.js)       │
└─────────────────┘                           └──────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │  DB Clients      │
                                              │  (MySQL, PG,     │
                                              │   SQLite, etc)   │
                                              └──────────────────┘
```

## API Routes

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login and get JWT token
- `POST /logout` - Logout (client-side token deletion)

### Connections (`/api/connections`)
- `POST /create` - Create database connection
- `POST /test` - Test connection configuration
- `POST /connect` - Explicitly connect
- `POST /disconnect` - Disconnect
- `POST /change-database` - Switch database
- `GET /databases` - List available databases
- `GET /supported-features` - Get DB features
- `GET /version` - Get DB version

### Query Execution (`/api/query`)
- `POST /execute` - Execute SQL query
- `POST /start` - Start cancelable query
- `POST /command` - Execute database command
- `GET /completions` - Get SQL autocomplete suggestions

#### Transactions
- `POST /transaction/reserve` - Reserve connection for transaction
- `POST /transaction/release` - Release connection
- `POST /transaction/start` - Start transaction
- `POST /transaction/commit` - Commit transaction
- `POST /transaction/rollback` - Rollback transaction

### Schema Operations (`/api/schema`)
- `GET /tables` - List tables
- `GET /views` - List views
- `GET /materialized-views` - List materialized views
- `GET /routines` - List stored procedures/functions
- `GET /schemas` - List schemas
- `GET /tables/:table/columns` - Get table columns
- `GET /tables/:table/indexes` - Get table indexes
- `GET /tables/:table/triggers` - Get table triggers
- `GET /tables/:table/keys` - Get foreign keys
- `GET /tables/:table/properties` - Get table properties
- `GET /tables/:table/create-script` - Get CREATE TABLE script
- `GET /tables/:table/data` - Get table data (paginated)
- `POST /tables/:table/create` - Create table
- `PUT /tables/:table` - Alter table
- `DELETE /tables/:table` - Drop table

## Setup

### Prerequisites
- Node.js 18+
- Yarn package manager

### Installation

```bash
cd packages/server
yarn install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
```
PORT=3000
JWT_SECRET=your-secret-key-change-this
CORS_ORIGIN=http://localhost:5173
```

### Development

Start the development server with hot reload:

```bash
yarn dev
```

### Production

Build and run:

```bash
yarn build
yarn start
```

## Session Management

Each authenticated user gets a session identified by their JWT token user ID. The session maintains:

- Active database connection
- Query state
- Transaction state
- Connection pool

Sessions are stored in-memory and cleaned up on disconnect.

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in requests:

```
Authorization: Bearer <token>
```

### Example Login Flow

1. Register or login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
```

2. Use the returned token:
```bash
curl http://localhost:3000/api/connections/databases \
  -H "Authorization: Bearer <token>"
```

## WebSocket Support

WebSocket endpoint at `ws://localhost:3000/ws` for:
- Streaming query results
- Real-time query progress
- Large result set handling

## Database Drivers

Supported databases (same as Beekeeper Studio):
- PostgreSQL
- MySQL / MariaDB / TiDB
- SQLite / LibSQL
- SQL Server
- Oracle
- MongoDB
- BigQuery
- CockroachDB
- Redshift
- Cassandra
- Firebird
- DuckDB
- ClickHouse
- SQL Anywhere
- SurrealDB
- Redis
- Trino

## Security

### Important Security Considerations

⚠️ **Before deploying to production:**

1. **Change JWT_SECRET** - Use a strong, random secret
2. **Enable HTTPS** - Never use HTTP in production
3. **Implement rate limiting** - Prevent abuse
4. **Add request validation** - Validate all inputs
5. **Use proper database** - Replace in-memory user store
6. **Encrypt connection configs** - Encrypt stored DB credentials
7. **Add CORS restrictions** - Limit allowed origins
8. **Implement session expiration** - Clean up inactive sessions
9. **Add audit logging** - Track all database operations
10. **SQL injection protection** - Already handled by drivers, but validate user input

## Next Steps

### Phase 1: Complete Handler Integration ✅ (Current)
- [x] Create server structure
- [x] Create route definitions
- [ ] Copy DB clients from Beekeeper
- [ ] Import and wire up ConnHandlers
- [ ] Test basic connection flow

### Phase 2: Client Migration
- [ ] Create ApiConnection.ts to replace UtilityConnection.ts
- [ ] Update Vue components to use HTTP instead of IPC
- [ ] Implement WebSocket streaming
- [ ] Test all existing UI flows

### Phase 3: Production Readiness
- [ ] Implement proper user database (PostgreSQL/SQLite)
- [ ] Add connection config encryption
- [ ] Add rate limiting
- [ ] Add comprehensive error handling
- [ ] Add logging and monitoring
- [ ] Write tests
- [ ] Add Docker support
- [ ] Write deployment guide

## Development Workflow

### Current State
The routes are defined but handlers are placeholder TODOs. Next steps:

1. Copy the DB client code from `apps/studio/src/lib/db/`
2. Copy the handler implementations from `apps/studio/src-commercial/backend/handlers/`
3. Adapt them to use the session state instead of Electron MessagePort
4. Wire up the actual handler calls in each route

### Testing

Once handlers are integrated, test with:

```bash
# Start server
yarn dev

# Test health endpoint
curl http://localhost:3000/health

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'

# Test connection (with token from login)
curl -X POST http://localhost:3000/api/connections/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "connectionType": "postgresql",
      "host": "localhost",
      "port": 5432,
      "user": "postgres",
      "password": "password",
      "defaultDatabase": "postgres"
    },
    "osUser": "admin"
  }'
```

## Contributing

This is part of the Beekeeper Studio Web migration project. See the main project README for contribution guidelines.

## License

GPLv3 - Same as Beekeeper Studio
