/**
 * Beekeeper Studio Web - Main Entry Point
 *
 * This replaces the Electron entry point with a pure web implementation.
 * It initializes Vue with the API connection plugin instead of Electron IPC.
 */

import Vue from 'vue';
import Vuex from 'vuex';
import WebApp from './WebApp.vue';
import ApiPlugin from './plugins/api';
import authStore from './store/modules/auth';

// Import global styles (if any)
// import './assets/styles/main.scss';

// Disable production tip
Vue.config.productionTip = false;

// Use Vuex
Vue.use(Vuex);

// Create Vuex store
const store = new Vuex.Store({
  modules: {
    auth: authStore
    // TODO: Add other Beekeeper store modules here as needed
    // data: dataStore,
    // settings: settingsStore,
    // etc.
  },
  strict: process.env.NODE_ENV !== 'production'
});

// Install API plugin
Vue.use(ApiPlugin, {
  baseURL: process.env.VUE_APP_API_URL || 'http://localhost:3000'
});

// Global error handler
Vue.config.errorHandler = (err, vm, info) => {
  console.error('Vue error:', err);
  console.error('Component:', vm);
  console.error('Info:', info);

  // TODO: Send to error tracking service (Sentry, etc.)
};

// Global warning handler
Vue.config.warnHandler = (msg, vm, trace) => {
  console.warn('Vue warning:', msg);
  console.warn('Trace:', trace);
};

// Create Vue instance
new Vue({
  store,
  render: h => h(WebApp),

  mounted() {
    console.log('🐝 Beekeeper Studio Web initialized');
    console.log('API URL:', process.env.VUE_APP_API_URL || 'http://localhost:3000');
    console.log('Environment:', process.env.NODE_ENV);
  }
}).$mount('#app');

// Hot module replacement (development only)
if (module.hot) {
  module.hot.accept();
}
