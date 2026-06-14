<template>
  <button
    :class="[
      'lf-button',
      `lf-button--${variant}`,
      { 'lf-button--small': size === 'small' },
      { 'lf-w-full': block }
    ]"
    :disabled="disabled || loading"
    :type="type"
    v-bind="$attrs"
  >
    <span v-if="loading" class="lf-button__spinner" aria-hidden="true"></span>
    <span v-if="$slots.icon" class="lf-button__icon" :class="{'lf-mr-2': $slots.default}">
      <slot name="icon" />
    </span>
    <slot />
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'small';
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'default',
  disabled: false,
  loading: false,
  block: false,
  type: 'button',
});
</script>

<style scoped>
.lf-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.lf-mr-2 {
  margin-right: 0.5rem;
}
</style>
