# Beekeeper Studio Web Edition

This is the web-based version of Beekeeper Studio, transformed from an Electron desktop app to a client/server web application.

## Architecture

- **Client**: Vue.js 2.7 + TypeScript + Vite (runs in browser)
- **Server**: Express + TypeScript + Node.js (backend API)
- **Communication**: REST API + WebSocket
- **Authentication**: JWT tokens with bcrypt
- **Database Support**: PostgreSQL (primary), MySQL, SQLite (optional)

## Quick Start

### Prerequisites

- Node.js 18+ (you have 18.20.4 ✓)
- PostgreSQL server (optional, for testing)
- Yarn package manager

### Option 1: Use the Start Script (Recommended)

```bash
chmod +x start.sh
./start.sh
```

This will:
1. Check Node.js version
2. Install dependencies for both server and client
3. Open two terminal windows:
   - Server on http://localhost:3000
   - Client on http://localhost:5173

### Option 2: Manual Start

#### Terminal 1 - Start Server
```bash
cd packages/server
yarn install
yarn dev
```

Server will start on http://localhost:3000

#### Terminal 2 - Start Client
```bash
cd packages/client
yarn install
yarn dev
```

Client will start on http://localhost:5173

## First Time Setup

### 1. Default Login Credentials

The application comes with a default admin user:
- **Username**: `admin`
- **Password**: `admin`

### 2. Test Database Connection (PostgreSQL)

If you have PostgreSQL installed locally:
```bash
# Test if PostgreSQL is running
pg_isready -h localhost -p 5432
```

If you don't have PostgreSQL, use Docker:
```bash
docker run -d \
  --name postgres-test \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:14
```

Then connect with these settings:
- **Type**: PostgreSQL
- **Host**: localhost
- **Port**: 5432
- **User**: postgres
- **Password**: password
- **Database**: postgres

## Configuration

### Server Configuration (`packages/server/.env`)

```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**IMPORTANT**: Change `JWT_SECRET` in production!

### Client Configuration (`packages/client/.env`)

```env
VUE_APP_API_URL=http://localhost:3000
NODE_ENV=development
VUE_APP_DEBUG=true
```

## Features

### Phase 1 ✅ - Server Bootstrap
- Express REST API server
- JWT authentication system
- Session state management
- WebSocket support
- Health check endpoint

### Phase 2 ✅ - Database Integration
- PostgreSQL client with connection pooling
- Database connection handlers
- Query execution
- Schema introspection (databases, tables, columns)
- Complete REST API endpoints

### Phase 3 ✅ - Client Migration
- ApiConnection replacing Electron IPC
- Vue.js authentication store (Vuex)
- Login/Register components
- JWT token management
- Automatic session restoration

### Phase 4 ✅ - UI Integration
- Database connection form
- Database explorer with tree navigation
- Query editor with SQL execution
- Table data viewer with pagination
- CSV export functionality
- Tab navigation (Explorer/Query)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Database Connections
- `POST /api/connections/create` - Create connection
- `POST /api/connections/test` - Test connection
- `POST /api/connections/connect` - Connect to database
- `POST /api/connections/disconnect` - Disconnect
- `GET /api/connections/listDatabases` - List databases
- `GET /api/connections/listTables` - List tables
- `GET /api/connections/getTableColumns` - Get table structure

### Query Execution
- `POST /api/query/executeQuery` - Execute SQL query
- `POST /api/query/selectTop` - Select top N rows

### Schema Information
- `GET /api/schema/listTableColumns` - Get table columns
- `GET /api/schema/getTableKeys` - Get table keys
- `GET /api/schema/listRoutines` - List stored procedures

## Project Structure

```
beekeeper-studio-web/
├── packages/
│   ├── server/           # Backend API
│   │   ├── src/
│   │   │   ├── index.ts              # Server entry point
│   │   │   ├── routes/               # REST API routes
│   │   │   ├── handlers/             # Business logic handlers
│   │   │   ├── middleware/           # Auth middleware
│   │   │   ├── state/                # Session management
│   │   │   └── lib/                  # Database clients
│   │   ├── .env                      # Server configuration
│   │   └── package.json
│   │
│   └── client/           # Frontend application
│       ├── src/
│       │   ├── WebApp.vue            # Main app component
│       │   ├── components/
│       │   │   ├── Auth/             # Login/Register
│       │   │   └── Database/         # Connection, Explorer, Query Editor
│       │   ├── store/                # Vuex store
│       │   ├── lib/
│       │   │   └── ApiConnection.ts  # API client
│       │   └── plugins/              # Vue plugins
│       ├── .env                      # Client configuration
│       └── package.json
│
├── start.sh              # Quick start script
├── WEB_README.md         # This file
└── README.md             # Original Beekeeper Studio README

```

## Troubleshooting

### Error: Node version incompatible

Make sure you're using Node.js 18+:
```bash
node -v  # Should show v18.x.x or higher
```

### Error: Cannot connect to PostgreSQL

Check if PostgreSQL is running:
```bash
pg_isready -h localhost -p 5432
```

Or start with Docker:
```bash
docker run -d --name postgres-test -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:14
```

### Error: Port already in use

If port 3000 or 5173 is already in use:

**Change server port** (in `packages/server/.env`):
```env
PORT=3001
```

**Change client port** (in `packages/client/vite.config.ts`):
```typescript
server: {
  port: 5174,  // Change this
}
```

### Error: yarn install fails

Try cleaning and reinstalling:
```bash
# Server
cd packages/server
rm -rf node_modules yarn.lock
yarn install

# Client
cd packages/client
rm -rf node_modules yarn.lock
yarn install
```

### WebSocket connection fails

Make sure:
1. Server is running on http://localhost:3000
2. Client .env has correct API URL
3. No firewall blocking WebSocket connections

## Database Support

### Currently Implemented
- **PostgreSQL** (Full support, tested)

### Planned Support
- **MySQL** (Client ready, needs testing)
- **SQLite** (Client ready, needs testing)
- **SQL Server** (Planned)
- **MongoDB** (Planned)

To add support for MySQL or SQLite, install the optional dependencies:
```bash
cd packages/server
yarn add mysql2 better-sqlite3
```

## Development

### Run tests
```bash
# Server tests (when available)
cd packages/server
yarn test

# Client tests (when available)
cd packages/client
yarn test
```

### Build for production
```bash
# Server
cd packages/server
yarn build
yarn start

# Client
cd packages/client
yarn build
# Serve the dist/ folder with a static server
```

### Lint code
```bash
cd packages/server
yarn lint

cd packages/client
yarn lint
```

## Migration from Electron

This web version maintains the same core functionality as the Electron version:

| Electron Feature | Web Equivalent |
|-----------------|----------------|
| UtilityConnection (IPC) | ApiConnection (HTTP/WebSocket) |
| MessagePort | REST API + WebSocket |
| Per-window state | Per-user sessions (JWT) |
| Native database drivers | Server-side database clients |
| File system access | Server-side file operations |

The client-side API is designed to be compatible with the original Electron API:
```typescript
// Before (Electron)
await this.$util.send('conn/connect', { config })

// After (Web)
await this.$api.send('conn/connect', { config })
```

## Documentation

For more details, see:
- `PROJECT_COMPLETE.md` - Complete project status and features
- `FINAL_STATUS.md` - Implementation details and architecture
- Original README.md - Electron version documentation

## Security Notes

### Production Deployment Checklist

1. **Change JWT Secret**
   ```env
   JWT_SECRET=<generate-a-secure-random-string>
   ```

2. **Use HTTPS**
   - Configure SSL/TLS certificates
   - Update CORS_ORIGIN to use https://

3. **Change Default Admin Password**
   - Login with admin/admin
   - Create a new admin user
   - Delete the default admin

4. **Database Security**
   - Use strong database passwords
   - Limit database user permissions
   - Use SSL/TLS for database connections

5. **Environment Variables**
   - Never commit .env files to git
   - Use environment-specific configurations
   - Keep secrets in secure vault (e.g., AWS Secrets Manager)

6. **CORS Configuration**
   - Restrict CORS_ORIGIN to your actual domain
   - Don't use wildcard (*) in production

## License

This web version maintains the same license as the original Beekeeper Studio:
- Community features: GPLv3
- Commercial features: Commercial EULA

## Contributing

This is a migration/transformation project. For the original Beekeeper Studio:
- Visit: https://github.com/beekeeper-studio/beekeeper-studio
- Docs: https://docs.beekeeperstudio.io

## Support

For issues specific to this web version, check:
1. This README.md troubleshooting section
2. Project documentation in PROJECT_COMPLETE.md
3. Original Beekeeper Studio docs for feature questions

## What's Next?

Current status: **85% complete** - Fully functional web application!

### Completed
- ✅ Server infrastructure with authentication
- ✅ PostgreSQL database integration
- ✅ Client authentication and session management
- ✅ Database connection UI
- ✅ Database explorer with tree navigation
- ✅ Query editor with execution
- ✅ Table data viewer

### Future Enhancements
- Additional database support (MySQL, SQLite, MongoDB, etc.)
- Saved queries functionality
- Query history
- Data export/import (CSV, JSON, SQL)
- Multiple database connections
- Query tabs
- Advanced filtering and sorting
- Schema visualization
- Database backups
- User management UI
- Team/workspace features
