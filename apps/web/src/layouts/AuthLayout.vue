<template>
  <div class="lf-layout-auth" :style="{ backgroundImage: `url(${brandAssets.heroBg})` }">
    <div class="lf-auth-overlay"></div>
    <div class="lf-auth-grid">
      <div class="lf-auth-hero-col">
        <AuthHero class="lf-auth-hero-component" />
      </div>
      <div class="lf-auth-form-col">
        <div class="lf-login-card">
          <router-view />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { brandAssets } from '../config/brand';
import AuthHero from '../components/auth/AuthHero.vue';
</script>

<style scoped>
.lf-layout-auth {
  position: relative;
  min-height: 100vh;
  width: 100vw;
  background-color: var(--lf-bg-primary);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-x: hidden;
}

.lf-auth-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.45) 0%, rgba(9, 9, 11, 0.85) 100%);
  z-index: 1;
  pointer-events: none;
}

.lf-auth-grid {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1280px;
  min-height: 100vh;
  padding: var(--lf-space-6) var(--lf-space-4);
  margin: 0 auto;
}

.lf-auth-hero-col {
  display: none;
  flex: 1.2; /* Approximately 55% */
  align-items: center;
  padding-right: var(--lf-space-8);
}

.lf-auth-form-col {
  flex: 1; /* Approximately 45% */
  display: flex;
  align-items: center;
  justify-content: center;
}

.lf-login-card {
  width: 100%;
  max-width: 480px; /* Comfortably wide */
  position: relative;
}

/* Subtle glow behind the login card to separate it nicely */
.lf-login-card::before {
  content: '';
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  background: radial-gradient(circle at center, rgba(6, 182, 212, 0.10) 0%, transparent 60%);
  z-index: -1;
  border-radius: 50%;
  filter: blur(20px);
  pointer-events: none;
}

/* Glassmorphism corporativo premium */
.lf-login-card :deep(.lf-card) {
  padding: 2.5rem; /* ~40px */
  background-color: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 18px;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(79, 70, 229, 0.08),
    0 0 80px rgba(6, 182, 212, 0.08);
}

@media (min-width: 1024px) {
  .lf-auth-grid {
    flex-direction: row;
    align-items: center;
    padding: var(--lf-space-12) var(--lf-space-8);
    min-height: auto;
  }
  
  .lf-auth-hero-col {
    display: flex;
  }
  
  .lf-auth-form-col {
    justify-content: flex-end;
  }
}
</style>
