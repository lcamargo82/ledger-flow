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
  <div v-if="!overview" class="lf-loading-container">
    Carregando overview...
  </div>
  <div v-else class="lf-panel-container">
    <TenantOperationalMetrics :metrics="overview.operations" />
    
    <div class="lf-panel-grid">
      <TenantGatewaySummary :gateway="overview.gateway" />
      <TenantWebhookSummary :webhooks="overview.webhooks" />
    </div>
  </div>
</template>

<style scoped>
.lf-panel-container {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-6);
}

.lf-panel-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--lf-space-6);
}

@media (min-width: 768px) {
  .lf-panel-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
