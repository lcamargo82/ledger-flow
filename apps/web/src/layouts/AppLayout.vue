<template>
  <div class="lf-layout-app">
    <!-- Sidebar -->
    <aside class="lf-sidebar" aria-label="Sidebar">
      <div class="lf-sidebar__brand">
        <img :src="brandAssets.logoDark" alt="LedgerFlow Logo" class="lf-sidebar-logo" />
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

      <div class="lf-sidebar__footer">
        <LanguageSwitcher />
        <div class="lf-sidebar__user">
          <div class="lf-sidebar__avatar">{{ authStore.userName.charAt(0).toUpperCase() }}</div>
          <div class="lf-sidebar__user-info">
            <span class="lf-sidebar__user-name">{{ authStore.userName }}</span>
            <span class="lf-sidebar__user-email">{{ authStore.userEmail }}</span>
          </div>
        </div>
        <button class="lf-sidebar__logout" @click="handleLogout" :aria-label="t('common.logout')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
          </svg>
          {{ t('common.logout') }}
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="lf-layout-app__main">

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
import { brandAssets } from '../config/brand';
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

<style scoped>
.lf-sidebar-logo {
  max-width: 180px;
  height: auto;
}
</style>
