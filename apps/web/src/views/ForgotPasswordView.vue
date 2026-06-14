<template>
  <AppCard>
    <div class="lf-login-header">
      <h1>LedgerFlow</h1>
      <p>{{ t('auth.forgotPassword.title') }}</p>
    </div>

    <AppAlert
      v-if="error"
      variant="error"
      :message="error"
      class="lf-mb-6"
    />
    
    <AppAlert
      v-if="success"
      variant="success"
      :message="success"
      class="lf-mb-6"
    />

    <form v-if="!success" @submit.prevent="onSubmit">
      <p class="lf-text-secondary lf-mb-4" style="font-size: 0.9375rem; color: var(--lf-text-secondary); line-height: 1.5;">
        {{ t('auth.forgotPassword.description') }}
      </p>

      <AppInput
        id="email"
        type="email"
        v-model="email"
        :label="t('auth.login.emailLabel')"
        :placeholder="t('auth.login.emailPlaceholder')"
        required
        class="lf-mb-6"
        autocomplete="email"
      />

      <AppButton
        type="submit"
        variant="primary"
        block
        :loading="isLoading"
      >
        {{ t('auth.forgotPassword.submitButton') }}
      </AppButton>
      
      <div class="lf-mt-4" style="text-align: center;">
        <router-link to="/login" class="lf-auth-link">
          {{ t('auth.forgotPassword.backToLogin') }}
        </router-link>
      </div>
    </form>
    
    <div v-else class="lf-mt-4" style="text-align: center;">
      <router-link to="/login">
        <AppButton variant="secondary" block>
          {{ t('auth.forgotPassword.backToLogin') }}
        </AppButton>
      </router-link>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '../composables/useI18n';
import AppCard from '../components/common/AppCard.vue';
import AppInput from '../components/common/AppInput.vue';
import AppButton from '../components/common/AppButton.vue';
import AppAlert from '../components/common/AppAlert.vue';

const email = ref('');
const isLoading = ref(false);
const error = ref('');
const success = ref('');

const { t } = useI18n();

const onSubmit = async () => {
  if (!email.value) return;

  isLoading.value = true;
  error.value = '';
  success.value = '';

  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    success.value = t('auth.forgotPassword.successMessage');
  } catch (err) {
    error.value = t('errors.unexpected');
  } finally {
    isLoading.value = false;
  }
};
</script>
