<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'
import AppBadge from '../common/AppBadge.vue'

interface Props {
  status: 'HEALTHY' | 'ATTENTION' | 'CRITICAL' | 'UNKNOWN'
}

const props = defineProps<Props>()
const { t } = useI18n()

const variant = computed(() => {
  switch (props.status) {
    case 'HEALTHY': return 'success'
    case 'ATTENTION': return 'warning'
    case 'CRITICAL': return 'danger'
    default: return 'default'
  }
})

const label = computed(() => {
  return t(`platform.tenants.health.${props.status}`)
})
</script>

<template>
  <AppBadge :variant="variant" class="font-medium">
    {{ label }}
  </AppBadge>
</template>
