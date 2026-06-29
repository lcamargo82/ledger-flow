<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'
import type { PlatformTenantOverviewResponse } from '../../types/platform.types'
import TenantOperationalMetrics from './TenantOperationalMetrics.vue'
import TenantGatewaySummary from './TenantGatewaySummary.vue'
import TenantWebhookSummary from './TenantWebhookSummary.vue'

interface Props {
  overview: PlatformTenantOverviewResponse | null
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <div v-if="!overview" class="p-8 text-center text-gray-500">
    Carregando overview...
  </div>
  <div v-else class="space-y-6">
    <TenantOperationalMetrics :metrics="overview.operations" />
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <TenantGatewaySummary :gateway="overview.gateway" />
      <TenantWebhookSummary :webhooks="overview.webhooks" />
    </div>
  </div>
</template>
