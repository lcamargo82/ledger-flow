<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '../../composables/useI18n';
import { useCustomersStore } from '../../stores/customers.store';
import AppInput from '../common/AppInput.vue';
import AppSelect from '../common/AppSelect.vue';
import AppButton from '../common/AppButton.vue';
import { parseMoneyToCents } from '../../utils/money-input';
import type { PaymentMethod } from '../../types/payments.types';

const props = defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: { customerId: string; amount: number; currency: string; method: PaymentMethod; description?: string }): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const customersStore = useCustomersStore();

const form = ref({
  customerId: '',
  amountInput: '',
  currency: 'BRL',
  method: '' as PaymentMethod | '',
  description: '',
});

const errors = ref({
  customerId: '',
  amountInput: '',
  method: '',
});

const customerOptions = computed(() => {
  return customersStore.customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));
});

const currencyOptions = computed(() => [
  { value: 'BRL', label: 'BRL' }
]);

const methodOptions = computed(() => [
  { value: '', label: t('payments.form.methodPlaceholder') },
  { value: 'PIX', label: t('payments.method.PIX') },
  { value: 'BOLETO', label: t('payments.method.BOLETO') },
  { value: 'CARD', label: t('payments.method.CARD') },
  { value: 'BANK_TRANSFER', label: t('payments.method.BANK_TRANSFER') },
  { value: 'OTHER', label: t('payments.method.OTHER') },
]);

onMounted(async () => {
  // Load active customers
  await customersStore.fetchCustomers({
    page: 1,
    perPage: 100,
    search: '',
    status: 'active',
    type: 'all',
  });
});

const validate = () => {
  let isValid = true;
  errors.value = {
    customerId: '',
    amountInput: '',
    method: '',
  };

  if (!form.value.customerId) {
    errors.value.customerId = t('payments.form.validation.customerRequired');
    isValid = false;
  }

  const cents = parseMoneyToCents(form.value.amountInput);
  if (cents === null || cents <= 0) {
    errors.value.amountInput = t('payments.form.validation.amountInvalid');
    isValid = false;
  }

  if (!form.value.method) {
    errors.value.method = t('payments.form.validation.methodRequired');
    isValid = false;
  }

  return isValid;
};

const handleSubmit = () => {
  if (!validate()) return;
  
  const amountCents = parseMoneyToCents(form.value.amountInput)!;

  emit('submit', {
    customerId: form.value.customerId,
    amount: amountCents,
    currency: form.value.currency,
    method: form.value.method as PaymentMethod,
    description: form.value.description || undefined,
  });
};
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <AppSelect
      id="customerId"
      v-model="form.customerId"
      :label="t('payments.form.customerLabel')"
      :options="[{ value: '', label: t('payments.form.customerPlaceholder') }, ...customerOptions]"
      :error="errors.customerId"
      :disabled="props.loading || customersStore.isLoading"
      required
    />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AppInput
        id="amountInput"
        v-model="form.amountInput"
        :label="t('payments.form.amountLabel')"
        :placeholder="t('payments.form.amountPlaceholder')"
        :error="errors.amountInput"
        :disabled="props.loading"
        required
      />

      <AppSelect
        id="currency"
        v-model="form.currency"
        :label="t('payments.form.currencyLabel')"
        :options="currencyOptions"
        :disabled="props.loading || true"
        required
      />
    </div>

    <AppSelect
      id="method"
      v-model="form.method"
      :label="t('payments.form.methodLabel')"
      :options="methodOptions"
      :error="errors.method"
      :disabled="props.loading"
      required
    />

    <AppInput
      id="description"
      v-model="form.description"
      :label="t('payments.form.descriptionLabel')"
      :placeholder="t('payments.form.descriptionPlaceholder')"
      :disabled="props.loading"
    />

    <div class="flex justify-end gap-3 pt-4">
      <AppButton
        type="button"
        variant="secondary"
        :disabled="props.loading"
        @click="emit('cancel')"
      >
        {{ t('payments.form.cancel') }}
      </AppButton>
      
      <AppButton
        type="submit"
        variant="primary"
        :is-loading="props.loading"
        :disabled="props.loading"
      >
        {{ props.loading ? t('payments.form.creating') : t('payments.form.submit') }}
      </AppButton>
    </div>
  </form>
</template>
