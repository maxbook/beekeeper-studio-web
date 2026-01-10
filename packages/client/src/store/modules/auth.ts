/**
 * Vuex Store Module for Authentication (Web Only)
 *
 * This module manages authentication state for the web version.
 * It works with the ApiConnection plugin to handle JWT tokens.
 */

import Vue from 'vue';
import { ApiConnection } from '../../lib/ApiConnection';

export interface User {
  id: string;
  username: string;
  email?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const state: AuthState = {
  user: null,
  token: localStorage.getItem('auth_token') || null,
  isAuthenticated: !!localStorage.getItem('auth_token'),
  isLoading: false,
  error: null
};

const getters = {
  isAuthenticated: (state: AuthState) => state.isAuthenticated,
  currentUser: (state: AuthState) => state.user,
  authToken: (state: AuthState) => state.token,
  authError: (state: AuthState) => state.error,
  isLoading: (state: AuthState) => state.isLoading
};

const mutations = {
  SET_USER(state: AuthState, user: User | null) {
    state.user = user;
  },

  SET_TOKEN(state: AuthState, token: string | null) {
    state.token = token;
    state.isAuthenticated = !!token;

    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },

  SET_LOADING(state: AuthState, isLoading: boolean) {
    state.isLoading = isLoading;
  },

  SET_ERROR(state: AuthState, error: string | null) {
    state.error = error;
  },

  CLEAR_AUTH(state: AuthState) {
    state.user = null;
    state.token = null;
    state.isAuthenticated = false;
    state.error = null;
    localStorage.removeItem('auth_token');
  }
};

const actions = {
  /**
   * Login with username and password
   */
  async login({ commit }, { username, password }: { username: string; password: string }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      // Get API connection from Vue instance
      const api: ApiConnection = (Vue as any).api;

      if (!api) {
        throw new Error('API connection not initialized');
      }

      // Call login endpoint
      const { user, token } = await api.login(username, password);

      // Update state
      commit('SET_USER', user);
      commit('SET_TOKEN', token);
      commit('SET_LOADING', false);

      return { user, token };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      commit('SET_ERROR', errorMessage);
      commit('SET_LOADING', false);
      throw new Error(errorMessage);
    }
  },

  /**
   * Register new user
   */
  async register(
    { commit },
    { username, password, email }: { username: string; password: string; email?: string }
  ) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const api: ApiConnection = (Vue as any).api;

      if (!api) {
        throw new Error('API connection not initialized');
      }

      const { user, token } = await api.register(username, password, email);

      commit('SET_USER', user);
      commit('SET_TOKEN', token);
      commit('SET_LOADING', false);

      return { user, token };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      commit('SET_ERROR', errorMessage);
      commit('SET_LOADING', false);
      throw new Error(errorMessage);
    }
  },

  /**
   * Logout
   */
  async logout({ commit }) {
    try {
      const api: ApiConnection = (Vue as any).api;

      if (api) {
        api.clearToken();
        api.disconnect();
      }

      commit('CLEAR_AUTH');
    } catch (error) {
      console.error('Logout error:', error);
      commit('CLEAR_AUTH');
    }
  },

  /**
   * Restore session from stored token
   */
  async restoreSession({ commit, state }) {
    if (!state.token) {
      return false;
    }

    try {
      const api: ApiConnection = (Vue as any).api;

      if (!api) {
        return false;
      }

      // Set token in API connection
      api.setToken(state.token);

      // Try to validate token by making a test request
      // This will fail if token is invalid/expired
      await api.send('conn/supportedFeatures', {});

      // If we get here, token is valid
      // TODO: Fetch user info if needed

      return true;
    } catch (error) {
      // Token invalid, clear auth
      commit('CLEAR_AUTH');
      return false;
    }
  },

  /**
   * Clear error
   */
  clearError({ commit }) {
    commit('SET_ERROR', null);
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
