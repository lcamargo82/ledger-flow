<template>
  <div :class="['lf-alert', `lf-alert--${variant}`]" role="alert">
    <div class="lf-flex lf-items-center">
      <span v-if="$slots.icon" class="lf-alert__icon">
        <slot name="icon" />
      </span>
      <div class="lf-alert__content">
        <strong v-if="title" class="lf-alert__title">{{ title }}</strong>
        <p class="lf-alert__message" :class="{'lf-mt-1': title}">
          <slot>{{ message }}</slot>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  message?: string;
}

withDefaults(defineProps<Props>(), {
  variant: 'info',
});
</script>

<style scoped>
.lf-alert__icon {
  margin-right: 0.75rem;
  display: flex;
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
}
.lf-alert__content {
  flex: 1;
}
.lf-alert__title {
  display: block;
  font-weight: 600;
  margin-bottom: 0.125rem;
}
.lf-alert__message {
  margin: 0;
}
.lf-mt-1 {
  margin-top: 0.25rem;
}
</style>
