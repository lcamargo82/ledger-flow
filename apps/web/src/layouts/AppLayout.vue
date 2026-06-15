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
        <router-link 
          v-if="authStore.checkAllPermissions(['users:read'])" 
          to="/users" 
          class="lf-nav-item"
          active-class="lf-nav-item--active"
        >
          {{ t('nav.users') }}
        </router-link>
        <router-link 
          v-if="authStore.checkAllPermissions(['roles:manage'])" 
          to="/roles" 
          class="lf-nav-item"
          active-class="lf-nav-item--active"
        >
          {{ t('nav.roles') }}
        </router-link>
        <router-link 
          v-if="authStore.checkAllPermissions(['permissions:read'])" 
          to="/permissions" 
          class="lf-nav-item"
          active-class="lf-nav-item--active"
        >
          {{ t('nav.permissions') }}
        </router-link>
        <router-link 
          v-if="authStore.checkAllPermissions(['tenant:update'])" 
          to="/settings/tenant" 
          class="lf-nav-item"
          active-class="lf-nav-item--active"
        >
          {{ t('nav.tenantSettings') }}
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
import { useConfirmDialogStore } from '../stores/confirm-dialog.store';
import { useI18n } from '../composables/useI18n';
import AppButton from '../components/common/AppButton.vue';
import LanguageSwitcher from '../components/common/LanguageSwitcher.vue';

const authStore = useAuthStore();
const confirmDialogStore = useConfirmDialogStore();
const router = useRouter();
const { t } = useI18n();

const handleLogout = () => {
  confirmDialogStore.open({
    title: t('modal.confirmLogoutTitle'),
    message: t('modal.confirmLogoutMessage'),
    confirmText: t('common.logout'),
    confirmLoadingText: t('common.loggingOut'),
    cancelText: t('common.cancel'),
    confirmVariant: 'danger',
    onConfirm: async () => {
      await authStore.logout();
      router.push('/login');
    },
    onCancel: null
  });
};
</script>
