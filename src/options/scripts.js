/**
 * TabRest - Options Script
 */
import './styles.css'
import iconUrl from '../images/icon.png'

const ICONS = {
  settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  activity: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
}

const MESSAGE_TYPES = {
  GET_STATS: 'GET_STATS',
  TAB_SUSPENDED: 'TAB_SUSPENDED',
}

const STORAGE_KEYS = {
  SETTINGS: 'settings',
  WHITELIST: 'whitelist',
  SUSPENSION_HISTORY: 'suspensionHistory',
}

const DEFAULT_SETTINGS = {
  idleTimeout: 15,
  suspendPinned: false,
  restoreScroll: true,
  maxSuspended: 100,
  backgroundOnly: true,
  maxOpenTabs: 20,
  showToasts: true,
  trackDetailedMetrics: false,
}

const TIMEOUT_PRESETS = [5, 10, 15, 30, 60]
const TOAST_DURATION = 2000
const MEMORY_PER_TAB_MB = 80

class OptionsState {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS }
    this.whitelist = []
    this.isCustomMode = false
    this.metrics = {
      currentSuspended: 0,
      totalSuspended: 0,
      memorySaved: 0,
      history: [],
      detailed: {
        today: 0,
        week: 0,
        month: 0,
        session: 0,
      },
      trackEnabled: false,
    }
  }
}

const state = new OptionsState()

function showToast(message, isSuccess = false) {
  const toast = document.getElementById('toast')
  if (!toast) return

  toast.textContent = message
  toast.className = 'toast'
  if (isSuccess) toast.classList.add('success')
  toast.classList.add('visible')
  setTimeout(() => toast.classList.remove('visible'), TOAST_DURATION)
}

function formatMemory(mb) {
  if (mb >= 1024) {
    return { value: (mb / 1024).toFixed(1), unit: 'GB' }
  }
  return { value: String(mb), unit: 'MB' }
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

function sendMessage(messageType) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: messageType }, (response) => {
      resolve(response)
    })
  })
}

function getFromStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (response) => {
      resolve(response)
    })
  })
}

function saveToStorage(data) {
  return chrome.storage.local.set(data)
}

async function loadSettings() {
  const statsResponse = await sendMessage(MESSAGE_TYPES.GET_STATS)

  if (statsResponse) {
    state.metrics.currentSuspended = statsResponse.current
    state.metrics.totalSuspended = statsResponse.total
    state.metrics.memorySaved = statsResponse.memorySaved
    state.metrics.detailed = {
      today: statsResponse.today,
      week: statsResponse.week,
      month: statsResponse.month,
      session: statsResponse.session,
    }
    state.metrics.trackEnabled = statsResponse.trackDetailedMetrics
  }

  const localResponse = await getFromStorage([
    STORAGE_KEYS.SETTINGS,
    STORAGE_KEYS.WHITELIST,
    STORAGE_KEYS.SUSPENSION_HISTORY,
  ])

  state.settings = { ...DEFAULT_SETTINGS, ...(localResponse[STORAGE_KEYS.SETTINGS] || {}) }
  state.whitelist = localResponse[STORAGE_KEYS.WHITELIST] || []
  state.metrics.history = localResponse[STORAGE_KEYS.SUSPENSION_HISTORY] || []
}

async function saveSettings() {
  await saveToStorage({ [STORAGE_KEYS.SETTINGS]: state.settings })
}

async function saveWhitelist() {
  await saveToStorage({ [STORAGE_KEYS.WHITELIST]: state.whitelist })
}

function handleTimeoutChange(event) {
  const value = event.target.value

  if (value !== 'custom') {
    state.isCustomMode = false
    state.settings.idleTimeout = parseInt(value, 10)
    saveSettings()
    showToast('Settings saved', true)
  } else {
    state.isCustomMode = true
  }
  render()
}

function handleToggle(key) {
  state.settings[key] = !state.settings[key]
  saveSettings()
  showToast('Settings saved', true)
  render()
}

function addDomain() {
  const input = document.getElementById('whitelist-input')
  const domain = input?.value.trim().toLowerCase()

  if (!domain) return

  if (!state.whitelist.includes(domain)) {
    state.whitelist.push(domain)
    saveWhitelist()
    showToast(`${domain} added`, true)
    render()
  } else {
    showToast('Already in whitelist')
  }
}

function removeDomain(domain) {
  state.whitelist = state.whitelist.filter(d => d !== domain)
  saveWhitelist()
  showToast(`${domain} removed`)
  render()
}

function renderHeader() {
  return `
    <header class="options-header">
      <img class="options-logo" src="${iconUrl}" alt="" />
      <div class="options-brand">
        <h1 class="options-title">TabRest</h1>
        <p class="options-subtitle">Personalize your tab suspension experience</p>
      </div>
    </header>
  `
}

function renderMetricCard(label, value, description, isHighlight = false) {
  return `
    <div class="metric-card ${isHighlight ? 'highlight' : ''}">
      <span class="metric-label">${label}</span>
      <span class="metric-value">${value}</span>
      <span class="metric-desc">${description}</span>
    </div>
  `
}

function renderMetricsGrid() {
  const { currentSuspended, totalSuspended, memorySaved } = state.metrics

  return `
    <div class="metrics-grid">
      ${renderMetricCard('Memory Saved (Total)', (memorySaved / 1024).toFixed(2) + ' GB', 'Approximate RAM freed', true)}
      ${renderMetricCard('Currently Resting', currentSuspended, 'Tabs suspended now')}
      ${renderMetricCard('Total Suspensions', totalSuspended, 'All-time count')}
    </div>
  `
}

function renderDetailedMetricItem(count) {
  const memory = formatMemory(count * MEMORY_PER_TAB_MB)
  return `
    <div class="det-item">
      <span class="det-value">${count}</span>
      <span class="det-unit">tabs</span>
    </div>
    <div class="det-item">
      <span class="det-value">${memory.value}</span>
      <span class="det-unit">${memory.unit}</span>
    </div>
  `
}

function renderDetailedMetrics() {
  const { detailed, trackEnabled } = state.metrics

  if (!trackEnabled) {
    return `
      <div class="detailed-metrics-placeholder">
        <p>Detailed tracking is disabled. Enable it in settings to see daily/weekly impact.</p>
      </div>
    `
  }

  return `
    <div class="detailed-metrics-grid">
      <div class="detailed-card">
        <span class="det-label">Today</span>
        <div class="det-group">
          ${renderDetailedMetricItem(detailed.today)}
        </div>
      </div>
      <div class="detailed-card">
        <span class="det-label">This Week</span>
        <div class="det-group">
          ${renderDetailedMetricItem(detailed.week)}
        </div>
      </div>
      <div class="detailed-card">
        <span class="det-label">Last 30 Days</span>
        <div class="det-group">
          ${renderDetailedMetricItem(detailed.month)}
        </div>
      </div>
      <div class="detailed-card session">
        <span class="det-label">This Session</span>
        <div class="det-group">
          ${renderDetailedMetricItem(detailed.session)}
        </div>
      </div>
    </div>
  `
}

function renderHistoryItem(item, index) {
  return `
    <div class="history-item ${index === 0 ? 'new' : ''}">
      <div class="history-info">
        <span class="history-title" title="${item.title}">${item.title}</span>
        <span class="history-meta">Resting started</span>
      </div>
      <span class="history-time">${timeAgo(item.at)}</span>
    </div>
  `
}

function renderDashboardHistory() {
  const { history } = state.metrics

  return `
    <div class="dashboard-history">
      <div class="history-label">Recent Activity</div>
      <div class="history-list">
        ${history.map((item, i) => renderHistoryItem(item, i)).join('')}
        ${history.length === 0 ? '<span class="history-empty">No activity to show</span>' : ''}
      </div>
    </div>
  `
}

function renderDashboardSection() {
  return `
    <div class="dashboard-section">
      <div class="section-header">
        <span class="section-icon">${ICONS.activity}</span>
        <span class="section-title">Dashboard</span>
      </div>
      ${renderMetricsGrid()}
      ${renderDetailedMetrics()}
      ${renderDashboardHistory()}
    </div>
  `
}

function renderTimeoutSelect() {
  const { idleTimeout } = state.settings
  const isPreset = TIMEOUT_PRESETS.includes(idleTimeout)
  const showCustom = state.isCustomMode || !isPreset

  const options = TIMEOUT_PRESETS.map(value =>
    `<option value="${value}" ${idleTimeout === value ? 'selected' : ''}>${value} minutes</option>`
  ).join('')

  return `
    <select class="setting-select" id="select-timeout">
      ${options}
      <option value="custom" ${showCustom ? 'selected' : ''}>Custom</option>
    </select>
  `
}

function renderCustomTimeout() {
  const { idleTimeout } = state.settings
  const isPreset = TIMEOUT_PRESETS.includes(idleTimeout)
  const showCustom = state.isCustomMode || !isPreset

  if (!showCustom) return ''

  return `
    <div class="setting-row sub-row">
      <div class="setting-info">
        <span class="setting-label">Minutes</span>
      </div>
      <input type="number" class="setting-number" id="input-custom-timeout" value="${idleTimeout}" min="1" max="1440" />
    </div>
  `
}

function renderToggle(id, settingKey) {
  return `
    <label class="toggle">
      <input type="checkbox" id="toggle-${id}" ${state.settings[settingKey] ? 'checked' : ''} />
      <span class="toggle-track"></span>
    </label>
  `
}

function renderGeneralSettings() {
  return `
    <div class="settings-section">
      <div class="section-header">
        <span class="section-icon">${ICONS.settings}</span>
        <span class="section-title">General Settings</span>
      </div>
      <div class="settings-card">
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Idle Timeout</span>
            <span class="setting-desc">How long tabs must be inactive before suspension</span>
          </div>
          ${renderTimeoutSelect()}
        </div>
        ${renderCustomTimeout()}
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Suspend Pinned Tabs</span>
            <span class="setting-desc">Apply auto-suspension logic to pinned tabs</span>
          </div>
          ${renderToggle('pinned', 'suspendPinned')}
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Restore Scroll Position</span>
            <span class="setting-desc">Return to previous position when waking a tab</span>
          </div>
          ${renderToggle('scroll', 'restoreScroll')}
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Detailed Impact Metrics</span>
            <span class="setting-desc">Track daily/weekly/monthly suspension history</span>
          </div>
          ${renderToggle('metrics', 'trackDetailedMetrics')}
        </div>
      </div>
    </div>
  `
}

function renderPerformanceSettings() {
  const { maxOpenTabs, maxSuspended, backgroundOnly, showToasts } = state.settings

  return `
    <div class="settings-section">
      <div class="section-header">
        <span class="section-icon">${ICONS.zap}</span>
        <span class="section-title">Performance</span>
      </div>
      <div class="settings-card">
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Max Open Tabs</span>
            <span class="setting-desc">Auto-suspend oldest tab when exceeding this count</span>
          </div>
          <input type="number" class="setting-number" id="input-max-open" value="${maxOpenTabs}" min="0" max="100" />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Max Suspended Tabs</span>
            <span class="setting-desc">Global limit for concurrent suspended tabs</span>
          </div>
          <input type="number" class="setting-number" id="input-max-suspended" value="${maxSuspended}" min="1" max="500" />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Background Only</span>
            <span class="setting-desc">Never suspend the currently active tab</span>
          </div>
          ${renderToggle('background', 'backgroundOnly')}
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Rest Notifications</span>
            <span class="setting-desc">Show a toast when a tab enters rest mode</span>
          </div>
          <div class="setting-actions">
            <button class="btn-ghost" id="btn-preview-toast">Preview</button>
            ${renderToggle('toasts', 'showToasts')}
          </div>
        </div>
      </div>
    </div>
  `
}

function renderWhitelistTag(domain) {
  return `
    <div class="whitelist-tag">
      <span>${domain}</span>
      <button class="tag-remove" data-domain="${domain}">${ICONS.x}</button>
    </div>
  `
}

function renderExclusionsSection() {
  const { whitelist } = state

  return `
    <div class="settings-section">
      <div class="section-header">
        <span class="section-icon">${ICONS.shield}</span>
        <span class="section-title">Exclusions</span>
        <span class="section-count">${whitelist.length}</span>
      </div>
      <div class="settings-card">
        <div class="whitelist-container">
          <div class="whitelist-input-row">
            <input type="text" class="whitelist-input" id="whitelist-input" placeholder="e.g. docs.google.com" />
            <button class="btn-primary" id="btn-add">Add</button>
          </div>
          <div class="whitelist-tags">
            ${whitelist.map(domain => renderWhitelistTag(domain)).join('')}
            ${whitelist.length === 0 ? '<span class="whitelist-empty">No exclusions added</span>' : ''}
          </div>
        </div>
      </div>
    </div>
  `
}

function render() {
  const root = document.getElementById('root')
  if (!root) return

  root.innerHTML = `
    <div class="options-container">
      ${renderHeader()}
      ${renderDashboardSection()}
      ${renderGeneralSettings()}
      ${renderPerformanceSettings()}
      ${renderExclusionsSection()}
    </div>
  `

  bindEventListeners()
}

function bindEventListeners() {
  document.getElementById('select-timeout')?.addEventListener('change', handleTimeoutChange)

  document.getElementById('input-custom-timeout')?.addEventListener('change', (e) => {
    const value = parseInt(e.target.value, 10)
    if (value > 0) {
      state.settings.idleTimeout = value
      saveSettings()
      showToast('Settings saved', true)
    }
  })

  document.getElementById('toggle-pinned')?.addEventListener('change', () => handleToggle('suspendPinned'))
  document.getElementById('toggle-scroll')?.addEventListener('change', () => handleToggle('restoreScroll'))
  document.getElementById('toggle-background')?.addEventListener('change', () => handleToggle('backgroundOnly'))
  document.getElementById('toggle-toasts')?.addEventListener('change', () => handleToggle('showToasts'))
  document.getElementById('toggle-metrics')?.addEventListener('change', () => handleToggle('trackDetailedMetrics'))

  document.getElementById('btn-preview-toast')?.addEventListener('click', () => {
    showToast('This is a preview of the toast notification', true)
  })

  document.getElementById('input-max-suspended')?.addEventListener('change', (e) => {
    const value = parseInt(e.target.value, 10)
    if (value > 0) {
      state.settings.maxSuspended = value
      saveSettings()
      showToast('Settings saved', true)
    }
  })

  document.getElementById('input-max-open')?.addEventListener('change', (e) => {
    const value = parseInt(e.target.value, 10)
    if (value >= 0) {
      state.settings.maxOpenTabs = value
      saveSettings()
      showToast('Settings saved', true)
    }
  })

  document.getElementById('btn-add')?.addEventListener('click', addDomain)
  document.getElementById('whitelist-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addDomain()
  })

  document.querySelectorAll('.tag-remove').forEach(button => {
    button.addEventListener('click', () => removeDomain(button.dataset.domain))
  })
}

function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MESSAGE_TYPES.TAB_SUSPENDED) {
      showToast(`Resting: ${message.tabName}`, true)
      loadSettings().then(render)
    }
  })
}

setupMessageListeners()
loadSettings().then(render)
