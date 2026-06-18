<template>
  <AppCard>
    <div class="lf-login-header">
      <img :src="brandAssets.logoDark" alt="LedgerFlow Logo" class="lf-mobile-logo" />
      <div class="lf-login-header-text">
        <h2 class="lf-login-title">{{ t('auth.login.title') }}</h2>
        <p class="lf-login-subtitle">{{ t('auth.login.subtitle') }}</p>
      </div>
    </div>

    <AppAlert
      v-if="authStore.error"
      variant="error"
      :message="authStore.error"
      class="lf-mb-6"
    />

    <form @submit.prevent="onSubmit" class="lf-mb-6" novalidate>
      <div class="lf-mb-5">
        <AppInput
          id="email"
          type="email"
          v-model="email"
          :label="t('auth.login.emailLabel')"
          :placeholder="t('auth.login.emailPlaceholder')"
          :error="emailError"
          :disabled="authStore.isLoading"
          autocomplete="username"
          @input="emailError = ''"
        />
      </div>

      <div class="lf-mb-4">
        <AppPasswordInput
          id="password"
          v-model="password"
          :label="t('auth.login.passwordLabel')"
          :placeholder="t('auth.login.passwordPlaceholder')"
          :error="passwordError"
          :disabled="authStore.isLoading"
          autocomplete="current-password"
          @input="passwordError = ''"
        />
      </div>
      
      <div class="lf-flex lf-justify-between lf-items-center lf-mb-6">
        <router-link to="/forgot-password" class="lf-auth-link" :class="{ 'lf-pointer-events-none': authStore.isLoading }">
          {{ t('auth.login.forgotPassword') }}
        </router-link>
      </div>

      <AppButton
        type="submit"
        variant="primary"
        block
        :loading="authStore.isLoading"
      >
        {{ authStore.isLoading ? t('auth.login.loading') : t('auth.login.submitButton') }}
      </AppButton>
      
      <p class="lf-secure-note">{{ t('auth.login.secureAccessNote') }}</p>
    </form>
  </AppCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useI18n } from '../composables/useI18n';
import { brandAssets } from '../config/brand';
import AppCard from '../components/common/AppCard.vue';
import AppInput from '../components/common/AppInput.vue';
import AppPasswordInput from '../components/common/AppPasswordInput.vue';
import AppButton from '../components/common/AppButton.vue';
import AppAlert from '../components/common/AppAlert.vue';

const email = ref('');
const password = ref('');
const emailError = ref('');
const passwordError = ref('');

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const { t } = useI18n();

onMounted(() => {
  // Clear any existing errors when mounting
  authStore.error = null;
});

const onSubmit = async () => {
  emailError.value = '';
  passwordError.value = '';
  
  if (!email.value) {
    emailError.value = t('auth.login.validation.emailRequired');
  }
  if (!password.value) {
    passwordError.value = t('auth.login.validation.passwordRequired');
  }
  
  if (emailError.value || passwordError.value) return;

  try {
    await authStore.login(email.value, password.value);
    
    // Redirect to intended page or dashboard
    const redirectPath = route.query.redirect as string;
    router.push(redirectPath || '/dashboard');
  } catch {
    // Error is handled in the store
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
</style>
