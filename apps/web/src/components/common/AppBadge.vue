<template>
  <span :class="['lf-badge', `lf-badge--${variant}`]">
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  label?: string;
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
});
</script>
