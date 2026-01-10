# Beekeeper Studio Web Client

Vue.js 2 web application for Beekeeper Studio, replacing the Electron desktop client.

## Overview

This is the frontend web client that communicates with the Beekeeper Studio Web Server via REST API and WebSocket.

## Architecture

```
┌─────────────────────┐
│   Vue.js Client     │
│   (Browser)         │
├─────────────────────┤
│  - ApiConnection    │ ◄──┐
│  - Auth Components  │    │
│  - DB UI Components │    │
│  - Vuex Store       │    │
└─────────────────────┘    │
         │                 │
         ▼                 │
    HTTP/WebSocket         │ Replaces
         │                 │ Electron IPC
         ▼                 │
┌─────────────────────┐    │
│   Express Server    │    │
│   (Node.js)         │    │
└─────────────────────┘    │
                           │
┌─────────────────────┐    │
│  UtilityConnection  │ ───┘
│  (Electron IPC)     │ (Old)
└─────────────────────┘
```

## Features

✅ **Authentication**
- JWT-based login/register
- Token storage in localStorage
- Auto session restoration
- Logout functionality

✅ **API Communication**
- REST API calls via Axios
- WebSocket for streaming
- Same interface as Electron IPC
- Minimal code changes needed

✅ **State Management**
- Vuex store for auth
- Session persistence
- Error handling

## Setup

### Prerequisites

- Node.js 18+
- Yarn
- Running Beekeeper Studio Web Server (see `packages/server/`)

### Installation

```bash
cd packages/client
yarn install
```

### Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:
```
VUE_APP_API_URL=http://localhost:3000
NODE_ENV=development
```

### Development

Start the development server:

```bash
yarn dev
```

This will start Vite dev server on `http://localhost:5173` with:
- Hot module replacement
- Proxy to API server
- TypeScript checking

### Build for Production

```bash
yarn build
```

Builds to `dist/` folder, ready for deployment.

### Preview Production Build

```bash
yarn preview
```

## Project Structure

```
packages/client/
├── src/
│   ├── lib/
│   │   ├── ApiConnection.ts    # HTTP/WS client
│   │   └── logger.ts           # Simple logger
│   ├── plugins/
│   │   └── api.ts              # Vue plugin for $api
│   ├── components/
│   │   └── Auth/               # Auth components
│   │       ├── LoginForm.vue
│   │       ├── RegisterForm.vue
│   │       └── AuthPage.vue
│   ├── store/
│   │   └── modules/
│   │       └── auth.ts         # Auth Vuex module
│   ├── WebApp.vue              # Main app component
│   ├── main-web.ts             # Entry point
│   └── shims-vue.d.ts          # TypeScript declarations
├── public/
│   ├── index.html              # HTML template
│   └── favicon.ico
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
├── package.json
└── README.md
```

## Usage

### Login Flow

```typescript
// User opens app
// → Shows LoginForm
// → User enters credentials
// → Calls API: POST /api/auth/login
// → Receives JWT token
// → Stores in localStorage + Vuex
// → Shows main app
```

### API Calls

The `$api` plugin is available in all components:

```vue
<script>
export default {
  async mounted() {
    // Create a database connection
    await this.$api.send('conn/create', {
      config: {
        connectionType: 'postgresql',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'password',
        defaultDatabase: 'mydb'
      },
      osUser: this.$store.state.auth.user.username
    });

    // List tables
    const tables = await this.$api.send('conn/listTables', {
      filter: { schema: 'public' }
    });

    console.log('Tables:', tables);
  }
}
</script>
```

### Store Access

```vue
<script>
import { mapGetters } from 'vuex';

export default {
  computed: {
    ...mapGetters('auth', [
      'isAuthenticated',
      'currentUser',
      'authToken'
    ])
  },

  methods: {
    async logout() {
      await this.$store.dispatch('auth/logout');
    }
  }
}
</script>
```

## Migration from Electron

### Replacing UtilityConnection

**Before (Electron):**
```typescript
this.$util.send('conn/create', { config, osUser })
```

**After (Web):**
```typescript
this.$api.send('conn/create', { config, osUser })
```

The interface is intentionally identical!

### Key Differences

| Feature | Electron | Web |
|---------|----------|-----|
| Communication | IPC (MessagePort) | HTTP + WebSocket |
| Auth | None | JWT tokens |
| State | Per-window | Per-user session |
| File dialogs | `dialog.showOpenDialog` | `<input type="file">` |
| File saving | `dialog.showSaveDialog` | Blob download |
| Settings storage | SQLite local | API server |

## Development Notes

### API Connection

The `ApiConnection` class (`src/lib/ApiConnection.ts`) provides:
- Same interface as `UtilityConnection`
- Automatic JWT token injection
- Request/response interceptors
- WebSocket for streaming
- Event listeners

### Authentication

The auth store (`src/store/modules/auth.ts`) manages:
- User login/register
- Token persistence
- Session restoration
- Logout

### Components

- **LoginForm**: Username/password login
- **RegisterForm**: New user registration
- **AuthPage**: Wrapper for login/register
- **WebApp**: Main app with auth gate

## Testing

### Manual Testing

1. Start the server:
   ```bash
   cd packages/server
   yarn dev
   ```

2. Start the client:
   ```bash
   cd packages/client
   yarn dev
   ```

3. Open browser: `http://localhost:5173`

4. Login with: `admin` / `admin`

5. You should see the authenticated interface

### API Testing

Use browser DevTools Network tab to inspect:
- API requests
- WebSocket connections
- JWT tokens
- Response data

## Next Steps

### Immediate

1. ✅ Auth system working
2. ✅ API connection established
3. ⏳ Integrate actual Beekeeper UI components
4. ⏳ Add connection interface
5. ⏳ Add query editor
6. ⏳ Add table browser

### Future Enhancements

- [ ] Offline mode support
- [ ] Multiple database connections
- [ ] Query history
- [ ] Saved queries
- [ ] Export/import functionality
- [ ] Real-time collaboration
- [ ] Query result streaming
- [ ] Performance monitoring

## Deployment

### Static Hosting (Netlify, Vercel, etc.)

```bash
yarn build
# Upload dist/ folder
```

Configure environment variables in hosting platform:
- `VUE_APP_API_URL`: Your API server URL

### Docker

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

## Troubleshooting

### API Connection Failed

- Check server is running: `curl http://localhost:3000/health`
- Check CORS configuration in server
- Check VUE_APP_API_URL in `.env`

### Authentication Errors

- Clear localStorage: `localStorage.clear()`
- Check JWT_SECRET matches between client/server
- Check token expiration

### Build Errors

- Clear node_modules: `rm -rf node_modules && yarn install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check TypeScript errors: `yarn tsc --noEmit`

## License

GPLv3 - Same as Beekeeper Studio
