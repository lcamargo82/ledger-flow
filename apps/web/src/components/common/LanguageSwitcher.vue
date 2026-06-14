<template>
  <div class="lf-lang-switcher">
    <button 
      class="lf-lang-btn" 
      :class="{ 'is-active': currentLocale === 'pt-BR' }" 
      @click="setLocale('pt-BR')"
      aria-label="Mudar para Português"
    >
      PT
    </button>
    <span class="lf-lang-divider">|</span>
    <button 
      class="lf-lang-btn" 
      :class="{ 'is-active': currentLocale === 'en-US' }" 
      @click="setLocale('en-US')"
      aria-label="Switch to English"
    >
      EN
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';

const { currentLocale, setLocale } = useI18n();
</script>

<style scoped>
.lf-lang-switcher {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: var(--lf-radius);
  border: 1px solid var(--lf-border);
}
.lf-lang-btn {
  background: transparent;
  border: none;
  color: var(--lf-text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.125rem;
  transition: all 0.2s;
}
.lf-lang-btn:hover {
  color: var(--lf-text-primary);
}
.lf-lang-btn.is-active {
  color: var(--lf-text-primary);
  background: var(--lf-primary-light);
}
.lf-lang-divider {
  color: var(--lf-border);
  margin: 0 0.125rem;
  font-size: 0.75rem;
  user-select: none;
}
</style>
