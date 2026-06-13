<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="lf-layout-app">
    <aside class="lf-sidebar">
      <div class="lf-sidebar__brand">
        <h2>LedgerFlow</h2>
      </div>
      <nav class="lf-sidebar__nav">
        <router-link to="/dashboard" class="lf-nav-item">Dashboard</router-link>
        <div class="lf-nav-item lf-nav-item--disabled" title="Future Feature">Payments</div>
        <div class="lf-nav-item lf-nav-item--disabled" title="Future Feature">Customers</div>
        <div class="lf-nav-item lf-nav-item--disabled" title="Future Feature">Reports</div>
        <div class="lf-nav-item lf-nav-item--disabled" title="Future Feature">Webhooks</div>
        <div class="lf-nav-item lf-nav-item--disabled" title="Future Feature">Settings</div>
      </nav>
    </aside>
    
    <div class="lf-layout-app__main">
      <header class="lf-header">
        <div class="lf-header__user-info" v-if="authStore.user">
          <span class="lf-header__name">{{ authStore.userName }}</span>
          <span class="lf-header__email">{{ authStore.userEmail }}</span>
        </div>
        <button class="lf-button lf-button--secondary lf-button--small" @click="handleLogout">
          Logout
        </button>
      </header>
      
      <main class="lf-layout-app__content">
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>
