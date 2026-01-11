<template>
  <div class="connection-page">
    <div class="connection-container">
      <!-- Header -->
      <div class="connection-header">
        <h2>🔌 Database Connection</h2>
        <p class="subtitle">Connect to your database</p>
      </div>

      <!-- Connection Form -->
      <div class="connection-form-card">
        <form @submit.prevent="handleConnect">
          <!-- Database Type -->
          <div class="form-group">
            <label for="dbType">Database Type</label>
            <select
              id="dbType"
              v-model="connectionConfig.connectionType"
              class="form-control"
              required
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite</option>
              <option value="sqlserver">SQL Server</option>
              <option value="mongodb">MongoDB</option>
            </select>
          </div>

          <!-- Host -->
          <div class="form-group" v-if="requiresHost">
            <label for="host">Host</label>
            <input
              id="host"
              v-model="connectionConfig.host"
              type="text"
              class="form-control"
              placeholder="localhost"
              required
            />
          </div>

          <!-- Port -->
          <div class="form-group" v-if="requiresHost">
            <label for="port">Port</label>
            <input
              id="port"
              v-model.number="connectionConfig.port"
              type="number"
              class="form-control"
              :placeholder="defaultPort"
              required
            />
          </div>

          <!-- Username -->
          <div class="form-group" v-if="requiresAuth">
            <label for="username">Username</label>
            <input
              id="username"
              v-model="connectionConfig.username"
              type="text"
              class="form-control"
              placeholder="postgres"
              autocomplete="username"
            />
          </div>

          <!-- Password -->
          <div class="form-group" v-if="requiresAuth">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="connectionConfig.password"
              type="password"
              class="form-control"
              placeholder="••••••••"
              autocomplete="current-password"
            />
          </div>

          <!-- Database Name -->
          <div class="form-group">
            <label for="database">Database Name</label>
            <input
              id="database"
              v-model="connectionConfig.defaultDatabase"
              type="text"
              class="form-control"
              placeholder="postgres"
              required
            />
          </div>

          <!-- SQLite File Path (if SQLite) -->
          <div class="form-group" v-if="connectionConfig.connectionType === 'sqlite'">
            <label for="filePath">SQLite File Path</label>
            <div class="file-input-group">
              <input
                id="filePath"
                v-model="connectionConfig.socketPath"
                type="text"
                class="form-control"
                placeholder="/path/to/database.db"
              />
              <label for="file-upload" class="btn btn-outline">
                Browse
              </label>
              <input
                id="file-upload"
                type="file"
                @change="handleFileSelect"
                accept=".db,.sqlite,.sqlite3"
                style="display: none"
              />
            </div>
          </div>

          <!-- Error Display -->
          <div v-if="error" class="error-alert">
            <strong>Connection Error:</strong><br/>
            {{ error }}
          </div>

          <!-- Success Display -->
          <div v-if="success" class="success-alert">
            <strong>✓ Connected successfully!</strong>
          </div>

          <!-- Action Buttons -->
          <div class="button-group">
            <button
              type="button"
              class="btn btn-outline"
              @click="testConnection"
              :disabled="isConnecting || isTesting"
            >
              <span v-if="isTesting">Testing...</span>
              <span v-else>Test Connection</span>
            </button>

            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isConnecting || isTesting"
            >
              <span v-if="isConnecting">Connecting...</span>
              <span v-else>Connect</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Connection Info -->
      <div class="connection-info" v-if="$store.state.connection?.connected">
        <h4>Current Connection</h4>
        <div class="info-item">
          <strong>Type:</strong> {{ connectionConfig.connectionType }}
        </div>
        <div class="info-item">
          <strong>Host:</strong> {{ connectionConfig.host }}:{{ connectionConfig.port }}
        </div>
        <div class="info-item">
          <strong>Database:</strong> {{ connectionConfig.defaultDatabase }}
        </div>
        <button class="btn btn-small btn-danger" @click="disconnect">
          Disconnect
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'DatabaseConnection',

  data() {
    return {
      connectionConfig: {
        connectionType: 'postgresql',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: '',
        defaultDatabase: 'postgres',
        socketPath: ''
      },
      isConnecting: false,
      isTesting: false,
      error: null as string | null,
      success: false
    };
  },

  computed: {
    requiresHost(): boolean {
      return !['sqlite'].includes(this.connectionConfig.connectionType);
    },

    requiresAuth(): boolean {
      return !['sqlite'].includes(this.connectionConfig.connectionType);
    },

    defaultPort(): number {
      const ports: Record<string, number> = {
        postgresql: 5432,
        mysql: 3306,
        sqlserver: 1433,
        mongodb: 27017
      };
      return ports[this.connectionConfig.connectionType] || 5432;
    }
  },

  watch: {
    'connectionConfig.connectionType'(newType) {
      // Update port when DB type changes
      this.connectionConfig.port = this.defaultPort;
    }
  },

  methods: {
    async testConnection() {
      this.error = null;
      this.success = false;
      this.isTesting = true;

      try {
        await this.$api.send('conn/test', {
          config: this.connectionConfig,
          osUser: this.$store.state.auth.user?.username || 'web-user'
        });

        this.success = true;
        setTimeout(() => {
          this.success = false;
        }, 3000);
      } catch (err: any) {
        this.error = err.message || 'Connection test failed';
      } finally {
        this.isTesting = false;
      }
    },

    async handleConnect() {
      this.error = null;
      this.success = false;
      this.isConnecting = true;

      try {
        await this.$api.send('conn/create', {
          config: this.connectionConfig,
          osUser: this.$store.state.auth.user?.username || 'web-user'
        });

        // Store connection in Vuex
        if (!this.$store.state.connection) {
          this.$store.registerModule('connection', {
            state: {
              connected: true,
              config: this.connectionConfig
            }
          });
        } else {
          this.$store.state.connection.connected = true;
          this.$store.state.connection.config = this.connectionConfig;
        }

        this.success = true;

        // Emit event to parent
        this.$emit('connected', this.connectionConfig);

        // Navigate after short delay
        setTimeout(() => {
          this.$emit('navigate-to-explorer');
        }, 1000);
      } catch (err: any) {
        this.error = err.message || 'Connection failed';
      } finally {
        this.isConnecting = false;
      }
    },

    async disconnect() {
      try {
        await this.$api.send('conn/disconnect', {});

        if (this.$store.state.connection) {
          this.$store.state.connection.connected = false;
        }

        this.$emit('disconnected');
      } catch (err: any) {
        this.error = err.message || 'Disconnect failed';
      }
    },

    handleFileSelect(event: Event) {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        this.connectionConfig.socketPath = target.files[0].name;
      }
    }
  }
});
</script>

<style scoped>
.connection-page {
  min-height: 100%;
  padding: 40px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.connection-container {
  max-width: 600px;
  margin: 0 auto;
}

.connection-header {
  text-align: center;
  margin-bottom: 30px;
}

.connection-header h2 {
  margin: 0 0 10px 0;
  font-size: 32px;
  color: #333;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.connection-form-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
}

select.form-control {
  cursor: pointer;
}

.file-input-group {
  display: flex;
  gap: 10px;
}

.file-input-group .form-control {
  flex: 1;
}

.error-alert {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 14px;
  border-left: 4px solid #c33;
}

.success-alert {
  background-color: #efe;
  color: #3c3;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 14px;
  border-left: 4px solid #3c3;
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 30px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.btn-outline {
  background: white;
  border: 2px solid #667eea;
  color: #667eea;
}

.btn-outline:hover:not(:disabled) {
  background: #667eea;
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.connection-info {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}

.connection-info h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.info-item {
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
}

.info-item strong {
  color: #333;
  margin-right: 5px;
}

.btn-small {
  padding: 8px 16px;
  font-size: 12px;
  margin-top: 15px;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}
</style>
