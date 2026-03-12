/**
 * TabRest - Shared Constants
 */

export const CONFIG = {
  STORAGE_KEYS: {
    SETTINGS: 'settings',
    WHITELIST: 'whitelist',
    SUSPENDED_TABS: 'suspendedTabs',
    TOTAL_SUSPENDED: 'totalSuspended',
    SUSPENSION_HISTORY: 'suspensionHistory',
    DETAILED_METRICS: 'detailedMetrics',
    SESSION_SUSPENDED: 'sessionSuspended',
    LAST_ACTIVE_TIMES: 'lastActiveTimes',
  },
  ALARM_NAME: 'tabrest-check',
  ALARM_INTERVAL_MINUTES: 1,
  METRICS: {
    MEMORY_SAVED_PER_TAB_MB: 80,
    THIRTY_DAYS_MS: 30 * 24 * 60 * 60 * 1000,
    ONE_DAY_MS: 24 * 60 * 60 * 1000,
    SEVEN_DAYS_MS: 7 * 24 * 60 * 60 * 1000,
  },
  HISTORY_LIMIT: 5,
  BADGE_COLOR: '#cba6f7',
  TOAST_DURATION_MS: 2000,
}

export const DEFAULT_SETTINGS = {
  idleTimeout: 15,
  suspendPinned: false,
  restoreScroll: true,
  maxSuspended: 100,
  backgroundOnly: true,
  showToasts: true,
  maxOpenTabs: 20,
  trackDetailedMetrics: false,
  visualIndicator: '[Zzz] ',
}

export const TIMEOUT_PRESETS = [5, 10, 15, 30, 60]

export const SYSTEM_URL_PROTOCOLS = ['chrome:', 'edge:', 'about:']
