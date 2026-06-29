<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { authService } from '@/services/auth.service';
import AppButton from '@/components/common/AppButton.vue';
import AppInput from '@/components/common/AppInput.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const token = ref(route.query.token as string);

const state = reactive({
  password: '',
  confirmPassword: '',
  loading: false,
  error: null as string | null,
  success: false,
});

onMounted(() => {
  if (!token.value) {
    state.error = t('auth.acceptInvitation.tokenMissing');
  }
});

const submit = async () => {
  if (!token.value) return;

  state.error = null;

  if (state.password !== state.confirmPassword) {
    state.error = 'As senhas não coincidem';
    return;
  }

  if (state.password.length < 8) {
    state.error = 'A senha deve ter pelo menos 8 caracteres';
    return;
  }

  state.loading = true;

  try {
    await authService.acceptTenantInvitation(token.value, state.password);
    state.success = true;
  } catch (err: any) {
    state.error = err.message || t('auth.acceptInvitation.failed');
  } finally {
    state.loading = false;
  }
};

const goToLogin = () => {
  router.push('/login');
};
</script>

<template>
  <div class="accept-invitation-view">
    <div class="auth-card">
      <div class="auth-header">
        <h1 class="auth-title">{{ t('auth.acceptInvitation.title') }}</h1>
        <p class="auth-subtitle">
          {{ t('auth.acceptInvitation.subtitle') }}
        </p>
      </div>

      <div v-if="state.success" class="success-state">
        <div class="success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 class="success-title">{{ t('auth.acceptInvitation.successTitle') }}</h2>
        <p class="success-message">{{ t('auth.acceptInvitation.successMessage') }}</p>
        
        <AppButton class="login-button" block @click="goToLogin">
          {{ t('auth.acceptInvitation.goToLogin') }}
        </AppButton>
      </div>

      <form v-else @submit.prevent="submit" class="auth-form">
        <div v-if="state.error" class="error-alert">
          {{ state.error }}
        </div>

        <template v-if="token">
          <div class="form-group">
            <label for="password">{{ t('auth.acceptInvitation.passwordLabel') }}</label>
            <AppInput
              id="password"
              v-model="state.password"
              type="password"
              required
              :disabled="state.loading"
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">{{ t('auth.acceptInvitation.confirmPasswordLabel') }}</label>
            <AppInput
              id="confirmPassword"
              v-model="state.confirmPassword"
              type="password"
              required
              :disabled="state.loading"
            />
          </div>

          <AppButton
            type="submit"
            block
            :loading="state.loading"
            :disabled="!state.password || !state.confirmPassword"
          >
            {{ state.loading ? t('auth.acceptInvitation.submitting') : t('auth.acceptInvitation.submit') }}
          </AppButton>
        </template>
        <template v-else>
          <AppButton class="login-button" block variant="secondary" @click="goToLogin">
            {{ t('auth.acceptInvitation.goToLogin') }}
          </AppButton>
        </template>
      </form>
    </div>
  </div>
</template>

<style scoped>
.accept-invitation-view {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.auth-card {
  background: var(--surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-md);
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.auth-subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.error-alert {
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border-left: 4px solid var(--danger);
  color: var(--danger);
  font-size: 0.875rem;
  border-radius: var(--radius-md);
}

.success-state {
  text-align: center;
  padding: 1rem 0;
}

.success-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.1);
  color: var(--success);
  margin-bottom: 1.5rem;
}

.success-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.success-message {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 2rem;
}

.login-button {
  margin-top: 1rem;
}
</style>
