<template>
  <AppCard>
    <div class="lf-login-header">
      <h1>LedgerFlow</h1>
      <p>{{ t('auth.login.title') }}</p>
    </div>

    <AppAlert
      v-if="authStore.error"
      variant="error"
      :message="authStore.error"
      class="lf-mb-6"
    />

    <form @submit.prevent="onSubmit">
      <AppInput
        id="email"
        type="email"
        v-model="email"
        :label="t('auth.login.emailLabel')"
        :placeholder="t('auth.login.emailPlaceholder')"
        required
        :disabled="authStore.isLoading"
        class="lf-mb-4"
        autocomplete="username"
      />

      <AppPasswordInput
        id="password"
        v-model="password"
        :label="t('auth.login.passwordLabel')"
        :placeholder="t('auth.login.passwordPlaceholder')"
        required
        :disabled="authStore.isLoading"
        class="lf-mb-2"
        autocomplete="current-password"
      />
      
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
    </form>

    <div class="lf-demo-hint">
      <p><strong>{{ t('auth.login.demoHintTitle') }}</strong></p>
      <p>{{ t('auth.login.demoAdmin') }}</p>
      <p>{{ t('auth.login.demoUser') }}</p>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useI18n } from '../composables/useI18n';
import AppCard from '../components/common/AppCard.vue';
import AppInput from '../components/common/AppInput.vue';
import AppPasswordInput from '../components/common/AppPasswordInput.vue';
import AppButton from '../components/common/AppButton.vue';
import AppAlert from '../components/common/AppAlert.vue';

const email = ref('');
const password = ref('');

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const { t } = useI18n();

onMounted(() => {
  // Clear any existing errors when mounting
  authStore.error = null;
});

const onSubmit = async () => {
  if (!email.value || !password.value) return;

  try {
    await authStore.login(email.value, password.value);
    
    // Redirect to intended page or dashboard
    const redirectPath = route.query.redirect as string;
    router.push(redirectPath || '/dashboard');
  } catch (error) {
    // Error is handled in the store
  }
};
</script>
