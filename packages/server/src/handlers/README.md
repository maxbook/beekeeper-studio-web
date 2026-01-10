# Server Handlers

This directory contains simplified, server-adapted versions of the Beekeeper Studio handlers.

## Approach

Rather than importing the complex Electron-based handlers directly (which have many Electron-specific dependencies), we create simplified implementations that:

1. **Use the same interface** - Methods match the original handlers
2. **Reference DB clients** - Use the database client code from `apps/studio/src/lib/db`
3. **Adapt to web context** - Replace Electron-specific code with web equivalents
4. **Maintain session state** - Use our session state instead of Electron's state management

## Structure

- `handlerHelpers.ts` - Shared utilities for handlers
- `connectionHandlers.ts` - Database connection operations (adapted from studio)
- `queryHandlers.ts` - Query execution (adapted from studio)
- `schemaHandlers.ts` - Schema operations (adapted from studio)

## Why Not Import Directly?

The original handlers have dependencies on:
- Electron IPC (MessagePort)
- TypeORM entities (SavedConnection, UserSetting, etc.)
- Electron-specific utilities
- Complex build configuration (esbuild)

Creating adapted versions:
- ✅ Simpler dependency chain
- ✅ Easier to maintain
- ✅ No Electron dependencies
- ✅ Can mock/stub DB-stored settings
- ✅ Works in pure Node.js environment

## Next Steps

As the server matures, we can:
1. Extract common code into shared packages
2. Potentially unify implementations
3. Add more sophisticated features (connection pooling, caching, etc.)
