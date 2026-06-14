<template>
  <Teleport to="body">
    <Transition name="lf-modal">
      <div v-if="modelValue" class="lf-modal-overlay" @click="handleOverlayClick" role="dialog" aria-modal="true" :aria-labelledby="title ? 'lf-modal-title' : undefined">
        <div class="lf-modal-container" @click.stop>
          <div class="lf-modal-header">
            <h3 v-if="title" id="lf-modal-title" class="lf-modal-title">{{ title }}</h3>
            <slot name="header" v-else></slot>
            <button class="lf-modal-close" @click="close" :aria-label="t('common.close')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="lf-modal-body">
            <slot></slot>
          </div>
          
          <div v-if="$slots.footer" class="lf-modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from '../../composables/useI18n';

interface Props {
  modelValue: boolean;
  title?: string;
  preventClose?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  preventClose: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}>();

const { t } = useI18n();

const close = () => {
  emit('update:modelValue', false);
  emit('close');
};

const handleOverlayClick = () => {
  if (!props.preventClose) {
    close();
  }
};

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue && !props.preventClose) {
    close();
  }
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.lf-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--lf-space-4);
}

.lf-modal-container {
  background-color: var(--lf-bg-card);
  border: 1px solid var(--lf-border);
  border-radius: var(--lf-radius);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
}

.lf-modal-header {
  padding: var(--lf-space-4) var(--lf-space-6);
  border-bottom: 1px solid var(--lf-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lf-modal-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.lf-modal-close {
  background: transparent;
  border: none;
  color: var(--lf-text-muted);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--lf-radius);
  transition: all 0.2s;
}

.lf-modal-close:hover {
  color: var(--lf-text-primary);
  background-color: rgba(255, 255, 255, 0.05);
}

.lf-modal-body {
  padding: var(--lf-space-6);
  overflow-y: auto;
}

.lf-modal-footer {
  padding: var(--lf-space-4) var(--lf-space-6);
  border-top: 1px solid var(--lf-border);
  display: flex;
  justify-content: flex-end;
  gap: var(--lf-space-3);
  background-color: rgba(0, 0, 0, 0.2);
  border-bottom-left-radius: var(--lf-radius);
  border-bottom-right-radius: var(--lf-radius);
}

.icon {
  width: 1.25rem;
  height: 1.25rem;
}

/* Transitions */
.lf-modal-enter-active,
.lf-modal-leave-active {
  transition: opacity 0.3s ease;
}

.lf-modal-enter-from,
.lf-modal-leave-to {
  opacity: 0;
}

.lf-modal-enter-active .lf-modal-container {
  animation: modal-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.lf-modal-leave-active .lf-modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
  transform: scale(0.95);
  opacity: 0;
}

@keyframes modal-pop {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
