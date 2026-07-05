<template>
  <div class="lf-input-group" :class="$attrs.class" :style="$attrs.style">
    <label v-if="label" :for="id" class="lf-label">
      {{ label }} <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>
    <input
      :id="id"
      type="text"
      inputmode="numeric"
      :value="displayValue"
      @input="handleInput"
      @blur="handleBlur"
      :class="['lf-input', 'lf-input--number', { 'lf-input--error': !!error }]"
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
import { useAttrs, computed, ref, watch } from 'vue';
import { useId } from 'vue';
defineOptions({ inheritAttrs: false });

interface Props {
  modelValue: number | null | undefined;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  allowDecimals?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  allowDecimals: false,
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

const displayValue = ref(props.modelValue !== null && props.modelValue !== undefined ? String(props.modelValue) : '');

// Sincronizar caso mude externamente
watch(() => props.modelValue, (newVal) => {
  if (newVal === null || newVal === undefined) {
    displayValue.value = '';
  } else {
    // Apenas atualiza se for diferente da conversão do display atual para evitar conflitos de digitação
    const parsed = props.allowDecimals ? parseFloat(displayValue.value) : parseInt(displayValue.value, 10);
    if (parsed !== newVal) {
      displayValue.value = String(newVal);
    }
  }
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let rawValue = target.value;
  
  // Apenas números e, opcionalmente, vírgula/ponto
  if (props.allowDecimals) {
    // Permite apenas números e um único ponto/vírgula
    rawValue = rawValue.replace(/[^0-9.,]/g, '');
    // Troca vírgula por ponto para parse
    rawValue = rawValue.replace(',', '.');
    // Evita múltiplos pontos
    const parts = rawValue.split('.');
    if (parts.length > 2) {
      rawValue = parts[0] + '.' + parts.slice(1).join('');
    }
  } else {
    // Apenas números
    rawValue = rawValue.replace(/[^0-9]/g, '');
  }
  
  displayValue.value = rawValue;
  
  if (rawValue === '' || rawValue === '.') {
    emit('update:modelValue', null);
  } else {
    const numValue = props.allowDecimals ? parseFloat(rawValue) : parseInt(rawValue, 10);
    if (!isNaN(numValue)) {
      emit('update:modelValue', numValue);
    }
  }
};

const handleBlur = () => {
  if (props.allowDecimals && displayValue.value) {
    // Formata algo como "10." para "10"
    if (displayValue.value.endsWith('.')) {
      displayValue.value = displayValue.value.slice(0, -1);
    }
  }
};
</script>

<style scoped>
.lf-input--number {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
