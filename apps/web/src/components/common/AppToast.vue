<template>
  <Transition name="lf-toast-transition" @after-leave="onAfterLeave">
    <div 
      v-if="visible"
      :class="['lf-toast', `lf-toast--${type}`]"
      role="alert"
    >
      <div class="lf-toast__icon">
        <!-- Success Icon -->
        <svg v-if="type === 'success'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <!-- Error Icon -->
        <svg v-else-if="type === 'error'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="m12 13.5-3-3m0 0-3-3m3 3 3 3m-3-3 3-3m-3 3-3 3m6-6v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 19.5v-6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 13.5v6a2.25 2.25 0 0 1-2.25 2.25H12Z" /> <!-- Just a generic cross fallback, let's use circle-xmark -->
          <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <!-- Warning Icon -->
        <svg v-else-if="type === 'warning'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
        </svg>
        <!-- Info Icon -->
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
      </div>
      <div class="lf-toast__content">
        <strong v-if="title" class="lf-toast__title">{{ title }}</strong>
        <p class="lf-toast__message">{{ message }}</p>
      </div>
      <button class="lf-toast__close" @click="close">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="icon-small">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
      <div v-if="duration > 0" class="lf-toast__progress">
        <div class="lf-toast__progress-bar" :style="progressStyle"></div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

interface Props {
  id: string | number;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 5000,
});

const emit = defineEmits<{
  (e: 'close', id: string | number): void;
}>();

const visible = ref(true);
const remaining = ref(props.duration);
let timerId: number | undefined;
let startTime: number;
let animationFrameId: number;

const progressStyle = computed(() => {
  if (props.duration <= 0) return { width: '0%' };
  const percentage = (remaining.value / props.duration) * 100;
  return { width: `${percentage}%` };
});

const close = () => {
  visible.value = false;
};

const onAfterLeave = () => {
  emit('close', props.id);
};

const updateProgress = () => {
  if (!visible.value || props.duration <= 0) return;
  
  const now = Date.now();
  const elapsed = now - startTime;
  remaining.value = Math.max(0, props.duration - elapsed);
  
  if (remaining.value > 0) {
    animationFrameId = requestAnimationFrame(updateProgress);
  }
};

onMounted(() => {
  if (props.duration > 0) {
    startTime = Date.now();
    animationFrameId = requestAnimationFrame(updateProgress);
    timerId = window.setTimeout(close, props.duration);
  }
});

onUnmounted(() => {
  if (timerId !== undefined) clearTimeout(timerId);
  if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped>
.lf-toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  width: 100%;
  padding: 1rem;
  background-color: var(--lf-bg-card);
  border: 1px solid var(--lf-border);
  border-radius: var(--lf-radius);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  pointer-events: auto;
}

.lf-toast--success { border-left: 4px solid var(--lf-success); }
.lf-toast--error { border-left: 4px solid var(--lf-danger); }
.lf-toast--warning { border-left: 4px solid var(--lf-warning); }
.lf-toast--info { border-left: 4px solid var(--lf-info); }

.lf-toast__icon {
  flex-shrink: 0;
  margin-right: 0.75rem;
  display: flex;
  margin-top: 0.125rem;
}

.lf-toast--success .lf-toast__icon { color: var(--lf-success); }
.lf-toast--error .lf-toast__icon { color: var(--lf-danger); }
.lf-toast--warning .lf-toast__icon { color: var(--lf-warning); }
.lf-toast--info .lf-toast__icon { color: var(--lf-info); }

.lf-toast__content {
  flex: 1;
  min-width: 0; /* allows text truncation if needed */
}

.lf-toast__title {
  display: block;
  font-weight: 600;
  font-size: 0.9375rem;
  margin-bottom: 0.25rem;
  color: var(--lf-text-primary);
}

.lf-toast__message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--lf-text-secondary);
  line-height: 1.5;
}

.lf-toast__close {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--lf-text-muted);
  cursor: pointer;
  padding: 0.25rem;
  margin-left: 0.5rem;
  margin-top: -0.25rem;
  margin-right: -0.25rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.lf-toast__close:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--lf-text-primary);
}

.icon {
  width: 1.25rem;
  height: 1.25rem;
}
.icon-small {
  width: 1rem;
  height: 1rem;
}

.lf-toast__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: rgba(255, 255, 255, 0.05);
}

.lf-toast__progress-bar {
  height: 100%;
  transition: width 0.1s linear;
}

.lf-toast--success .lf-toast__progress-bar { background-color: var(--lf-success); }
.lf-toast--error .lf-toast__progress-bar { background-color: var(--lf-danger); }
.lf-toast--warning .lf-toast__progress-bar { background-color: var(--lf-warning); }
.lf-toast--info .lf-toast__progress-bar { background-color: var(--lf-info); }

/* Transitions */
.lf-toast-transition-enter-active,
.lf-toast-transition-leave-active {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.lf-toast-transition-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.lf-toast-transition-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
