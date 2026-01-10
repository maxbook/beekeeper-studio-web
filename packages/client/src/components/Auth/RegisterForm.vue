<template>
  <div class="register-form-wrapper">
    <div class="register-form">
      <div class="register-header">
        <h1>🐝 Create Account</h1>
        <p>Join Beekeeper Studio Web</p>
      </div>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="form-control"
            placeholder="Choose a username"
            :disabled="isLoading"
            required
            autofocus
          />
        </div>

        <div class="form-group">
          <label for="email">Email (optional)</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-control"
            placeholder="your@email.com"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-control"
            placeholder="Choose a password"
            :disabled="isLoading"
            required
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            class="form-control"
            placeholder="Confirm your password"
            :disabled="isLoading"
            required
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-if="success" class="success-message">
          {{ success }}
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-block"
          :disabled="isLoading || !isFormValid"
        >
          <span v-if="isLoading">Creating account...</span>
          <span v-else>Create Account</span>
        </button>
      </form>

      <div class="register-footer">
        <p>
          Already have an account?
          <a href="#" @click.prevent="$emit('show-login')">Sign in here</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'RegisterForm',

  data() {
    return {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      error: null as string | null,
      success: null as string | null
    };
  },

  computed: {
    isLoading(): boolean {
      return this.$store.getters['auth/isLoading'];
    },

    isFormValid(): boolean {
      return (
        this.username.length >= 3 &&
        this.password.length >= 6 &&
        this.password === this.confirmPassword
      );
    }
  },

  watch: {
    password() {
      this.validatePasswordMatch();
    },
    confirmPassword() {
      this.validatePasswordMatch();
    }
  },

  methods: {
    validatePasswordMatch() {
      if (this.confirmPassword && this.password !== this.confirmPassword) {
        this.error = 'Passwords do not match';
      } else {
        this.error = null;
      }
    },

    async handleRegister() {
      this.error = null;
      this.success = null;

      // Validation
      if (this.username.length < 3) {
        this.error = 'Username must be at least 3 characters';
        return;
      }

      if (this.password.length < 6) {
        this.error = 'Password must be at least 6 characters';
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.error = 'Passwords do not match';
        return;
      }

      try {
        await this.$store.dispatch('auth/register', {
          username: this.username,
          password: this.password,
          email: this.email || undefined
        });

        this.success = 'Account created successfully!';

        // Emit success event
        setTimeout(() => {
          this.$emit('register-success');
        }, 1000);
      } catch (error: any) {
        this.error = error.message || 'Registration failed';
      }
    }
  }
});
</script>

<style scoped>
.register-form-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-form {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #333;
}

.register-header p {
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

.success-message {
  background-color: #efe;
  color: #3c3;
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

.register-footer {
  margin-top: 24px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.register-footer p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.register-footer a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.register-footer a:hover {
  text-decoration: underline;
}
</style>
