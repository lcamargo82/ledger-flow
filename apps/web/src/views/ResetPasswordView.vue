<template>
  <AppCard>
    <div class="lf-login-header">
      <img :src="brandAssets.logoDark" alt="LedgerFlow Logo" class="lf-mobile-logo" />
      <div class="lf-login-header-text">
        <h2 class="lf-login-title">{{ t('auth.resetPassword.title') }}</h2>
        <p class="lf-login-subtitle">{{ t('auth.resetPassword.subtitle') }}</p>
      </div>
    </div>

    <!-- Missing token state -->
    <template v-if="!hasToken">
      <AppAlert
        variant="error"
        :message="t('auth.resetPassword.errors.tokenMissing')"
        class="lf-mb-6"
      />
      <div class="lf-mt-6 text-center">
        <router-link to="/forgot-password" class="lf-auth-link">
          {{ t('auth.resetPassword.requestNewLink') }}
        </router-link>
      </div>
    </template>

    <!-- Valid state -->
    <template v-else>
      <AppAlert
        v-if="success"
        variant="success"
        :message="t('auth.resetPassword.successMessage')"
        class="lf-mb-6"
      />

      <AppAlert
        v-if="authStore.passwordRecoveryError"
        variant="error"
        :message="authStore.passwordRecoveryError"
        class="lf-mb-6"
      />

      <form @submit.prevent="onSubmit" v-if="!success">
        <AppPasswordInput
          id="password"
          v-model="password"
          :label="t('auth.resetPassword.passwordLabel')"
          :placeholder="t('auth.resetPassword.passwordPlaceholder')"
          :error="passwordError"
          required
          :disabled="authStore.isResettingPassword"
          class="lf-mb-4"
          autocomplete="new-password"
        />

        <AppPasswordInput
          id="confirmPassword"
          v-model="confirmPassword"
          :label="t('auth.resetPassword.confirmPasswordLabel')"
          :placeholder="t('auth.resetPassword.confirmPasswordPlaceholder')"
          :error="confirmPasswordError"
          required
          :disabled="authStore.isResettingPassword"
          class="lf-mb-6"
          autocomplete="new-password"
        />

        <AppButton
          type="submit"
          variant="primary"
          block
          :disabled="authStore.isResettingPassword || !isValidForm"
          :loading="authStore.isResettingPassword"
        >
          {{ t('auth.resetPassword.submit') }}
        </AppButton>
      </form>

      <div class="lf-mt-6 text-center" v-if="success">
        <router-link to="/login">
          <AppButton variant="primary" block>
            {{ t('auth.resetPassword.goToLogin') }}
          </AppButton>
        </router-link>
      </div>
      
      <div class="lf-mt-6 text-center" v-if="authStore.passwordRecoveryError && !success">
        <router-link to="/forgot-password" class="lf-auth-link">
          {{ t('auth.resetPassword.requestNewLink') }}
        </router-link>
      </div>
    </template>
  </AppCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useI18n } from '../composables/useI18n';
import AppCard from '../components/common/AppCard.vue';
import AppPasswordInput from '../components/common/AppPasswordInput.vue';
import AppButton from '../components/common/AppButton.vue';
import AppAlert from '../components/common/AppAlert.vue';
import { brandAssets } from '../config/brand';

const password = ref('');
const confirmPassword = ref('');
const success = ref(false);
const token = ref('');

const authStore = useAuthStore();
const { t } = useI18n();
const route = useRoute();

onMounted(() => {
  const queryToken = route.query.token;
  if (queryToken && typeof queryToken === 'string') {
    token.value = queryToken;
  }
  // Clear any previous errors on mount
  authStore.passwordRecoveryError = null;
});

const hasToken = computed(() => !!token.value);

const passwordError = computed(() => {
  if (password.value && password.value.length < 8) {
    return t('auth.resetPassword.errors.passwordMin');
  }
  return '';
});

const confirmPasswordError = computed(() => {
  if (confirmPassword.value && confirmPassword.value !== password.value) {
    return t('auth.resetPassword.errors.passwordsDoNotMatch');
  }
  return '';
});

const isValidForm = computed(() => {
  return (
    password.value.length >= 8 &&
    confirmPassword.value === password.value
  );
});

const onSubmit = async () => {
  if (!isValidForm.value) return;
  
  try {
    await authStore.resetPassword(token.value, password.value);
    success.value = true;
    password.value = '';
    confirmPassword.value = '';
  } catch (err) {
    // Error is handled in store and exposed via authStore.passwordRecoveryError
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

.text-center {
  text-align: center;
}
</style>
