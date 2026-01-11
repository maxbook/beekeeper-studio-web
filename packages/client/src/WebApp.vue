<template>
  <div id="beekeeper-app" class="beekeeper-app">
    <!-- Show auth page if not authenticated -->
    <AuthPage
      v-if="!isAuthenticated"
      @authenticated="handleAuthenticated"
    />

    <!-- Show main app if authenticated -->
    <div v-else class="main-app-container">
      <!-- Top bar with user info and logout -->
      <div class="top-bar">
        <div class="app-title">
          🐝 <strong>Beekeeper Studio</strong> Web
        </div>

        <!-- Navigation (if connected) -->
        <div v-if="isConnected" class="nav-tabs">
          <button
            class="nav-tab"
            :class="{ active: currentView === 'explorer' }"
            @click="currentView = 'explorer'"
          >
            <span class="material-icons">table_chart</span>
            Explorer
          </button>
          <button
            class="nav-tab"
            :class="{ active: currentView === 'query' }"
            @click="currentView = 'query'"
          >
            <span class="material-icons">code</span>
            Query
          </button>
        </div>

        <div class="user-info">
          <span class="connection-status" v-if="isConnected">
            <span class="status-dot connected"></span>
            {{ connectionInfo }}
          </span>
          <span class="username">{{ currentUser?.username }}</span>
          <button class="btn-logout" @click="handleLogout">
            Logout
          </button>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="beekeeper-main">
        <!-- Connection View (not connected) -->
        <DatabaseConnection
          v-if="!isConnected"
          @connected="handleConnected"
          @navigate-to-explorer="currentView = 'explorer'"
        />

        <!-- Explorer View (connected) -->
        <DatabaseExplorer v-else-if="currentView === 'explorer'" />

        <!-- Query Editor View (connected) -->
        <QueryEditor v-else-if="currentView === 'query'" />
      </div>
    </div>

    <!-- Loading overlay -->
    <div v-if="isInitializing" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Initializing...</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';
import AuthPage from './components/Auth/AuthPage.vue';
import DatabaseConnection from './components/Database/DatabaseConnection.vue';
import DatabaseExplorer from './components/Database/DatabaseExplorer.vue';
import QueryEditor from './components/Database/QueryEditor.vue';

export default Vue.extend({
  name: 'WebApp',

  components: {
    AuthPage,
    DatabaseConnection,
    DatabaseExplorer,
    QueryEditor
  },

  data() {
    return {
      isInitializing: true,
      currentView: 'connection' as 'connection' | 'explorer' | 'query',
      isConnected: false,
      connectionConfig: null as any
    };
  },

  computed: {
    ...mapGetters('auth', ['isAuthenticated', 'currentUser']),

    connectionInfo(): string {
      if (!this.connectionConfig) return '';
      const { connectionType, host, port, defaultDatabase } = this.connectionConfig;
      if (connectionType === 'sqlite') {
        return `SQLite: ${defaultDatabase}`;
      }
      return `${connectionType}: ${host}:${port}/${defaultDatabase}`;
    }
  },

  async mounted() {
    // Try to restore session from stored token
    if (this.$store.state.auth.token) {
      await this.$store.dispatch('auth/restoreSession');
    }

    this.isInitializing = false;

    // Listen for auth errors from API
    if (this.$api) {
      this.$api.addListener('auth:error', () => {
        this.$store.dispatch('auth/logout');
      });
    }
  },

  methods: {
    handleAuthenticated() {
      console.log('User authenticated successfully');
      this.$forceUpdate();
    },

    handleConnected(config: any) {
      console.log('Database connected:', config);
      this.isConnected = true;
      this.connectionConfig = config;
      this.currentView = 'explorer';
    },

    async handleLogout() {
      if (confirm('Are you sure you want to logout?')) {
        // Disconnect from database if connected
        if (this.isConnected) {
          try {
            await this.$api.send('conn/disconnect', {});
          } catch (err) {
            console.error('Disconnect error:', err);
          }
          this.isConnected = false;
          this.connectionConfig = null;
        }

        await this.$store.dispatch('auth/logout');
      }
    }
  }
});
</script>

<style scoped>
.beekeeper-app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.main-app-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  gap: 20px;
}

.app-title {
  font-size: 18px;
  white-space: nowrap;
}

.nav-tabs {
  display: flex;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-tab:hover {
  background: rgba(255, 255, 255, 0.2);
}

.nav-tab.active {
  background: white;
  color: #667eea;
  border-color: white;
}

.nav-tab .material-icons {
  font-size: 18px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
}

.status-dot.connected {
  background: #4caf50;
  box-shadow: 0 0 8px #4caf50;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.username {
  font-weight: 600;
}

.btn-logout {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: rgba(255, 255, 255, 0.3);
}

.beekeeper-main {
  flex: 1;
  overflow: hidden;
  background: #f5f5f5;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.loading-spinner {
  text-align: center;
}

.spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto 20px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner p {
  color: #666;
  font-size: 16px;
}

/* Import Material Icons */
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');
</style>
