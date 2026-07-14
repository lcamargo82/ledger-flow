<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import { useI18n } from '../../composables/useI18n'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue: boolean
  title: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const { t } = useI18n()
const titleId = `lf-drawer-title-${useId()}`
const closeButton = ref<HTMLButtonElement | null>(null)

const close = () => emit('update:modelValue', false)
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.modelValue) close()
}

watch(
  () => props.modelValue,
  async (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    if (isOpen) {
      await nextTick()
      closeButton.value?.focus()
    }
  },
)

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="lf-drawer">
      <div v-if="modelValue" class="lf-drawer-overlay" @click.self="close">
        <aside
          class="lf-drawer-panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          v-bind="$attrs"
        >
          <header class="lf-drawer-header">
            <h2 :id="titleId" class="lf-drawer-title">{{ title }}</h2>
            <button
              ref="closeButton"
              type="button"
              class="lf-drawer-close"
              :aria-label="t('common.close')"
              @click="close"
            >
              <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </header>
          <div class="lf-drawer-body">
            <slot />
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lf-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  background: rgb(0 0 0 / 58%);
}

.lf-drawer-panel {
  display: flex;
  width: min(100%, 36rem);
  height: 100%;
  flex-direction: column;
  border-left: 1px solid var(--lf-border-primary);
  background: var(--lf-bg-card);
  box-shadow: -20px 0 40px rgb(0 0 0 / 25%);
  overscroll-behavior: contain;
}

.lf-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--lf-space-4);
  padding: var(--lf-space-5) var(--lf-space-6);
  border-bottom: 1px solid var(--lf-border-primary);
}

.lf-drawer-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--lf-text-primary);
}

.lf-drawer-close {
  display: inline-flex;
  min-width: 2.75rem;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--lf-radius);
  background: transparent;
  color: var(--lf-text-secondary);
  cursor: pointer;
}

.lf-drawer-close:hover,
.lf-drawer-close:focus-visible {
  background: var(--lf-surface-secondary);
  color: var(--lf-text-primary);
  outline: 2px solid var(--lf-primary);
  outline-offset: 2px;
}

.lf-drawer-body {
  overflow-y: auto;
  padding: var(--lf-space-6);
}

.lf-drawer-enter-active,
.lf-drawer-leave-active {
  transition: opacity 180ms ease;
}

.lf-drawer-enter-active .lf-drawer-panel,
.lf-drawer-leave-active .lf-drawer-panel {
  transition: transform 180ms ease;
}

.lf-drawer-enter-from,
.lf-drawer-leave-to {
  opacity: 0;
}

.lf-drawer-enter-from .lf-drawer-panel,
.lf-drawer-leave-to .lf-drawer-panel {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .lf-drawer-enter-active,
  .lf-drawer-leave-active,
  .lf-drawer-enter-active .lf-drawer-panel,
  .lf-drawer-leave-active .lf-drawer-panel {
    transition: none;
  }
}
</style>
