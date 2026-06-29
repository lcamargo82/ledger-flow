<template>
  <div class="lf-layout-app" :class="{ 'lf-layout-app--collapsed': isCollapsed }">
    <!-- Sidebar -->
    <aside class="lf-sidebar" :class="{ 'lf-sidebar--collapsed': isCollapsed }" aria-label="Sidebar">
      <button class="lf-sidebar-toggle" @click="toggleSidebar" :aria-label="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
        <span class="material-symbols-outlined">{{ isCollapsed ? 'chevron_right' : 'chevron_left' }}</span>
      </button>

      <div class="lf-sidebar__brand">
        <img v-if="!isCollapsed" :src="brandAssets.logoDark" alt="LedgerFlow Logo" class="lf-sidebar-logo" />
        <img v-else :src="brandAssets.appIcon" alt="LF Icon" class="lf-sidebar-logo-icon-img" />
      </div>
      <nav class="lf-sidebar__nav">
        <!-- Section: Operations -->
        <div v-if="authStore.user?.isPlatformAdmin && !isCollapsed" class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-3">
          {{ t('platform.sidebar.operations') }}
        </div>
        <router-link to="/dashboard" class="lf-nav-item" active-class="lf-nav-item--active">
          <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0;">dashboard</span>
          <span class="text" v-show="!isCollapsed">{{ t('nav.dashboard') }}</span>
        </router-link>
        <router-link 
          v-if="authStore.checkAllPermissions(['users:read'])" 
          to="/users" 
          class="lf-nav-item"
          active-class="lf-nav-item--active"
        >
          <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0;">group</span>
          <span class="text" v-show="!isCollapsed">{{ t('nav.users') }}</span>
        </router-link>
        <router-link 
          v-if="authStore.checkAllPermissions(['customers:read'])" 
          to="/customers" 
          class="lf-nav-item"
          active-class="lf-nav-item--active"
        >
          <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0;">person</span>
          <span class="text" v-show="!isCollapsed">{{ t('nav.customers') }}</span>
        </router-link>
        <router-link 
          v-if="authStore.checkAllPermissions(['roles:manage'])" 
          to="/roles" 
          class="lf-nav-item"
          active-class="lf-nav-item--active"
        >
          <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0;">verified_user</span>
          <span class="text" v-show="!isCollapsed">{{ t('nav.roles') }}</span>
        </router-link>
        <router-link 
          v-if="authStore.checkAllPermissions(['permissions:read'])" 
          to="/permissions" 
          class="lf-nav-item"
          active-class="lf-nav-item--active"
        >
          <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0;">key</span>
          <span class="text" v-show="!isCollapsed">{{ t('nav.permissions') }}</span>
        </router-link>
        <router-link 
          v-if="authStore.checkAllPermissions(['tenant:update'])" 
          to="/settings/tenant" 
          class="lf-nav-item"
          active-class="lf-nav-item--active"
        >
          <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0;">account_balance</span>
          <span class="text" v-show="!isCollapsed">{{ t('nav.tenantSettings') }}</span>
        </router-link>
        <router-link 
          v-if="authStore.checkAllPermissions(['payments:read'])" 
          to="/payments" 
          class="lf-nav-item"
          active-class="lf-nav-item--active"
        >
          <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0;">payments</span>
          <span class="text" v-show="!isCollapsed">{{ t('nav.payments') }}</span>
        </router-link>
        <a href="#" class="lf-nav-item lf-nav-item--disabled" @click.prevent>
          <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0;">account_tree</span>
          <span class="text" v-show="!isCollapsed">{{ t('nav.reconciliation') }}</span>
        </a>

        <!-- Platform Admin Menu -->
        <div v-if="authStore.user?.isPlatformAdmin" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div v-if="!isCollapsed" class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-3">
            {{ t('platform.sidebar.platform') }}
          </div>
          <router-link 
            to="/platform/tenants" 
            class="lf-nav-item"
            active-class="lf-nav-item--active"
          >
            <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0;">domain</span>
            <span class="text" v-show="!isCollapsed">{{ t('platform.sidebar.tenants') }}</span>
          </router-link>
          <router-link 
            v-if="authStore.checkAllPermissions(['platform:audit:read'])"
            to="/platform/audit" 
            class="lf-nav-item"
            active-class="lf-nav-item--active"
          >
            <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0;">history</span>
            <span class="text" v-show="!isCollapsed">{{ t('platform.sidebar.audit') }}</span>
          </router-link>
        </div>
      </nav>

      <div class="lf-sidebar__footer">
        <LanguageSwitcher v-show="!isCollapsed" />
        <div class="lf-sidebar__user" :class="{ 'lf-sidebar__user--collapsed': isCollapsed }">
          <div class="lf-sidebar__avatar">{{ authStore.userName.charAt(0).toUpperCase() }}</div>
          <div class="lf-sidebar__user-info" v-show="!isCollapsed">
            <span class="lf-sidebar__user-name">{{ authStore.userName }}</span>
            <span class="lf-sidebar__user-email">{{ authStore.userEmail }}</span>
          </div>
        </div>
        <button class="lf-sidebar__logout" @click="handleLogout" :aria-label="t('common.logout')" :class="{ 'lf-sidebar__logout--collapsed': isCollapsed }">
          <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0;">logout</span>
          <span class="text" v-show="!isCollapsed">{{ t('common.logout') }}</span>
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useConfirmDialogStore } from '../stores/confirm-dialog.store';
import { useI18n } from '../composables/useI18n';
import { brandAssets } from '../config/brand';
import AppButton from '../components/common/AppButton.vue';
import LanguageSwitcher from '../components/common/LanguageSwitcher.vue';

const isCollapsed = ref(false);
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

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
