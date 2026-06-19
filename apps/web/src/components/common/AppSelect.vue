<template>
  <div class="lf-input-group">
    <label v-if="label" :for="id" class="lf-label">
      {{ label }} <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>
    <div class="lf-select-wrapper">
      <select
        :id="id"
        :value="modelValue"
        @change="handleChange"
        :class="['lf-input', 'lf-select', { 'lf-input--error': !!error }]"
        :disabled="disabled"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
        v-bind="$attrs"
      >
        <option v-if="placeholder" value="" disabled selected class="lf-select-placeholder">
          {{ placeholder }}
        </option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <div class="lf-select-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>
    <span v-if="error" :id="`${id}-error`" class="lf-error-message" role="alert">
      {{ error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';

interface Option {
  label: string;
  value: string | number;
}

interface Props {
  modelValue?: string | number | null;
  options: Option[];
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const id = useId();

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
};
</script>

<style scoped>
.lf-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.lf-select {
  appearance: none;
  padding-right: 2.5rem;
  cursor: pointer;
}

.lf-select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.lf-select-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: var(--lf-text-secondary);
  pointer-events: none;
}

.lf-select-placeholder {
  color: var(--lf-text-muted);
}

option {
  background-color: var(--lf-surface-primary);
  color: var(--lf-text-primary);
}
</style>
