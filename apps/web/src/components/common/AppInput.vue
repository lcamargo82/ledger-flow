<template>
  <div class="lf-input-group" :class="$attrs.class" :style="$attrs.style">
    <label v-if="label" :for="id" class="lf-label">
      {{ label }} <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      @input="handleInput"
      :class="['lf-input', { 'lf-input--error': !!error }]"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${id}-error` : undefined"
      v-bind="inputAttrs"
    />
    <span v-if="error" :id="`${id}-error`" class="lf-error-message" role="alert">
      {{ error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useAttrs, computed } from 'vue';
defineOptions({ inheritAttrs: false });

import { useId } from 'vue';

interface Props {
  modelValue: string | number;
  label?: string;
  type?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const id = useId();
const attrs = useAttrs();
const inputAttrs = computed(() => {
  const { class: _, style: __, ...rest } = attrs;
  return rest;
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};
</script>
