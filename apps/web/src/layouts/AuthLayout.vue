<template>
  <div class="lf-layout-auth">
    <div class="lf-auth-container">
      <div class="lf-auth-hero">
        <img :src="brandAssets.loginHero" alt="" aria-hidden="true" class="lf-hero-img" />
      </div>
      <div class="lf-auth-content">
        <div class="lf-login-card">
          <router-view />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { brandAssets } from '../config/brand';
</script>

<style scoped>
.lf-layout-auth {
  display: flex;
  min-height: 100vh;
  background-color: var(--lf-bg-primary);
}

.lf-auth-container {
  display: flex;
  width: 100%;
  min-height: 100vh;
}

.lf-auth-hero {
  display: none;
  width: 50%;
  background-color: var(--lf-surface-primary);
  position: relative;
  overflow: hidden;
}

.lf-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lf-auth-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--lf-space-4);
  background: radial-gradient(circle at 50% -20%, #1e1b4b 0%, var(--lf-bg-primary) 50%);
}

.lf-login-card {
  width: 100%;
  max-width: 420px;
}

@media (min-width: 1024px) {
  .lf-auth-hero {
    display: block;
  }
}
</style>
