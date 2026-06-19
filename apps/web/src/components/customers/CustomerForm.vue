<template>
  <form @submit.prevent="handleSubmit" class="lf-form">
    <div class="lf-form__row">
      <AppInput
        id="name"
        v-model="formData.name"
        :label="t('customers.form.nameLabel')"
        :placeholder="t('customers.form.namePlaceholder')"
        :error="errors.name"
        :disabled="loading"
        required
      />
    </div>

    <div class="lf-form__row">
      <AppInput
        id="email"
        type="email"
        v-model="formData.email"
        :label="t('customers.form.emailLabel')"
        :placeholder="t('customers.form.emailPlaceholder')"
        :error="errors.email"
        :disabled="loading"
      />
    </div>

    <div class="lf-form__row">
      <AppInput
        id="document"
        v-model="formData.document"
        :label="t('customers.form.documentLabel')"
        :placeholder="t('customers.form.documentPlaceholder')"
        :disabled="loading"
      />
    </div>

    <div class="lf-form__row">
      <AppInput
        id="phone"
        v-model="formData.phone"
        :label="t('customers.form.phoneLabel')"
        :placeholder="t('customers.form.phonePlaceholder')"
        :disabled="loading"
      />
    </div>

    <div class="lf-form__row">
      <AppSelect
        id="type"
        v-model="formData.type"
        :label="t('customers.form.typeLabel')"
        :options="typeOptions"
        :error="errors.type"
        :disabled="loading"
        required
      />
    </div>

    <!-- Active só faria sentido se fosse no modo create, mas optamos por omitir para simplificar e focar nos obrigatórios -->
    
    <div class="lf-form__actions">
      <AppButton
        type="button"
        variant="secondary"
        @click="$emit('cancel')"
        :disabled="loading"
      >
        {{ t('customers.actions.cancel') }}
      </AppButton>
      <AppButton
        type="submit"
        variant="primary"
        :loading="loading"
        :disabled="loading"
      >
        {{ mode === 'create' ? t('customers.actions.save') : t('customers.actions.save') }}
      </AppButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type { CustomerListItem, CustomerType } from '@/types/customers.types';
import AppInput from '@/components/common/AppInput.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import AppButton from '@/components/common/AppButton.vue';

const props = defineProps<{
  mode: 'create' | 'edit';
  initialValue?: CustomerListItem | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: Record<string, unknown>): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();

const typeOptions = computed(() => [
  { value: 'INDIVIDUAL', label: t('customers.type.INDIVIDUAL') },
  { value: 'COMPANY', label: t('customers.type.COMPANY') },
]);

const formData = ref({
  name: '',
  email: '',
  document: '',
  phone: '',
  type: 'INDIVIDUAL' as CustomerType,
});

const errors = ref<Record<string, string>>({});

watch(
  () => props.initialValue,
  (val) => {
    if (val && props.mode === 'edit') {
      formData.value = {
        name: val.name || '',
        email: val.email || '',
        document: val.document || '',
        phone: val.phone || '',
        type: val.type || 'INDIVIDUAL',
      };
    } else {
      formData.value = {
        name: '',
        email: '',
        document: '',
        phone: '',
        type: 'INDIVIDUAL',
      };
    }
  },
  { immediate: true }
);

const validate = () => {
  errors.value = {};
  let isValid = true;

  if (!formData.value.name || formData.value.name.length < 2) {
    errors.value.name = t('customers.form.validation.nameMin');
    isValid = false;
  }
  
  if (formData.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = t('customers.form.validation.emailInvalid');
    isValid = false;
  }

  if (!formData.value.type) {
    errors.value.type = t('customers.form.validation.typeRequired');
    isValid = false;
  }

  return isValid;
};

const handleSubmit = () => {
  if (!validate()) return;

  const payload = {
    name: formData.value.name,
    email: formData.value.email || null,
    document: formData.value.document || null,
    phone: formData.value.phone || null,
    type: formData.value.type,
  };

  emit('submit', payload);
};
</script>

<style scoped>
.lf-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.lf-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  margin-top: var(--spacing-4);
}
</style>
