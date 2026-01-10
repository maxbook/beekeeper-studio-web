<template>
  <div class="auth-page">
    <transition name="fade" mode="out-in">
      <LoginForm
        v-if="currentView === 'login'"
        key="login"
        @login-success="handleLoginSuccess"
        @show-register="currentView = 'register'"
      />
      <RegisterForm
        v-else
        key="register"
        @register-success="handleRegisterSuccess"
        @show-login="currentView = 'login'"
      />
    </transition>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import LoginForm from './LoginForm.vue';
import RegisterForm from './RegisterForm.vue';

export default Vue.extend({
  name: 'AuthPage',

  components: {
    LoginForm,
    RegisterForm
  },

  data() {
    return {
      currentView: 'login' as 'login' | 'register'
    };
  },

  methods: {
    handleLoginSuccess() {
      this.$emit('authenticated');
    },

    handleRegisterSuccess() {
      // After successful registration, automatically log in
      this.$emit('authenticated');
    }
  }
});
</script>

<style scoped>
.auth-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* Transition animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
