<template>
  <div class="lf-input-group">
    <label v-if="label" :for="id" class="lf-label">
      {{ label }} <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>
    <div class="relative">
      <input
        :id="id"
        :type="inputType"
        :value="modelValue"
        @input="handleInput"
        :class="['lf-input lf-password-input', { 'lf-input--error': !!error }]"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
        v-bind="$attrs"
      />
      <button
        type="button"
        class="lf-password-toggle"
        @click="togglePasswordVisibility"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
        tabindex="-1"
      >
        <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </button>
    </div>
    <span v-if="error" :id="`${id}-error`" class="lf-error-message" role="alert">
      {{ error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useId } from 'vue';

interface Props {
  modelValue: string;
  label?: string;
  placeholder?: string;
  error?: string;
  autocomplete?: string;
  disabled?: boolean;
  required?: boolean;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  autocomplete: 'current-password'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const id = useId();
const showPassword = ref(false);

const inputType = computed(() => (showPassword.value ? 'text' : 'password'));

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};
</script>

<style scoped>
.relative {
  position: relative;
  display: flex;
  align-items: center;
}
.lf-password-input {
  padding-right: 2.5rem; /* space for the icon */
}
.lf-password-toggle {
  position: absolute;
  right: 0.5rem;
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: var(--lf-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  border-radius: var(--lf-radius);
}
.lf-password-toggle:hover {
  color: var(--lf-text-primary);
}
.lf-password-toggle:focus-visible {
  outline: 2px solid var(--lf-primary);
  outline-offset: 2px;
}
.icon {
  width: 1.25rem;
  height: 1.25rem;
}
</style>
