<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { healthService } from '../services/health.service';

const loading = ref(false);
const error = ref<string | null>(null);

const apiRoot = ref<any>(null);
const apiHealth = ref<any>(null);
const apiLiveness = ref<any>(null);
const apiReadiness = ref<any>(null);

const checkHealth = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const [rootRes, healthRes, livenessRes, readinessRes] = await Promise.all([
      healthService.getRoot(),
      healthService.getHealth(),
      healthService.getLiveness(),
      healthService.getReadiness()
    ]);
    
    apiRoot.value = rootRes.data;
    apiHealth.value = healthRes.data;
    apiLiveness.value = livenessRes.data;
    apiReadiness.value = readinessRes.data;
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch API status';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  checkHealth();
});
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>LedgerFlow</h1>
      <p class="subtitle">B2B Multitenant Platform</p>
    </header>

    <div class="main-content">
      <div class="status-summary" v-if="apiRoot">
        <div class="summary-item">
          <strong>API Status:</strong>
          <span :class="['badge', apiRoot.status === 'running' ? 'badge-success' : 'badge-error']">
            {{ apiRoot.status }}
          </span>
        </div>
        <div class="summary-item">
          <strong>Environment:</strong>
          <span class="badge badge-info">{{ apiRoot.environment }}</span>
        </div>
        <div class="summary-item">
          <strong>Timestamp:</strong>
          <span>{{ new Date(apiRoot.timestamp).toLocaleString() }}</span>
        </div>
      </div>

      <div class="actions">
        <button @click="checkHealth" :disabled="loading" class="btn">
          {{ loading ? 'Checking...' : 'Check API Health' }}
        </button>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="cards-grid" v-if="!loading && !error">
        <div class="card">
          <h3>API Root</h3>
          <pre>{{ JSON.stringify(apiRoot, null, 2) }}</pre>
        </div>
        <div class="card">
          <h3>Health</h3>
          <pre>{{ JSON.stringify(apiHealth, null, 2) }}</pre>
        </div>
        <div class="card">
          <h3>Liveness</h3>
          <pre>{{ JSON.stringify(apiLiveness, null, 2) }}</pre>
        </div>
        <div class="card">
          <h3>Readiness</h3>
          <pre>{{ JSON.stringify(apiReadiness, null, 2) }}</pre>
        </div>
      </div>
      
      <div v-else-if="loading" class="loading-state">
        <p>Fetching data from API...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  font-size: 1.2rem;
}

.main-content {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.status-summary {
  display: flex;
  justify-content: space-around;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 500;
  text-transform: uppercase;
}

.badge-success {
  background: #d4edda;
  color: #155724;
}

.badge-error {
  background: #f8d7da;
  color: #721c24;
}

.badge-info {
  background: #cce5ff;
  color: #004085;
}

.actions {
  text-align: center;
  margin-bottom: 2rem;
}

.btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn:hover:not(:disabled) {
  background: #0056b3;
}

.btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 2rem;
  text-align: center;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.card h3 {
  margin-top: 0;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

pre {
  background: #f1f3f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.9rem;
  color: #333;
}

.loading-state {
  text-align: center;
  color: #666;
  font-size: 1.2rem;
  padding: 2rem;
}
</style>
