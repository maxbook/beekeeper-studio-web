/**
 * Vue Plugin for ApiConnection
 *
 * This plugin makes the API connection available as this.$api in all Vue components.
 * It replaces the Electron $util plugin.
 */

import { VueConstructor } from 'vue';
import { ApiConnection } from '../lib/ApiConnection';

declare module 'vue/types/vue' {
  interface Vue {
    $api: ApiConnection;
  }
}

export interface ApiPluginOptions {
  baseURL?: string;
  token?: string;
}

export default {
  install(Vue: VueConstructor, options?: ApiPluginOptions) {
    // Create singleton ApiConnection instance
    const apiConnection = new ApiConnection({
      baseURL: options?.baseURL || process.env.VUE_APP_API_URL || 'http://localhost:3000',
      token: options?.token
    });

    // Make it available as $api in all components
    Vue.prototype.$api = apiConnection;

    // Also make it available on the Vue constructor for use outside components
    (Vue as any).api = apiConnection;

    console.log('🔌 ApiConnection plugin installed');
  }
};

// Export for direct use outside Vue components
export { ApiConnection };
