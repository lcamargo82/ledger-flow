<template>
  <div class="lf-layout-app">
    <!-- Sidebar -->
    <aside class="lf-sidebar" aria-label="Sidebar">
      <div class="lf-sidebar__brand">
        <h2>LedgerFlow</h2>
      </div>
      <nav class="lf-sidebar__nav">
        <router-link to="/dashboard" class="lf-nav-item">
          {{ t('nav.dashboard') }}
        </router-link>
        <!-- Mock Nav Items -->
        <a href="#" class="lf-nav-item lf-nav-item--disabled" @click.prevent>
          {{ t('nav.payments') }}
        </a>
        <a href="#" class="lf-nav-item lf-nav-item--disabled" @click.prevent>
          {{ t('nav.reconciliation') }}
        </a>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="lf-layout-app__main">
      <!-- Header -->
      <header class="lf-header">
        <LanguageSwitcher />
        <div class="lf-header__user-info">
          <span class="lf-header__name">{{ authStore.userName }}</span>
          <span class="lf-header__email">{{ authStore.userEmail }}</span>
        </div>
        <AppButton variant="secondary" size="small" @click="handleLogout">
          {{ t('common.logout') }}
        </AppButton>
      </header>

      <!-- Page Content -->
      <div class="lf-layout-app__content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useI18n } from '../composables/useI18n';
import AppButton from '../components/common/AppButton.vue';
import LanguageSwitcher from '../components/common/LanguageSwitcher.vue';

const authStore = useAuthStore();
const router = useRouter();
const { t } = useI18n();

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>
