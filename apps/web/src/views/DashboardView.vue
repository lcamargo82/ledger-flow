<script setup lang="ts">
import { useAuthStore } from '../stores/auth.store'
import AppCard from '../components/common/AppCard.vue'

const authStore = useAuthStore()
</script>

<template>
  <div class="lf-dashboard-view">
    <div class="lf-page-header">
      <h1>Dashboard</h1>
      <p class="lf-welcome-text">Bem-vindo, {{ authStore.userName }}</p>
    </div>

    <div class="lf-dashboard-grid">
      <AppCard>
        <h3>Authenticated session</h3>
        <div class="lf-card-data">
          <strong>ID:</strong> <span>{{ authStore.user?.id }}</span>
          <br />
          <strong>Session ID:</strong> <span>{{ authStore.user?.sessionId }}</span>
        </div>
      </AppCard>

      <AppCard>
        <h3>Active tenant</h3>
        <div class="lf-card-data">
          <strong>Tenant ID:</strong> <span>{{ authStore.user?.tenantId }}</span>
        </div>
      </AppCard>

      <AppCard>
        <h3>RBAC ready</h3>
        <div class="lf-card-data">
          <strong>Roles:</strong>
          <ul class="lf-tag-list">
            <li v-for="role in authStore.roles" :key="role" class="lf-tag">{{ role }}</li>
          </ul>
          <br />
          <strong>Permissions (sample):</strong>
          <ul class="lf-tag-list">
            <li v-for="perm in authStore.permissions.slice(0, 5)" :key="perm" class="lf-tag">{{ perm }}</li>
            <li v-if="authStore.permissions.length > 5" class="lf-tag">...</li>
          </ul>
        </div>
      </AppCard>

      <AppCard>
        <h3>API connected</h3>
        <div class="lf-card-data">
          <span class="lf-status-indicator lf-status-active"></span> Online
        </div>
      </AppCard>
    </div>
  </div>
</template>
