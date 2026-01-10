# Beekeeper Studio → Beekeeper Studio Web Migration Guide

This document explains the transformation from Electron-based Beekeeper Studio to a client/server web application.

## Architecture Transformation

### Before (Electron)
```
┌─────────────────────────────────────────┐
│         Electron Main Process           │
│  ┌──────────────────────────────────┐   │
│  │    Utility Process               │   │
│  │  - DB Connections                │   │
│  │  - Query Execution               │   │
│  │  - Schema Operations             │   │
│  └──────────────────────────────────┘   │
│              ▲                           │
│              │ MessagePort (IPC)         │
│              ▼                           │
│  ┌──────────────────────────────────┐   │
│  │    Renderer Process              │   │
│  │  - Vue.js UI                     │   │
│  │  - UtilityConnection.ts          │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### After (Web)
```
┌─────────────────────┐          ┌────────────────────────┐
│   Web Browser       │          │   Node.js Server       │
│  ┌──────────────┐   │          │  ┌──────────────────┐  │
│  │  Vue.js UI   │   │          │  │  Express REST     │  │
│  │              │   │          │  │  API              │  │
│  │ ApiConnection│◄──┼──HTTP────┼─►│                  │  │
│  │              │   │          │  │  - Connections   │  │
│  └──────────────┘   │          │  │  - Query         │  │
│                     │          │  │  - Schema        │  │
│                     │          │  └──────────────────┘  │
│                     │          │           │            │
│                     │◄─WebSocket──────────►│            │
│                     │          │           ▼            │
└─────────────────────┘          │  ┌──────────────────┐  │
                                 │  │  DB Clients      │  │
                                 │  │  - MySQL         │  │
                                 │  │  - PostgreSQL    │  │
                                 │  │  - SQLite        │  │
                                 │  │  - etc.          │  │
                                 │  └──────────────────┘  │
                                 └────────────────────────┘
```

## Key Changes

### 1. Communication Layer

| Component | Before (Electron) | After (Web) |
|-----------|-------------------|-------------|
| **Client → Server** | `MessagePort.postMessage()` | `axios.post()` / `fetch()` |
| **Server → Client** | `MessagePort.onmessage` | HTTP Response / WebSocket |
| **Protocol** | IPC (Inter-Process Communication) | HTTP REST + WebSocket |
| **Format** | `{ id, name, args }` | `POST /api/{route}` with JSON body |

#### Example: Creating a Connection

**Before (Electron):**
```typescript
// In Vue component
this.$util.send('conn/create', {
  config: connectionConfig,
  osUser: 'username',
  sId: this.$util.sId
});
```

**After (Web):**
```typescript
// In Vue component
this.$api.send('conn/create', {
  config: connectionConfig,
  osUser: 'username'
});

// Under the hood in ApiConnection.ts
axios.post('/api/connections/create', {
  config: connectionConfig,
  osUser: 'username'
});
```

### 2. State Management

| Aspect | Before (Electron) | After (Web) |
|--------|-------------------|-------------|
| **Location** | Utility process memory | Server memory |
| **Identifier** | `sId` (session ID per window) | JWT user ID |
| **Scope** | Per Electron window | Per authenticated user |
| **Storage** | In-memory Map | In-memory Map (session state) |
| **Persistence** | Lost on app close | Lost on server restart |

#### Session State Structure

**Before (handlerState.ts):**
```typescript
class State {
  port: MessagePortMain
  server: IDbConnectionPublicServer
  connection: BasicDatabaseClient
  queries: Map<string, CancelableQuery>
  // ...
}
const states = new Map<string, State>()
```

**After (sessionState.ts):**
```typescript
interface SessionState {
  userId: string
  sessionId: string
  server: any
  connection: any
  queries: Map<string, any>
  // ...
}
const sessions = new Map<string, SessionState>()
```

### 3. Authentication

| Feature | Before (Electron) | After (Web) |
|---------|-------------------|-------------|
| **Auth** | None (local app) | JWT tokens |
| **Users** | Single user (OS user) | Multi-user |
| **Sessions** | Per window | Per user token |
| **Security** | OS-level | HTTP + JWT |

#### Authentication Flow

**Web (New):**
```typescript
// 1. Login
const { token } = await apiConnection.login('username', 'password')

// 2. Token stored and sent with requests
apiConnection.setToken(token)

// 3. All API calls include token
headers: { Authorization: `Bearer ${token}` }

// 4. Server validates token and identifies user session
```

### 4. File Operations

| Operation | Before (Electron) | After (Web) |
|-----------|-------------------|-------------|
| **Open File** | `dialog.showOpenDialog()` | `<input type="file">` |
| **Save File** | `dialog.showSaveDialog()` | Blob + download link |
| **Access Local FS** | `fs.readFile()` | Upload to server |
| **SQLite DB (settings)** | Local file | Server-side DB or API |

#### Example: Export Data

**Before:**
```typescript
// Electron can write directly to local filesystem
const filePath = await dialog.showSaveDialog({
  defaultPath: 'export.csv'
})
fs.writeFile(filePath, csvData)
```

**After:**
```typescript
// Browser downloads via Blob
const blob = new Blob([csvData], { type: 'text/csv' })
const url = URL.createObjectURL(blob)
const link = document.createElement('a')
link.href = url
link.download = 'export.csv'
link.click()
```

### 5. Handler Mapping

All Electron handlers are mapped to REST API endpoints:

| Handler Name | HTTP Method | API Endpoint |
|--------------|-------------|--------------|
| `conn/create` | POST | `/api/connections/create` |
| `conn/connect` | POST | `/api/connections/connect` |
| `conn/disconnect` | POST | `/api/connections/disconnect` |
| `conn/listTables` | GET | `/api/schema/tables` |
| `conn/executeQuery` | POST | `/api/query/execute` |
| `conn/startTransaction` | POST | `/api/query/transaction/start` |
| ... | ... | ... |

See [ApiConnection.ts](packages/client/src/lib/ApiConnection.ts) for complete mapping.

## Migration Steps for Developers

### Phase 1: Server Setup ✅

1. **Create server package:**
   ```bash
   cd packages/server
   yarn install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start server:**
   ```bash
   yarn dev
   ```

### Phase 2: Client Migration (In Progress)

1. **Replace UtilityConnection with ApiConnection:**
   ```diff
   - import { UtilityConnection } from '@/lib/utility/UtilityConnection'
   + import { ApiConnection } from '@beekeeper-studio-web/client/lib/ApiConnection'
   ```

2. **Update Vue plugin:**
   ```typescript
   // Before
   Vue.prototype.$util = utilityConnection

   // After
   Vue.prototype.$api = apiConnection
   ```

3. **Update all component calls:**
   ```diff
   - await this.$util.send('conn/create', { config, osUser, sId })
   + await this.$api.send('conn/create', { config, osUser })
   ```

4. **Handle authentication:**
   ```typescript
   // Login before using API
   const { token } = await this.$api.login(username, password)
   // Token is automatically included in subsequent requests
   ```

### Phase 3: Testing

1. **Test authentication:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin"}'
   ```

2. **Test connection:**
   ```bash
   curl -X POST http://localhost:3000/api/connections/create \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "config": {
         "connectionType": "postgresql",
         "host": "localhost",
         "port": 5432,
         "user": "postgres",
         "password": "password"
       }
     }'
   ```

## Code Patterns

### Pattern 1: Simple Handler Call

**Before:**
```typescript
const tables = await this.$util.send('conn/listTables', {
  filter: { schema: 'public' },
  sId: this.$util.sId
})
```

**After:**
```typescript
const tables = await this.$api.send('conn/listTables', {
  filter: { schema: 'public' }
})
```

### Pattern 2: Event Listeners

**Before:**
```typescript
this.$util.addListener('transactionTimeoutWarning/1', (data) => {
  this.showWarning(data)
})
```

**After:**
```typescript
this.$api.addListener('transactionTimeoutWarning/1', (data) => {
  this.showWarning(data)
})
// Events delivered via WebSocket
```

### Pattern 3: Error Handling

**Before:**
```typescript
try {
  await this.$util.send('conn/create', args)
} catch (err) {
  // err.message, err.stack available
}
```

**After:**
```typescript
try {
  await this.$api.send('conn/create', args)
} catch (err) {
  // err.response.data.error, err.response.data.stack
}
```

## Component Changes Required

### Components that need updating:

1. **ConnectionInterface.vue**
   - Replace `$util` with `$api`
   - Add login UI
   - Handle authentication errors

2. **QueryEditor.vue**
   - Replace `$util` with `$api`
   - Update query execution flow
   - Handle WebSocket for streaming results

3. **TableTable.vue**
   - Replace `$util` with `$api`
   - Update data fetching

4. **All components using:**
   - `this.$util.send()`
   - `ipcRenderer`
   - `remote`
   - Electron dialogs

### Search and replace checklist:

```bash
# Find all $util usage
grep -r '\$util' apps/studio/src/components/

# Find all ipcRenderer usage
grep -r 'ipcRenderer' apps/studio/src/

# Find all electron imports
grep -r "from 'electron'" apps/studio/src/
```

## Database Client Migration

### Option 1: Reference Existing Code (Recommended)

Create symlinks or use TypeScript path mapping to reference existing DB clients:

```json
// tsconfig.json in server
{
  "compilerOptions": {
    "paths": {
      "@studio/*": ["../../apps/studio/src/*"]
    }
  }
}
```

Then import directly:
```typescript
import { ConnectionProvider } from '@studio/lib/db'
```

### Option 2: Copy DB Clients

Copy the entire `apps/studio/src/lib/db/` directory to `packages/server/src/lib/db/`.

**Pros:** Independent server code
**Cons:** Code duplication, harder to maintain

## Deployment

### Development

```bash
# Terminal 1: Start server
cd packages/server
yarn dev

# Terminal 2: Start client
cd packages/client
yarn dev
```

### Production

```bash
# Build server
cd packages/server
yarn build

# Build client
cd packages/client
yarn build

# Deploy
# - Server: Node.js (PM2, Docker, etc.)
# - Client: Static hosting (Nginx, Vercel, Netlify)
```

## Security Considerations

⚠️ **Critical before production:**

1. **Change JWT_SECRET** - Use strong random secret
2. **Enable HTTPS** - Never use HTTP in production
3. **Rate limiting** - Prevent API abuse
4. **Input validation** - Validate all user inputs
5. **SQL injection** - Already handled by drivers
6. **Encrypt DB credentials** - Store encrypted in server DB
7. **CORS restrictions** - Limit allowed origins
8. **Session expiration** - Implement timeout
9. **Audit logging** - Log all operations
10. **XSS protection** - Sanitize outputs

## Next Steps

1. ✅ Create server structure
2. ✅ Create REST API routes
3. ✅ Create ApiConnection.ts
4. ⏳ Copy/reference DB clients
5. ⏳ Wire up handlers in routes
6. ⏳ Test basic connection flow
7. ⏳ Update Vue components
8. ⏳ Implement WebSocket streaming
9. ⏳ Add authentication UI
10. ⏳ Production hardening

## Questions?

See:
- [Server README](packages/server/README.md)
- [Client README](packages/client/README.md)
- [Original Beekeeper CLAUDE.md](CLAUDE.md)
