<template>
  <div class="lf-password-strength-indicator">
    <div class="lf-strength-bar-container">
      <div 
        class="lf-strength-bar" 
        :class="strengthClass"
        :style="{ width: `${(validCount / totalRequirements) * 100}%` }"
      ></div>
    </div>
    
    <div class="lf-requirements-grid">
      <div 
        class="lf-requirement-item" 
        :class="{ 'is-valid': lengthValid }"
      >
        <component :is="lengthValid ? CheckIcon : CircleIcon" class="icon" />
        <span>{{ t('auth.passwordRequirements.minChars') }}</span>
      </div>
      
      <div 
        class="lf-requirement-item" 
        :class="{ 'is-valid': uppercaseValid }"
      >
        <component :is="uppercaseValid ? CheckIcon : CircleIcon" class="icon" />
        <span>{{ t('auth.passwordRequirements.uppercase') }}</span>
      </div>
      
      <div 
        class="lf-requirement-item" 
        :class="{ 'is-valid': lowercaseValid }"
      >
        <component :is="lowercaseValid ? CheckIcon : CircleIcon" class="icon" />
        <span>{{ t('auth.passwordRequirements.lowercase') }}</span>
      </div>
      
      <div 
        class="lf-requirement-item" 
        :class="{ 'is-valid': numberValid }"
      >
        <component :is="numberValid ? CheckIcon : CircleIcon" class="icon" />
        <span>{{ t('auth.passwordRequirements.number') }}</span>
      </div>
      
      <div 
        class="lf-requirement-item" 
        :class="{ 'is-valid': specialValid }"
      >
        <component :is="specialValid ? CheckIcon : CircleIcon" class="icon" />
        <span>{{ t('auth.passwordRequirements.special') }}</span>
      </div>

      <div 
        v-if="showConfirm"
        class="lf-requirement-item" 
        :class="{ 'is-valid': matchValid }"
      >
        <component :is="matchValid ? CheckIcon : CircleIcon" class="icon" />
        <span>{{ t('auth.passwordRequirements.match') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue';
import { useI18n } from '../../composables/useI18n';

const props = defineProps<{
  password: string;
  confirmPassword?: string;
  showConfirm?: boolean;
}>();

const { t } = useI18n();

const CheckIcon = h('svg', { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', strokeWidth: 2, stroke: 'currentColor', width: '14', height: '14' }, [
  h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M4.5 12.75l6 6 9-13.5' })
]);

const CircleIcon = h('svg', { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', strokeWidth: 1.5, stroke: 'currentColor', width: '14', height: '14' }, [
  h('circle', { cx: 12, cy: 12, r: 9 })
]);

const lengthValid = computed(() => props.password.length >= 8);
const uppercaseValid = computed(() => /[A-Z]/.test(props.password));
const lowercaseValid = computed(() => /[a-z]/.test(props.password));
const numberValid = computed(() => /[0-9]/.test(props.password));
const specialValid = computed(() => /[!@#$%^&*(),.?":{}|<>\-_]/.test(props.password));
const matchValid = computed(() => props.showConfirm && props.password.length > 0 && props.password === props.confirmPassword);

const validCount = computed(() => {
  return [
    lengthValid.value,
    uppercaseValid.value,
    lowercaseValid.value,
    numberValid.value,
    specialValid.value,
    props.showConfirm ? matchValid.value : true
  ].filter(Boolean).length;
});

const totalRequirements = computed(() => props.showConfirm ? 6 : 5);

const strengthClass = computed(() => {
  const percentage = validCount.value / totalRequirements.value;
  if (percentage === 0) return '';
  if (percentage < 0.5) return 'lf-strength-weak';
  if (percentage < 1) return 'lf-strength-medium';
  return 'lf-strength-strong';
});
</script>

<style scoped>
.lf-password-strength-indicator {
  margin-top: 0.75rem;
}

.lf-strength-bar-container {
  height: 4px;
  background-color: var(--lf-bg-elevated, #374151);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.lf-strength-bar {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
  width: 0%;
}

.lf-strength-weak {
  background-color: var(--lf-error, #ef4444);
}

.lf-strength-medium {
  background-color: var(--lf-warning, #f59e0b);
}

.lf-strength-strong {
  background-color: var(--lf-success, #22c55e);
}

.lf-requirements-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem 0.5rem;
}

@media (min-width: 640px) {
  .lf-requirements-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.lf-requirement-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: var(--lf-text-muted, #9ca3af);
  transition: color 0.2s ease;
  font-size: 0.75rem;
  line-height: 1.25;
}

.lf-requirement-item.is-valid {
  color: var(--lf-success, #22c55e);
}

.lf-requirement-item .icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 0.1rem;
}
</style>
