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
        <div class="user-info">
          <span class="username">{{ currentUser?.username }}</span>
          <button class="btn-logout" @click="handleLogout">
            Logout
          </button>
        </div>
      </div>

      <!-- Main Beekeeper Studio Interface -->
      <!-- This will be the original App.vue content, adapted -->
      <div class="beekeeper-main">
        <slot name="main-content">
          <!--
            TODO: Load the actual Beekeeper Studio interface here
            For now, show a placeholder
          -->
          <div class="placeholder-content">
            <h2>🎉 Welcome to Beekeeper Studio Web!</h2>
            <p>You are now authenticated and connected to the API server.</p>

            <div class="next-steps">
              <h3>Next Steps:</h3>
              <ol>
                <li>Connect to a database using the connection interface</li>
                <li>Browse tables and schema</li>
                <li>Execute SQL queries</li>
              </ol>
            </div>

            <div class="api-info">
              <h4>API Connection:</h4>
              <pre>{{ apiStatus }}</pre>
            </div>
          </div>
        </slot>
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

export default Vue.extend({
  name: 'WebApp',

  components: {
    AuthPage
  },

  data() {
    return {
      isInitializing: true,
      apiStatus: 'Connected'
    };
  },

  computed: {
    ...mapGetters('auth', ['isAuthenticated', 'currentUser'])
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
      // The store already has the user/token, just trigger a re-render
      this.$forceUpdate();
    },

    async handleLogout() {
      if (confirm('Are you sure you want to logout?')) {
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
}

.app-title {
  font-size: 18px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
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
  overflow: auto;
  background: #f5f5f5;
}

.placeholder-content {
  max-width: 800px;
  margin: 60px auto;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.placeholder-content h2 {
  margin-top: 0;
  color: #333;
}

.next-steps {
  margin: 30px 0;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.next-steps h3 {
  margin-top: 0;
  color: #667eea;
}

.next-steps ol {
  margin: 10px 0 0 20px;
  padding: 0;
}

.next-steps li {
  margin: 8px 0;
  color: #666;
}

.api-info {
  margin-top: 30px;
  padding: 20px;
  background: #f0f0f0;
  border-radius: 8px;
}

.api-info h4 {
  margin-top: 0;
  color: #333;
}

.api-info pre {
  background: #333;
  color: #0f0;
  padding: 12px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
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
</style>
