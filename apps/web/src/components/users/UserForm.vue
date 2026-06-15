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
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <div class="space-y-4">
      <AppInput
        id="user-name"
        v-model="formData.name"
        :label="t('users.form.nameLabel')"
        :placeholder="t('users.form.namePlaceholder')"
        :error="errors.name"
        :disabled="loading"
        required
      />

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

      <AppPasswordInput
        v-if="!isEditMode"
        id="user-password"
        v-model="formData.temporaryPassword"
        :label="t('users.form.temporaryPasswordLabel')"
        :placeholder="t('users.form.temporaryPasswordPlaceholder')"
        :error="errors.temporaryPassword"
        :disabled="loading"
        required
      />

      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('users.form.rolesLabel') }}
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label 
            v-for="role in availableRoles" 
            :key="role.key"
            class="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            :class="[
              formData.roleKeys.includes(role.key) 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400' 
                : 'border-gray-200 dark:border-gray-700'
            ]"
          >
            <div class="flex items-center h-5">
              <input 
                type="checkbox"
                :value="role.key"
                :checked="formData.roleKeys.includes(role.key)"
                @change="toggleRole(role.key)"
                :disabled="loading"
                class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div class="ml-3 text-sm">
              <span class="font-medium text-gray-900 dark:text-white">{{ role.label }}</span>
            </div>
          </label>
        </div>
        <p v-if="errors.roleKeys" class="mt-1 text-sm text-red-600 dark:text-red-400">
          {{ errors.roleKeys }}
        </p>
      </div>

      <div v-if="!isEditMode" class="flex items-center mt-4">
        <input 
          id="user-active" 
          type="checkbox" 
          v-model="formData.active"
          :disabled="loading"
          class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <label for="user-active" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
          {{ t('users.form.activeLabel') }}
        </label>
      </div>
    </div>

    <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
