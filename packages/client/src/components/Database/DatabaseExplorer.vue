<template>
  <div class="database-explorer">
    <!-- Left Sidebar: Schema Browser -->
    <div class="explorer-sidebar">
      <div class="sidebar-header">
        <h3>📊 Database</h3>
        <button class="btn-icon" @click="refresh" :disabled="loading">
          <span class="material-icons">refresh</span>
        </button>
      </div>

      <!-- Database Selector -->
      <div class="database-selector">
        <select v-model="selectedDatabase" @change="onDatabaseChange" class="form-control">
          <option v-for="db in databases" :key="db" :value="db">
            {{ db }}
          </option>
        </select>
      </div>

      <!-- Schema/Tables Tree -->
      <div class="tree-view">
        <div v-if="loading" class="loading-state">
          <div class="spinner-small"></div>
          <span>Loading...</span>
        </div>

        <div v-else-if="error" class="error-state">
          {{ error }}
        </div>

        <div v-else>
          <!-- Schemas -->
          <div v-for="schema in schemas" :key="schema" class="tree-node">
            <div class="tree-node-header" @click="toggleSchema(schema)">
              <span class="material-icons">{{ expandedSchemas[schema] ? 'expand_more' : 'chevron_right' }}</span>
              <span class="material-icons">folder</span>
              <span>{{ schema }}</span>
            </div>

            <!-- Tables in Schema -->
            <div v-if="expandedSchemas[schema]" class="tree-node-children">
              <div
                v-for="table in getTablesForSchema(schema)"
                :key="table.name"
                class="tree-node-item"
                :class="{ active: selectedTable?.name === table.name }"
                @click="selectTable(table, schema)"
              >
                <span class="material-icons">table_chart</span>
                <span>{{ table.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content: Table View -->
    <div class="explorer-main">
      <div v-if="!selectedTable" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No Table Selected</h3>
        <p>Select a table from the sidebar to view its data</p>
      </div>

      <div v-else class="table-view">
        <!-- Table Header -->
        <div class="table-header">
          <div>
            <h2>{{ selectedTable.name }}</h2>
            <p class="table-schema">Schema: {{ currentSchema }}</p>
          </div>
          <div class="table-actions">
            <button class="btn btn-small" @click="showTableInfo">
              <span class="material-icons">info</span>
              Info
            </button>
            <button class="btn btn-small" @click="refreshTableData">
              <span class="material-icons">refresh</span>
              Refresh
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab"
            :class="{ active: activeTab === 'data' }"
            @click="activeTab = 'data'"
          >
            Data
          </button>
          <button
            class="tab"
            :class="{ active: activeTab === 'structure' }"
            @click="activeTab = 'structure'"
          >
            Structure
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Data Tab -->
          <div v-if="activeTab === 'data'" class="data-view">
            <div v-if="loadingTableData" class="loading-overlay">
              <div class="spinner"></div>
              <p>Loading data...</p>
            </div>

            <div v-else-if="tableData.length === 0" class="empty-data">
              <p>No data in this table</p>
            </div>

            <div v-else class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th v-for="column in tableColumns" :key="column">
                      {{ column }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in tableData" :key="index">
                    <td v-for="column in tableColumns" :key="column">
                      {{ formatValue(row[column]) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="pagination">
              <button
                class="btn btn-small"
                @click="prevPage"
                :disabled="currentPage === 0"
              >
                Previous
              </button>
              <span class="page-info">
                Page {{ currentPage + 1 }} ({{ tableData.length }} rows)
              </span>
              <button
                class="btn btn-small"
                @click="nextPage"
                :disabled="tableData.length < pageSize"
              >
                Next
              </button>
            </div>
          </div>

          <!-- Structure Tab -->
          <div v-if="activeTab === 'structure'" class="structure-view">
            <div v-if="loadingStructure" class="loading-overlay">
              <div class="spinner"></div>
              <p>Loading structure...</p>
            </div>

            <div v-else class="structure-table-wrapper">
              <table class="structure-table">
                <thead>
                  <tr>
                    <th>Column Name</th>
                    <th>Data Type</th>
                    <th>Nullable</th>
                    <th>Default</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="column in structureData" :key="column.columnName">
                    <td>
                      <strong>{{ column.columnName }}</strong>
                    </td>
                    <td>{{ column.dataType }}</td>
                    <td>{{ column.nullable ? 'Yes' : 'No' }}</td>
                    <td>{{ column.defaultValue || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'DatabaseExplorer',

  data() {
    return {
      databases: [] as string[],
      schemas: [] as string[],
      tables: [] as any[],
      selectedDatabase: '',
      expandedSchemas: {} as Record<string, boolean>,
      selectedTable: null as any,
      currentSchema: '',
      activeTab: 'data' as 'data' | 'structure',
      tableData: [] as any[],
      structureData: [] as any[],
      currentPage: 0,
      pageSize: 100,
      loading: false,
      loadingTableData: false,
      loadingStructure: false,
      error: null as string | null
    };
  },

  computed: {
    tableColumns(): string[] {
      if (this.tableData.length === 0) return [];
      return Object.keys(this.tableData[0]);
    }
  },

  async mounted() {
    await this.loadDatabases();
  },

  methods: {
    async loadDatabases() {
      this.loading = true;
      this.error = null;

      try {
        this.databases = await this.$api.send('conn/listDatabases', { filter: {} });

        if (this.databases.length > 0) {
          this.selectedDatabase = this.databases[0];
          await this.loadSchemas();
        }
      } catch (err: any) {
        this.error = err.message || 'Failed to load databases';
      } finally {
        this.loading = false;
      }
    },

    async loadSchemas() {
      this.loading = true;
      this.error = null;

      try {
        this.schemas = await this.$api.send('conn/listSchemas', { filter: {} });

        // Auto-expand first schema
        if (this.schemas.length > 0) {
          const firstSchema = this.schemas[0];
          Vue.set(this.expandedSchemas, firstSchema, true);
          await this.loadTablesForSchema(firstSchema);
        }
      } catch (err: any) {
        this.error = err.message || 'Failed to load schemas';
      } finally {
        this.loading = false;
      }
    },

    async loadTablesForSchema(schema: string) {
      try {
        const tables = await this.$api.send('conn/listTables', {
          filter: { schema }
        });

        // Store tables with schema reference
        this.tables = [...this.tables, ...tables.map((t: any) => ({ ...t, schema }))];
      } catch (err: any) {
        console.error('Failed to load tables:', err);
      }
    },

    async toggleSchema(schema: string) {
      const isExpanded = this.expandedSchemas[schema];

      Vue.set(this.expandedSchemas, schema, !isExpanded);

      if (!isExpanded && !this.getTablesForSchema(schema).length) {
        await this.loadTablesForSchema(schema);
      }
    },

    getTablesForSchema(schema: string): any[] {
      return this.tables.filter(t => t.schema === schema);
    },

    async selectTable(table: any, schema: string) {
      this.selectedTable = table;
      this.currentSchema = schema;
      this.currentPage = 0;

      // Load data
      await this.loadTableData();

      // Load structure if on structure tab
      if (this.activeTab === 'structure') {
        await this.loadTableStructure();
      }
    },

    async loadTableData() {
      this.loadingTableData = true;

      try {
        const response = await this.$api.send('conn/selectTop', {
          table: this.selectedTable.name,
          schema: this.currentSchema,
          offset: this.currentPage * this.pageSize,
          limit: this.pageSize
        });

        this.tableData = response.rows || response || [];
      } catch (err: any) {
        console.error('Failed to load table data:', err);
        this.tableData = [];
      } finally {
        this.loadingTableData = false;
      }
    },

    async loadTableStructure() {
      this.loadingStructure = true;

      try {
        this.structureData = await this.$api.send('conn/listTableColumns', {
          table: this.selectedTable.name,
          schema: this.currentSchema
        });
      } catch (err: any) {
        console.error('Failed to load table structure:', err);
        this.structureData = [];
      } finally {
        this.loadingStructure = false;
      }
    },

    async onDatabaseChange() {
      // In a full implementation, would change database
      await this.loadSchemas();
    },

    async refresh() {
      this.tables = [];
      this.expandedSchemas = {};
      await this.loadSchemas();
    },

    async refreshTableData() {
      await this.loadTableData();
    },

    async prevPage() {
      if (this.currentPage > 0) {
        this.currentPage--;
        await this.loadTableData();
      }
    },

    async nextPage() {
      this.currentPage++;
      await this.loadTableData();
    },

    showTableInfo() {
      if (this.activeTab !== 'structure') {
        this.activeTab = 'structure';
        this.loadTableStructure();
      }
    },

    formatValue(value: any): string {
      if (value === null) return 'NULL';
      if (value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    }
  },

  watch: {
    activeTab(newTab) {
      if (newTab === 'structure' && this.selectedTable && this.structureData.length === 0) {
        this.loadTableStructure();
      }
    }
  }
});
</script>

<style scoped>
.database-explorer {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.explorer-sidebar {
  width: 300px;
  background: #f8f9fa;
  border-right: 1px solid #dee2e6;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.btn-icon {
  padding: 6px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
}

.btn-icon .material-icons {
  font-size: 20px;
}

.database-selector {
  padding: 12px;
  border-bottom: 1px solid #dee2e6;
}

.tree-view {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.tree-node {
  margin: 4px 0;
}

.tree-node-header {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.tree-node-header:hover {
  background: rgba(0, 0, 0, 0.05);
}

.tree-node-header .material-icons {
  font-size: 18px;
  color: #666;
}

.tree-node-children {
  margin-left: 24px;
}

.tree-node-item {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.tree-node-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.tree-node-item.active {
  background: #667eea;
  color: white;
}

.tree-node-item.active .material-icons {
  color: white;
}

.tree-node-item .material-icons {
  font-size: 18px;
  color: #666;
}

.loading-state,
.error-state {
  padding: 20px;
  text-align: center;
  color: #666;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

.explorer-main {
  flex: 1;
  overflow: hidden;
  background: white;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.table-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.table-header {
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-header h2 {
  margin: 0 0 5px 0;
  font-size: 24px;
}

.table-schema {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.table-actions {
  display: flex;
  gap: 10px;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #dee2e6;
  padding: 0 20px;
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
}

.tab:hover {
  color: #333;
}

.tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.tab-content {
  flex: 1;
  overflow: hidden;
}

.data-view,
.structure-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-wrapper,
.structure-table-wrapper {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.data-table,
.structure-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td,
.structure-table th,
.structure-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

.data-table th,
.structure-table th {
  background: #f8f9fa;
  font-weight: 600;
  position: sticky;
  top: 0;
}

.data-table td,
.structure-table td {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.pagination {
  padding: 16px 20px;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-info {
  color: #666;
  font-size: 14px;
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
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

.empty-data {
  text-align: center;
  padding: 40px;
  color: #666;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-small .material-icons {
  font-size: 16px;
}

.btn:hover:not(:disabled) {
  opacity: 0.8;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Material Icons Font (if not already included) */
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');
</style>
