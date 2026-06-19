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
      :message="success"
      class="lf-mb-6"
    />

    <AppAlert
      v-if="authStore.error"
      variant="error"
      :message="authStore.error"
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
        class="lf-mb-6"
        autocomplete="username"
      />

      <AppButton
        type="submit"
        variant="primary"
        block
        :loading="authStore.isLoading"
      >
        {{ t('auth.forgotPassword.submit') }}
      </AppButton>
    </form>

    <div class="lf-mt-4 text-center">
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
const success = ref('');

const authStore = useAuthStore();
const { t } = useI18n();

const onSubmit = async () => {
  if (!email.value) return;
  
  // Fake the loading and success since there's no endpoint yet
  authStore.isLoading = true;
  authStore.error = null;
  
  setTimeout(() => {
    authStore.isLoading = false;
    success.value = t('auth.forgotPassword.placeholderMessage');
  }, 1000);
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
