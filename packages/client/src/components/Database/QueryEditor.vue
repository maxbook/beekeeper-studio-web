<template>
  <div class="query-editor">
    <div class="editor-container">
      <!-- Editor Toolbar -->
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <h3>✏️ Query Editor</h3>
        </div>
        <div class="toolbar-right">
          <button
            class="btn btn-primary"
            @click="executeQuery"
            :disabled="isExecuting || !query.trim()"
          >
            <span class="material-icons">play_arrow</span>
            <span v-if="isExecuting">Executing...</span>
            <span v-else>Run Query</span>
          </button>
        </div>
      </div>

      <!-- SQL Editor -->
      <div class="sql-editor">
        <textarea
          v-model="query"
          class="sql-textarea"
          placeholder="Enter your SQL query here...

Example:
SELECT * FROM users LIMIT 10;
SELECT version();
"
          @keydown.ctrl.enter.prevent="executeQuery"
          @keydown.meta.enter.prevent="executeQuery"
        ></textarea>
        <div class="editor-hint">
          <span class="material-icons">info</span>
          Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (or <kbd>⌘</kbd> + <kbd>Enter</kbd>) to run
        </div>
      </div>

      <!-- Results Section -->
      <div class="results-section">
        <!-- Tabs -->
        <div class="results-tabs">
          <button
            class="tab"
            :class="{ active: activeTab === 'results' }"
            @click="activeTab = 'results'"
          >
            Results
            <span v-if="results.length > 0" class="badge">{{ results.length }}</span>
          </button>
          <button
            class="tab"
            :class="{ active: activeTab === 'messages' }"
            @click="activeTab = 'messages'"
          >
            Messages
            <span v-if="messages.length > 0" class="badge">{{ messages.length }}</span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Results Tab -->
          <div v-if="activeTab === 'results'" class="results-content">
            <div v-if="isExecuting" class="loading-state">
              <div class="spinner"></div>
              <p>Executing query...</p>
            </div>

            <div v-else-if="error" class="error-state">
              <div class="error-icon">❌</div>
              <h4>Query Error</h4>
              <pre class="error-message">{{ error }}</pre>
            </div>

            <div v-else-if="results.length === 0 && !executionTime" class="empty-state">
              <div class="empty-icon">📊</div>
              <p>No results yet. Run a query to see results here.</p>
            </div>

            <div v-else-if="results.length === 0" class="empty-results">
              <p>Query executed successfully but returned no results.</p>
              <p class="success-info">
                ✓ Execution time: {{ executionTime }}ms
                <span v-if="affectedRows !== null">• Affected rows: {{ affectedRows }}</span>
              </p>
            </div>

            <div v-else class="results-table-wrapper">
              <!-- Results Info -->
              <div class="results-info">
                <div>
                  <strong>{{ results.length }}</strong> rows returned
                  <span v-if="executionTime" class="text-muted">
                    • Execution time: {{ executionTime }}ms
                  </span>
                </div>
                <div class="results-actions">
                  <button class="btn btn-small" @click="exportResults">
                    <span class="material-icons">download</span>
                    Export CSV
                  </button>
                </div>
              </div>

              <!-- Results Table -->
              <table class="results-table">
                <thead>
                  <tr>
                    <th v-for="column in resultColumns" :key="column">
                      {{ column }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in results" :key="index">
                    <td v-for="column in resultColumns" :key="column">
                      <div class="cell-content">
                        {{ formatCellValue(row[column]) }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Messages Tab -->
          <div v-if="activeTab === 'messages'" class="messages-content">
            <div v-if="messages.length === 0" class="empty-state">
              <div class="empty-icon">💬</div>
              <p>No messages</p>
            </div>

            <div v-else class="messages-list">
              <div
                v-for="(message, index) in messages"
                :key="index"
                class="message-item"
                :class="message.type"
              >
                <div class="message-icon">
                  <span class="material-icons">
                    {{ message.type === 'error' ? 'error' : message.type === 'warning' ? 'warning' : 'info' }}
                  </span>
                </div>
                <div class="message-content">
                  <div class="message-text">{{ message.text }}</div>
                  <div class="message-time">{{ message.time }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

interface Message {
  type: 'info' | 'warning' | 'error';
  text: string;
  time: string;
}

export default Vue.extend({
  name: 'QueryEditor',

  data() {
    return {
      query: '',
      results: [] as any[],
      isExecuting: false,
      error: null as string | null,
      executionTime: null as number | null,
      affectedRows: null as number | null,
      activeTab: 'results' as 'results' | 'messages',
      messages: [] as Message[]
    };
  },

  computed: {
    resultColumns(): string[] {
      if (this.results.length === 0) return [];
      return Object.keys(this.results[0]);
    }
  },

  methods: {
    async executeQuery() {
      if (!this.query.trim()) {
        this.addMessage('error', 'Please enter a query');
        return;
      }

      this.isExecuting = true;
      this.error = null;
      this.results = [];
      this.executionTime = null;
      this.affectedRows = null;

      const startTime = Date.now();

      try {
        const response = await this.$api.send('conn/executeQuery', {
          query: this.query
        });

        this.executionTime = Date.now() - startTime;

        // Handle different response formats
        if (Array.isArray(response)) {
          this.results = response;
        } else if (response.rows) {
          this.results = response.rows;
          this.affectedRows = response.affectedRows || null;
        } else if (response.result) {
          this.results = response.result;
        } else {
          this.results = [response];
        }

        this.addMessage('info', `Query executed successfully in ${this.executionTime}ms`);
        this.activeTab = 'results';
      } catch (err: any) {
        this.error = err.message || 'Query execution failed';
        this.addMessage('error', this.error);
        this.activeTab = 'messages';
      } finally {
        this.isExecuting = false;
      }
    },

    formatCellValue(value: any): string {
      if (value === null) return 'NULL';
      if (value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return String(value);
        }
      }
      return String(value);
    },

    addMessage(type: 'info' | 'warning' | 'error', text: string) {
      this.messages.push({
        type,
        text,
        time: new Date().toLocaleTimeString()
      });
    },

    exportResults() {
      if (this.results.length === 0) return;

      // Create CSV
      const columns = this.resultColumns;
      const csvRows = [
        columns.join(','), // Header
        ...this.results.map(row =>
          columns.map(col => {
            const value = row[col];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ];

      const csv = csvRows.join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query-results-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      this.addMessage('info', 'Results exported to CSV');
    }
  }
});
</script>

<style scoped>
.query-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-toolbar {
  padding: 16px 20px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

.toolbar-left h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.sql-editor {
  border-bottom: 1px solid #dee2e6;
  position: relative;
}

.sql-textarea {
  width: 100%;
  min-height: 200px;
  padding: 20px;
  border: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  background: #fafafa;
}

.sql-textarea:focus {
  background: white;
}

.editor-hint {
  padding: 8px 20px;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
}

.editor-hint .material-icons {
  font-size: 16px;
}

.editor-hint kbd {
  padding: 2px 6px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-family: monospace;
  font-size: 11px;
}

.results-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.results-tabs {
  display: flex;
  border-bottom: 1px solid #dee2e6;
  padding: 0 20px;
  background: #f8f9fa;
}

.tab {
  padding: 12px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab:hover {
  color: #333;
}

.tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.badge {
  background: #667eea;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.tab.active .badge {
  background: white;
  color: #667eea;
}

.tab-content {
  flex: 1;
  overflow: hidden;
}

.results-content,
.messages-content {
  height: 100%;
  overflow: auto;
}

.loading-state,
.empty-state,
.error-state,
.empty-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  padding: 40px;
}

.empty-icon,
.error-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: #fee;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #c33;
  color: #c33;
  font-family: monospace;
  font-size: 13px;
  white-space: pre-wrap;
  max-width: 600px;
}

.success-info {
  color: #3c3;
  margin-top: 10px;
}

.results-table-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.results-info {
  padding: 12px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.text-muted {
  color: #666;
}

.results-actions {
  display: flex;
  gap: 8px;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  overflow: auto;
}

.results-table th,
.results-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

.results-table th {
  background: #f8f9fa;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}

.results-table td {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.cell-content {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.messages-list {
  padding: 20px;
}

.message-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  border-left: 4px solid;
}

.message-item.info {
  background: #e3f2fd;
  border-left-color: #2196f3;
}

.message-item.warning {
  background: #fff3e0;
  border-left-color: #ff9800;
}

.message-item.error {
  background: #ffebee;
  border-left-color: #f44336;
}

.message-icon .material-icons {
  font-size: 20px;
}

.message-item.info .material-icons {
  color: #2196f3;
}

.message-item.warning .material-icons {
  color: #ff9800;
}

.message-item.error .material-icons {
  color: #f44336;
}

.message-content {
  flex: 1;
}

.message-text {
  font-size: 14px;
  margin-bottom: 4px;
}

.message-time {
  font-size: 12px;
  color: #666;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  background: white;
  border: 1px solid #ddd;
  color: #333;
}

.btn-small:hover:not(:disabled) {
  background: #f8f9fa;
}

.btn-small .material-icons {
  font-size: 16px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@import url('https://fonts.googleapis.com/icon?family=Material+Icons');
</style>
