<template>
  <div class="login-form-wrapper">
    <div class="login-form">
      <div class="login-header">
        <h1>🐝 Beekeeper Studio Web</h1>
        <p>Sign in to your account</p>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="form-control"
            placeholder="Enter username"
            :disabled="isLoading"
            required
            autofocus
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-control"
            placeholder="Enter password"
            :disabled="isLoading"
            required
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-block"
          :disabled="isLoading || !username || !password"
        >
          <span v-if="isLoading">Signing in...</span>
          <span v-else>Sign In</span>
        </button>
      </form>

      <div class="login-footer">
        <p>
          Don't have an account?
          <a href="#" @click.prevent="$emit('show-register')">Register here</a>
        </p>
      </div>

      <div class="login-info">
        <p class="text-muted">
          <small>Demo credentials: admin / admin</small>
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'LoginForm',

  data() {
    return {
      username: '',
      password: '',
      error: null as string | null
    };
  },

  computed: {
    isLoading(): boolean {
      return this.$store.getters['auth/isLoading'];
    }
  },

  methods: {
    async handleLogin() {
      this.error = null;

      try {
        await this.$store.dispatch('auth/login', {
          username: this.username,
          password: this.password
        });

        // Login successful, emit event
        this.$emit('login-success');
      } catch (error: any) {
        this.error = error.message || 'Login failed';
      }
    }
  }
});
</script>

<style scoped>
.login-form-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-form {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #333;
}

.login-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
}

.form-control:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 14px;
  text-align: center;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-block {
  width: 100%;
  display: block;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.login-footer p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.login-footer a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.login-footer a:hover {
  text-decoration: underline;
}

.login-info {
  margin-top: 20px;
  text-align: center;
}

.text-muted {
  color: #999;
}
</style>
