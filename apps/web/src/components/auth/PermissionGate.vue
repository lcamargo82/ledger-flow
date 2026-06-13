<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth.store'

const props = defineProps<{
  permission?: string
  anyPermissions?: string[]
  allPermissions?: string[]
}>()

const authStore = useAuthStore()

const hasAccess = computed(() => {
  if (!authStore.isAuthenticated) return false

  if (props.permission) {
    if (!authStore.checkPermission(props.permission)) return false
  }

  if (props.anyPermissions && props.anyPermissions.length > 0) {
    if (!authStore.checkAnyPermission(props.anyPermissions)) return false
  }

  if (props.allPermissions && props.allPermissions.length > 0) {
    if (!authStore.checkAllPermissions(props.allPermissions)) return false
  }

  return true
})
</script>

<template>
  <template v-if="hasAccess">
    <slot></slot>
  </template>
</template>
