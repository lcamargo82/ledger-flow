<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useAuthStore } from '../stores/auth.store'
import { httpClient as api } from '../services/http-client'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppCard from '../components/common/AppCard.vue'
import AppButton from '../components/common/AppButton.vue'
import AppBadge from '../components/common/AppBadge.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const isLoading = ref(true)
const connectionStatus = ref<{
  connected: boolean;
  provider: string;
  environment?: string;
  status?: string;
  supportedMethods?: string[];
  connectedAt?: string;
} | null>(null)

const isConnecting = ref(false)
const isDisconnecting = ref(false)

const loadStatus = async () => {
  try {
    isLoading.value = true
    const response = await api.get('/gateways/mercado-pago/connection-status')
    connectionStatus.value = response.data
  } catch (error) {
    console.error('Failed to load gateway status', error)
  } finally {
    isLoading.value = false
  }
}

const handleConnect = async () => {
  try {
    isConnecting.value = true
    const response = await api.post('/gateways/mercado-pago/connect')
    if (response.data.authorizationUrl) {
      window.location.href = response.data.authorizationUrl
    }
  } catch (error) {
    console.error('Failed to initiate connection', error)
  } finally {
    isConnecting.value = false
  }
}

const handleDisconnect = async () => {
  if (!confirm('Are you sure you want to disconnect Mercado Pago? New payments will not be processed.')) return
  
  try {
    isDisconnecting.value = true
    await api.post('/gateways/mercado-pago/disconnect')
    await loadStatus()
  } catch (error) {
    console.error('Failed to disconnect', error)
  } finally {
    isDisconnecting.value = false
  }
}

onMounted(() => {
  if (authStore.checkPermission('gateways:read')) {
    loadStatus()
  }
  
  // Clear query params if any
  if (route.query.success || route.query.error) {
    const newQuery = { ...route.query }
    delete newQuery.success
    delete newQuery.error
    delete newQuery.provider
    router.replace({ query: newQuery })
  }
})
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader 
      title="Payment Gateways" 
      description="Manage your payment provider connections and settings."
    />

    <div v-if="isLoading" class="flex justify-center py-12">
      <span class="text-gray-500">{{ t('common.loading') }}</span>
    </div>

    <div v-else class="max-w-3xl space-y-6">
      <AppCard>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xl">
              MP
            </div>
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Mercado Pago</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">Accept PIX and Boleto payments automatically.</p>
            </div>
          </div>
          <div>
            <AppBadge v-if="connectionStatus?.connected" variant="success">Connected</AppBadge>
            <AppBadge v-else variant="default">Not Connected</AppBadge>
          </div>
        </div>
        
        <div class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          <div v-if="connectionStatus?.connected" class="space-y-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="block text-gray-500 dark:text-gray-400">Environment</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ connectionStatus.environment }}</span>
              </div>
              <div>
                <span class="block text-gray-500 dark:text-gray-400">Supported Methods</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ connectionStatus.supportedMethods?.join(', ') }}</span>
              </div>
            </div>
            <div class="flex justify-end pt-4">
              <AppButton 
                variant="danger" 
                @click="handleDisconnect" 
                :loading="isDisconnecting"
                :disabled="isDisconnecting"
              >
                Disconnect
              </AppButton>
            </div>
          </div>
          
          <div v-else class="flex flex-col items-center justify-center py-6 text-center">
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Connect your Mercado Pago account to start accepting payments. You will be redirected to authorize LedgerFlow.
            </p>
            <AppButton 
              variant="primary" 
              @click="handleConnect" 
              :loading="isConnecting"
              :disabled="isConnecting"
            >
              Connect with Mercado Pago
            </AppButton>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>
