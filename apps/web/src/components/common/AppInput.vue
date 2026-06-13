<script setup lang="ts">
defineProps<{
  modelValue: string
  label?: string
  type?: string
  placeholder?: string
  error?: string
  autocomplete?: string
  id?: string
  disabled?: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="lf-input-group">
    <label v-if="label" :for="id" class="lf-label">{{ label }}</label>
    <input
      :id="id"
      :type="type || 'text'"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      class="lf-input"
      :class="{ 'lf-input--error': !!error }"
    />
    <span v-if="error" class="lf-error-message">{{ error }}</span>
  </div>
</template>
