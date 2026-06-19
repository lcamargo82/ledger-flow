<template>
  <AppCard>
    <div class="lf-login-header">
      <img :src="brandAssets.logoDark" alt="LedgerFlow Logo" class="lf-mobile-logo" />
      <div class="lf-login-header-text">
        <h2 class="lf-login-title">{{ t('auth.forgotPassword.title') }}</h2>
        <p class="lf-login-subtitle">{{ t('auth.forgotPassword.subtitle') }}</p>
      </div>
    </div>

    <AppAlert
      v-if="success"
      variant="success"
      :message="t('auth.forgotPassword.successMessage')"
      class="lf-mb-6"
    />
    <p v-if="success" class="lf-text-sm lf-text-center lf-mb-6" style="color: var(--lf-text-secondary)">
      {{ t('auth.forgotPassword.successHelp') }}
    </p>

    <AppAlert
      v-if="authStore.passwordRecoveryError"
      variant="error"
      :message="authStore.passwordRecoveryError"
      class="lf-mb-6"
    />

    <form @submit.prevent="onSubmit" v-if="!success">
      <AppInput
        id="email"
        type="email"
        v-model="email"
        :label="t('auth.forgotPassword.emailLabel')"
        :placeholder="t('auth.forgotPassword.emailPlaceholder')"
        required
        :disabled="authStore.isRequestingPasswordReset"
        class="lf-mb-6"
        autocomplete="username"
      />

      <AppButton
        type="submit"
        variant="primary"
        block
        :disabled="authStore.isRequestingPasswordReset || !email"
        :loading="authStore.isRequestingPasswordReset"
      >
        {{ t('auth.forgotPassword.submit') }}
      </AppButton>
    </form>

    <div class="lf-mt-6 text-center">
      <router-link to="/login" class="lf-auth-link">
        &larr; {{ t('auth.forgotPassword.backToLogin') }}
      </router-link>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import { useI18n } from '../composables/useI18n';
import AppCard from '../components/common/AppCard.vue';
import AppInput from '../components/common/AppInput.vue';
import AppButton from '../components/common/AppButton.vue';
import AppAlert from '../components/common/AppAlert.vue';
import { brandAssets } from '../config/brand';

const email = ref('');
const success = ref(false);

const authStore = useAuthStore();
const { t } = useI18n();

const onSubmit = async () => {
  if (!email.value) return;
  
  try {
    await authStore.forgotPassword(email.value);
    success.value = true;
  } catch (err) {
    // Error is handled and populated in authStore.passwordRecoveryError
  }
};
</script>

<style scoped>
.lf-login-header {
  margin-bottom: 2rem;
  text-align: center;
}

.lf-mobile-logo {
  display: block;
  height: 28px;
  width: auto;
  margin: 0 auto 1.5rem auto;
}

@media (min-width: 1024px) {
  .lf-mobile-logo {
    display: none;
  }
}

.lf-login-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--lf-text-primary);
  margin-bottom: 0.5rem;
}

.lf-login-subtitle {
  font-size: 0.95rem;
  color: var(--lf-text-secondary);
}

.lf-auth-link {
  color: var(--lf-text-secondary);
  font-size: 0.875rem;
  text-decoration: none;
  transition: color 0.2s ease;
}

.lf-auth-link:hover {
  color: var(--lf-text-primary);
  text-decoration: underline;
}

.lf-text-sm {
  font-size: 0.875rem;
}

.lf-text-center {
  text-align: center;
}
</style>
