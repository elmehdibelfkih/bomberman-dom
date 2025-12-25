export class Logger {
  static levels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
  };

  static currentLevel = Logger.levels.INFO;
  static useColors = true;

  static colors = {
    DEBUG: '\x1b[36m',   // Cyan
    INFO: '\x1b[32m',    // Green
    WARN: '\x1b[33m',    // Yellow
    ERROR: '\x1b[31m',   // Red
    RESET: '\x1b[0m'
  };

  /**
   * Set logging level
   * @param {string} level - DEBUG, INFO, WARN, ERROR, NONE
   */
  static setLevel(level) {
    const upperLevel = level.toUpperCase();
    if (this.levels[upperLevel] !== undefined) {
      this.currentLevel = this.levels[upperLevel];
    }
  }

  /**
   * Format timestamp
   * @returns {string}
   */
  static getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message
   * @param {string} level
   * @param {string} message
   * @param {any[]} args
   */
  static formatMessage(level, message, args) {
    const timestamp = this.getTimestamp();
    const color = this.useColors ? this.colors[level] : '';
    const reset = this.useColors ? this.colors.RESET : '';
    
    return `${color}[${level}] ${timestamp}${reset} - ${message}`;
  }

  /**
   * Debug log (lowest priority)
   */
  static debug(message, ...args) {
    if (this.currentLevel <= this.levels.DEBUG) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }

  /**
   * Info log (general information)
   */
  static info(message, ...args) {
    if (this.currentLevel <= this.levels.INFO) {
      console.log(this.formatMessage('INFO', message), ...args);
    }
  }

  /**
   * Warning log (potential issues)
   */
  static warn(message, ...args) {
    if (this.currentLevel <= this.levels.WARN) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  /**
   * Error log (critical issues)
   */
  static error(message, ...args) {
    if (this.currentLevel <= this.levels.ERROR) {
      console.error(this.formatMessage('ERROR', message), ...args);
    }
  }

  /**
   * Log game event (special formatting)
   */
  static gameEvent(eventType, data) {
    this.info(`GAME_EVENT: ${eventType}`, data);
  }

  /**
   * Log network event
   */
  static network(direction, messageType, playerId) {
    this.debug(`NETWORK ${direction}: ${messageType} | Player: ${playerId}`);
  }
}