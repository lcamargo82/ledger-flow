<template>
  <div class="lf-input-group" :class="$attrs.class" :style="$attrs.style">
    <label v-if="label" :for="id" class="lf-label">
      {{ label }} <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>
    <div class="lf-currency-wrapper">
      <span class="lf-currency-symbol">{{ currencySymbol }}</span>
      <input
        :id="id"
        type="text"
        inputmode="numeric"
        :value="displayValue"
        @input="handleInput"
        @focus="moveCursorToEnd"
        @click="moveCursorToEnd"
        @keydown.left.prevent
        @keydown.right.prevent
        @keydown.up.prevent
        @keydown.down.prevent
        :class="['lf-input', 'lf-input--currency', { 'lf-input--error': !!error }]"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
        v-bind="inputAttrs"
      />
    </div>
    <span v-if="error" :id="`${id}-error`" class="lf-error-message" role="alert">
      {{ error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useAttrs, computed, ref, watch } from 'vue';
import { useId } from 'vue';
defineOptions({ inheritAttrs: false });

interface Props {
  modelValue: number | null | undefined; // In cents!
  currency?: string; // BRL, USD, etc.
  locale?: string;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  currency: 'BRL',
  locale: 'pt-BR',
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void;
}>();

const id = useId();
const attrs = useAttrs();
const inputAttrs = computed(() => {
  const { class: _, style: __, type: ___, ...rest } = attrs;
  return rest;
});

// Determine currency symbol dynamically
const currencySymbol = computed(() => {
  const formatter = new Intl.NumberFormat(props.locale, {
    style: 'currency',
    currency: props.currency,
  });
  // Extract just the symbol
  const parts = formatter.formatToParts(0);
  const symbolPart = parts.find(p => p.type === 'currency');
  return symbolPart ? symbolPart.value : '$';
});

// Format from cents to string without symbol
const formatCentsToString = (cents: number) => {
  const amount = cents / 100;
  const formatter = new Intl.NumberFormat(props.locale, {
    style: 'currency',
    currency: props.currency,
  });
  const parts = formatter.formatToParts(amount);
  
  // Reconstruct the string without the currency symbol and spaces
  return parts
    .filter(p => p.type !== 'currency' && p.type !== 'literal' || (p.type === 'literal' && p.value.trim() !== ''))
    .map(p => p.value)
    .join('')
    .trim();
};

const displayValue = ref(props.modelValue ? formatCentsToString(props.modelValue) : formatCentsToString(0));

watch(() => props.modelValue, (newVal) => {
  if (newVal === null || newVal === undefined) {
    displayValue.value = formatCentsToString(0);
  } else {
    // Only format if the current raw value in display doesn't match the new value (prevent jumping cursor)
    const currentRaw = parseInt(displayValue.value.replace(/[^0-9]/g, ''), 10);
    if (currentRaw !== newVal) {
      displayValue.value = formatCentsToString(newVal);
    }
  }
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const rawString = target.value;
  
  // Extract only digits
  const justDigits = rawString.replace(/[^0-9]/g, '');
  
  // Parse into integer (cents)
  const cents = justDigits === '' ? 0 : parseInt(justDigits, 10);
  
  // Update display
  const newFormatted = formatCentsToString(cents);
  displayValue.value = newFormatted;
  target.value = newFormatted; // Force input to match immediately
  
  // Emit to parent
  emit('update:modelValue', cents);
};

const moveCursorToEnd = (event: Event) => {
  const target = event.target as HTMLInputElement;
  // Delay slightly to ensure focus/click has completed
  setTimeout(() => {
    target.selectionStart = target.selectionEnd = target.value.length;
  }, 0);
};
</script>

<style scoped>
.lf-currency-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.lf-currency-symbol {
  position: absolute;
  left: 1rem;
  color: var(--lf-text-muted);
  font-weight: 500;
  pointer-events: none;
}

.lf-input--currency {
  text-align: right;
  padding-left: 3rem; /* Give space for symbol */
  font-variant-numeric: tabular-nums;
}
</style>
