<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '../../composables/useI18n'
import AppInput from '../common/AppInput.vue'
import AppPasswordInput from '../common/AppPasswordInput.vue'
import AppButton from '../common/AppButton.vue'
import AppAlert from '../common/AppAlert.vue'

interface RoleOption {
  key: string
  label: string
}

const props = withDefaults(defineProps<{
  mode: 'create' | 'edit'
  initialValue?: Record<string, any>
  availableRoles: RoleOption[]
  loading?: boolean
  submitLabel?: string
}>(), {
  initialValue: () => ({}),
  loading: false
})

const emit = defineEmits<{
  (e: 'submit', payload: Record<string, any>): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()

const formData = ref({
  name: '',
  email: '',
  temporaryPassword: '',
  roleKeys: [] as string[],
  active: true
})

const errors = ref<Record<string, string>>({})

watch(() => props.initialValue, (newVal) => {
  if (newVal) {
    formData.value.name = newVal.name || ''
    formData.value.email = newVal.email || ''
    formData.value.roleKeys = newVal.roles || []
    formData.value.active = newVal.active ?? true
    // temporaryPassword is not set on edit
  }
}, { immediate: true, deep: true })

const isEditMode = computed(() => props.mode === 'edit')

function validate() {
  errors.value = {}
  let isValid = true

  if (!formData.value.name.trim()) {
    errors.value.name = t('users.form.validation.nameRequired')
    isValid = false
  }

  if (!formData.value.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.value.email)) {
    errors.value.email = t('users.form.validation.emailRequired')
    isValid = false
  }

  if (!isEditMode.value) {
    if (!formData.value.temporaryPassword) {
      errors.value.temporaryPassword = t('users.form.validation.passwordRequired')
      isValid = false
    } else if (formData.value.temporaryPassword.length < 8) {
      errors.value.temporaryPassword = t('users.form.validation.passwordMin')
      isValid = false
    }
  }

  if (formData.value.roleKeys.length === 0) {
    errors.value.roleKeys = t('users.form.validation.roleRequired')
    isValid = false
  }

  return isValid
}

function handleSubmit() {
  if (!validate()) return

  const payload: Record<string, any> = {
    name: formData.value.name,
    email: formData.value.email,
  }

  // Se o roleKeys mudou, a gente envia. Mas na interface principal
  // a requisição de updateRoles é feita separadamente ou aqui? 
  // No store, as mutations são separadas. O componente pai vai decidir como lidar com isso.
  payload.roleKeys = [...formData.value.roleKeys]

  if (!isEditMode.value) {
    payload.temporaryPassword = formData.value.temporaryPassword
    payload.active = formData.value.active
  }

  emit('submit', payload)
}

function toggleRole(roleKey: string) {
  const idx = formData.value.roleKeys.indexOf(roleKey)
  if (idx === -1) {
    formData.value.roleKeys.push(roleKey)
  } else {
    formData.value.roleKeys.splice(idx, 1)
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="lf-form" novalidate>
    <div class="lf-form__row">
      <AppInput
        id="user-name"
        v-model="formData.name"
        :label="t('users.form.nameLabel')"
        :placeholder="t('users.form.namePlaceholder')"
        :error="errors.name"
        :disabled="loading"
        required
      />
    </div>

    <div class="lf-form__row">
      <AppInput
        id="user-email"
        type="email"
        v-model="formData.email"
        :label="t('users.form.emailLabel')"
        :placeholder="t('users.form.emailPlaceholder')"
        :error="errors.email"
        :disabled="loading"
        required
      />
    </div>

    <div class="lf-form__row" v-if="!isEditMode">
      <AppPasswordInput
        id="user-password"
        v-model="formData.temporaryPassword"
        :label="t('users.form.temporaryPasswordLabel')"
        :placeholder="t('users.form.temporaryPasswordPlaceholder')"
        :error="errors.temporaryPassword"
        :disabled="loading"
        required
      />
    </div>

    <div class="lf-form__row flex flex-col gap-3 mt-2">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ t('users.form.rolesLabel') }}
      </label>
      <div class="roles-container">
        <label 
          v-for="role in availableRoles" 
          :key="role.key"
          class="role-item"
        >
          <input 
            type="checkbox"
            :value="role.key"
            :checked="formData.roleKeys.includes(role.key)"
            @change="toggleRole(role.key)"
            :disabled="loading"
            class="role-checkbox"
          />
          <span class="role-label">{{ role.label }}</span>
        </label>
      </div>
      <span v-if="errors.roleKeys" class="text-sm text-red-600 dark:text-red-400">
        {{ errors.roleKeys }}
      </span>
    </div>

    <div v-if="!isEditMode" class="lf-form__row mt-4 pt-4 border-t">
      <label class="lf-toggle" for="user-active">
        <input 
          id="user-active" 
          type="checkbox" 
          v-model="formData.active"
          :disabled="loading"
          class="lf-toggle-input"
        />
        <div class="lf-toggle-track">
          <div class="lf-toggle-thumb"></div>
        </div>
        <span class="lf-toggle-label">
          {{ t('users.form.activeLabel') }}
        </span>
      </label>
    </div>

    <div class="lf-form__actions">
      <AppButton
        type="button"
        variant="secondary"
        @click="emit('cancel')"
        :disabled="loading"
      >
        {{ t('common.cancel') }}
      </AppButton>
      
      <AppButton
        type="submit"
        variant="primary"
        :loading="loading"
        :disabled="loading"
      >
        {{ submitLabel || t('common.save') }}
      </AppButton>
    </div>
  </form>
</template>

<style scoped>
.lf-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4, 1rem);
}

.lf-form__row {
  display: flex;
  flex-direction: column;
}

.lf-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3, 0.75rem);
  margin-top: var(--spacing-4, 1rem);
}

.mt-4 { margin-top: var(--lf-space-4); }
.pt-4 { padding-top: var(--lf-space-4); }
.border-t { border-top: 1px solid var(--lf-border-primary); }

.roles-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--lf-space-4);
}

.role-item {
  display: flex;
  align-items: center;
  gap: var(--lf-space-2);
  cursor: pointer;
}

.role-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--lf-primary);
}

.role-label {
  font-size: 0.875rem;
  color: var(--lf-text-primary);
  font-weight: 500;
  transition: color 0.2s;
}

.role-item:hover .role-label {
  color: var(--lf-primary);
}

/* Toggle Switch Styles */
.lf-toggle {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  gap: var(--lf-space-3);
}

.lf-toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.lf-toggle-track {
  width: 36px;
  height: 20px;
  background-color: var(--lf-surface-secondary);
  border: 1px solid var(--lf-border-primary);
  border-radius: 9999px;
  position: relative;
  transition: background-color 0.2s, border-color 0.2s;
}

.lf-toggle-thumb {
  position: absolute;
  top: 1px;
  left: 2px;
  width: 16px;
  height: 16px;
  background-color: var(--lf-text-secondary);
  border-radius: 50%;
  transition: transform 0.2s, background-color 0.2s;
}

.lf-toggle-input:checked + .lf-toggle-track {
  background-color: var(--lf-primary);
  border-color: var(--lf-primary);
}

.lf-toggle-input:checked + .lf-toggle-track .lf-toggle-thumb {
  transform: translateX(14px);
  background-color: #ffffff;
}

.lf-toggle-input:disabled + .lf-toggle-track {
  opacity: 0.5;
  cursor: not-allowed;
}

.lf-toggle-label {
  font-size: 0.875rem;
  color: var(--lf-text-primary);
  font-weight: 500;
  margin: 0;
}
</style>
