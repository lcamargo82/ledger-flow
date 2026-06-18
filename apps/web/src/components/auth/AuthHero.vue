<template>
  <div class="lf-auth-hero-content">
    <div class="lf-hero-header">
      <BrandMark variant="full" theme="dark" showTagline />
    </div>

    <div class="lf-hero-body">
      <h1 class="lf-hero-headline">
        <span class="lf-headline-line1">{{ t('auth.hero.titleLine1') }}</span>
        <br />
        <span class="lf-headline-highlight">{{ t('auth.hero.titleHighlight') }}</span>
      </h1>
      
      <p class="lf-hero-subheadline">{{ t('auth.hero.subtitle') }}</p>

      <div class="lf-hero-features">
        <FeatureHighlight 
          :icon="ShieldCheck"
          :title="t('auth.hero.features.secure.title')"
          :description="t('auth.hero.features.secure.description')"
        />
        <FeatureHighlight 
          :icon="BadgeCheck"
          :title="t('auth.hero.features.compliant.title')"
          :description="t('auth.hero.features.compliant.description')"
        />
        <FeatureHighlight 
          :icon="TrendingUp"
          :title="t('auth.hero.features.scalable.title')"
          :description="t('auth.hero.features.scalable.description')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import BrandMark from '../common/BrandMark.vue';
import FeatureHighlight from './FeatureHighlight.vue';
import { ShieldCheck, BadgeCheck, TrendingUp } from '@lucide/vue';

const { t } = useI18n();
</script>

<style scoped>
.lf-auth-hero-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--lf-space-12);
  height: 100%;
  padding: var(--lf-space-8) 0;
  color: var(--lf-text-primary);
  max-width: 580px;
}

.lf-hero-header {
  margin-bottom: 0;
}

.lf-hero-body {
  display: flex;
  flex-direction: column;
}

.lf-hero-headline {
  margin: 0 0 var(--lf-space-6) 0;
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.lf-headline-line1 {
  color: #f8fafc; /* Slate 50 */
}

.lf-headline-highlight {
  background: linear-gradient(135deg, var(--lf-cyan) 0%, var(--lf-primary) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--lf-cyan); /* Fallback */
}

.lf-hero-subheadline {
  margin: 0 0 var(--lf-space-8) 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--lf-text-secondary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.lf-hero-features {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-6);
  margin-top: var(--lf-space-4);
}

@media (max-width: 1280px) {
  .lf-auth-hero-content {
    padding: var(--lf-space-8);
  }
  
  .lf-hero-headline {
    font-size: 3rem;
  }
}
</style>
