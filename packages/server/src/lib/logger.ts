/**
 * Simple logger for server
 * Replaces the Electron renderer logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private scope: string;

  constructor(scopeName: string = 'server') {
    this.scope = scopeName;
  }

  private log(level: LogLevel, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.scope}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, ...args);
        break;
      case 'info':
        console.info(prefix, ...args);
        break;
      case 'warn':
        console.warn(prefix, ...args);
        break;
      case 'error':
        console.error(prefix, ...args);
        break;
    }
  }

  debug(...args: any[]): void {
    this.log('debug', ...args);
  }

  info(...args: any[]): void {
    this.log('info', ...args);
  }

  warn(...args: any[]): void {
    this.log('warn', ...args);
  }

  error(...args: any[]): void {
    this.log('error', ...args);
  }

  scope(scopeName: string): Logger {
    return new Logger(`${this.scope}:${scopeName}`);
  }
}

// Export a default logger instance
const rawLog = new Logger('server');

export default rawLog;
