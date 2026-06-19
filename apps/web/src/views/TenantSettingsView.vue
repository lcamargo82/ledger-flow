<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useTenantStore } from '../stores/tenant.store'
import { useAuthStore } from '../stores/auth.store'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppCard from '../components/common/AppCard.vue'
import AppInput from '../components/common/AppInput.vue'
import AppButton from '../components/common/AppButton.vue'
import AppBadge from '../components/common/AppBadge.vue'
import AppSelect from '../components/common/AppSelect.vue'

const { t } = useI18n()
const tenantStore = useTenantStore()
const authStore = useAuthStore()

const formData = ref({
  name: '',
  timezone: ''
})
const errors = ref<Record<string, string>>({})

const timezoneOptions = ref([
  { value: 'UTC', label: 'UTC' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Lisbon', label: 'Europe/Lisbon (WET)' }
])

onMounted(async () => {
  if (authStore.checkPermission('tenant:update')) {
    await tenantStore.fetchCurrentTenant()
    if (tenantStore.tenant) {
      formData.value.name = tenantStore.tenant.name
      formData.value.timezone = tenantStore.tenant.timezone
    }
  }
})

watch(() => tenantStore.tenant, (newVal) => {
  if (newVal) {
    formData.value.name = newVal.name
    formData.value.timezone = newVal.timezone
  }
}, { deep: true })

const validate = () => {
  errors.value = {}
  let isValid = true

  if (!formData.value.name.trim()) {
    errors.value.name = t('tenantSettings.validation.nameRequired')
    isValid = false
  }

  if (!formData.value.timezone.trim()) {
    errors.value.timezone = t('tenantSettings.validation.timezoneRequired')
    isValid = false
  }

  return isValid
}

const handleSave = async () => {
  if (!validate()) return
  
  await tenantStore.updateCurrentTenant({
    name: formData.value.name,
    timezone: formData.value.timezone
  })
}
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader 
      :title="t('tenantSettings.title')" 
      :description="t('tenantSettings.description')"
    />

    <div v-if="tenantStore.isLoading" class="flex justify-center py-12">
      <span class="text-gray-500">{{ t('common.loading') }}</span>
    </div>

    <div v-else-if="tenantStore.tenant" class="max-w-2xl">
      <AppCard>
        <form @submit.prevent="handleSave" class="space-y-6" novalidate>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <AppInput 
                id="tenant-name"
                v-model="formData.name"
                :label="t('tenantSettings.form.nameLabel')"
                :placeholder="t('tenantSettings.form.namePlaceholder')"
                :error="errors.name"
                :disabled="tenantStore.isSaving"
                @input="errors.name = ''"
                required
              />
            </div>

            <div class="sm:col-span-2">
              <AppInput 
                id="tenant-slug"
                :model-value="tenantStore.tenant.slug"
                :label="t('tenantSettings.form.slugLabel')"
                disabled
                readonly
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('common.readonly') }}</p>
            </div>

            <div class="sm:col-span-2">
              <AppSelect 
                id="tenant-timezone"
                v-model="formData.timezone"
                :label="t('tenantSettings.form.timezoneLabel')"
                :options="timezoneOptions"
                :error="errors.timezone"
                :disabled="tenantStore.isSaving"
                @change="errors.timezone = ''"
                required
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('tenantSettings.form.activeLabel') }}
              </label>
              <AppBadge :variant="tenantStore.tenant.active ? 'success' : 'danger'">
                {{ tenantStore.tenant.active ? t('common.enabled') : t('common.disabled') }}
              </AppBadge>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('common.readonly') }}</p>
            </div>
          </div>

          <div class="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <AppButton 
              type="submit" 
              variant="primary" 
              :loading="tenantStore.isSaving"
              :disabled="tenantStore.isSaving"
            >
              {{ t('tenantSettings.actions.save') }}
            </AppButton>
          </div>
        </form>
      </AppCard>
    </div>
  </div>
</template>
