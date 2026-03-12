/**
 * TabRest - Popup Script
 */
import './styles.css'

const ICONS = {
  moon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`,
  pause: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>`,
  rotateCcw: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  inbox: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  layers: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
}

const MESSAGE_TYPES = {
  GET_STATS: 'GET_STATS',
  GET_SUSPENDED_LIST: 'GET_SUSPENDED_LIST',
  SUSPEND_CURRENT: 'SUSPEND_CURRENT',
  SUSPEND_ALL: 'SUSPEND_ALL',
  SUSPEND_ALL_EXCEPT_CURRENT: 'SUSPEND_ALL_EXCEPT_CURRENT',
  TAB_SUSPENDED: 'TAB_SUSPENDED',
}

const TOAST_DURATION = 2000

class PopupState {
  constructor() {
    this.stats = {
      current: 0,
      total: 0,
      memorySaved: 0,
      openTabsCount: 0,
      maxOpenTabs: 0,
    }
    this.suspendedTabs = {}
  }

  updateStats(response) {
    if (response) {
      this.stats = { ...this.stats, ...response }
    }
  }

  updateSuspendedTabs(response) {
    if (response) {
      this.suspendedTabs = response.tabs || {}
    }
  }
}

const state = new PopupState()

function formatMemory(mb) {
  if (mb >= 1024) {
    return { value: (mb / 1024).toFixed(1), unit: 'GB' }
  }
  return { value: String(mb), unit: 'MB' }
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function showToast(message) {
  const toast = document.getElementById('toast')
  if (!toast) return

  toast.className = 'toast'
  toast.textContent = message
  toast.classList.add('visible')
  setTimeout(() => toast.classList.remove('visible'), TOAST_DURATION)
}

function sendMessage(messageType, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: messageType, ...payload }, (response) => {
      resolve(response)
    })
  })
}

async function fetchStats() {
  const response = await sendMessage(MESSAGE_TYPES.GET_STATS)
  state.updateStats(response)
}

async function fetchSuspendedList() {
  const response = await sendMessage(MESSAGE_TYPES.GET_SUSPENDED_LIST)
  state.updateSuspendedTabs(response)
}

async function refreshData() {
  await Promise.all([fetchStats(), fetchSuspendedList()])
  render()
}

async function suspendCurrent() {
  const response = await sendMessage(MESSAGE_TYPES.SUSPEND_CURRENT)
  const message = response?.success ? 'Tab suspended' : 'Cannot suspend this tab'
  showToast(message)
  refreshData()
}

async function suspendAll() {
  const response = await sendMessage(MESSAGE_TYPES.SUSPEND_ALL)
  const count = response?.count || 0
  const label = count !== 1 ? 'tabs' : 'tab'
  showToast(`${count} ${label} suspended`)
  refreshData()
}

async function suspendAllExceptCurrent() {
  const response = await sendMessage(MESSAGE_TYPES.SUSPEND_ALL_EXCEPT_CURRENT)
  const count = response?.count || 0
  const label = count !== 1 ? 'tabs' : 'tab'
  showToast(`${count} ${label} suspended`)
  refreshData()
}


function getFaviconUrl(url) {
  try {
    const parsedUrl = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`
  } catch {
    return ''
  }
}

function renderTabItem(data) {
  const domain = getDomain(data.url)
  const favicon = getFaviconUrl(data.url)

  return `
    <div class="tab-item">
      <img class="tab-favicon" src="${favicon}" alt="" onerror="this.style.display='none'" />
      <div class="tab-info">
        <div class="tab-name" title="${data.title || data.url}">${data.title || domain}</div>
        <div class="tab-meta">
          <span>${domain}</span>
          <span class="tab-meta-dot"></span>
          <span>Suspended ${timeAgo(data.suspendedAt)}</span>
        </div>
      </div>
    </div>
  `
}

function renderSuspendedList() {
  const entries = Object.entries(state.suspendedTabs)

  if (entries.length === 0) {
    return `
      <div class="empty-state">
        <span class="empty-icon">${ICONS.inbox}</span>
        <span class="empty-text">No suspended tabs yet.<br/>Inactive tabs will suspend automatically.</span>
      </div>
    `
  }

  return `
    <div class="suspended-list">
      ${entries.map(([, data]) => renderTabItem(data)).join('')}
    </div>
  `
}

function renderTabLimit() {
  const { openTabsCount, maxOpenTabs } = state.stats
  const hasLimit = maxOpenTabs > 0

  if (!hasLimit) {
    return `<div class="limit-help">No limit set in settings</div>`
  }

  const percentage = (openTabsCount / maxOpenTabs) * 100
  const isWarning = percentage > 85
  const remaining = maxOpenTabs - openTabsCount

  return `
    <div class="progress-track">
      <div class="progress-fill ${isWarning ? 'warning' : ''}" 
           style="width: ${Math.min(100, percentage)}%">
      </div>
    </div>
    <div class="progress-desc">
      ${remaining > 0
        ? `${remaining} more till auto-suspension`
        : 'Limit reached! Oldest tabs will rest next.'}
    </div>
  `
}

function renderTabLimitSection() {
  const { openTabsCount, maxOpenTabs } = state.stats
  const displayMax = maxOpenTabs > 0 ? `/ ${maxOpenTabs}` : ''

  return `
    <div class="section fade-in fade-in-d1">
      <div class="limit-container">
        <div class="limit-info">
          <div class="limit-label">
            ${ICONS.layers}
            <span>Open Tabs</span>
          </div>
          <div class="limit-status">
            <span class="limit-current">${openTabsCount || 0}</span>
            <span class="limit-total">${displayMax}</span>
          </div>
        </div>
        ${renderTabLimit()}
      </div>
    </div>
  `
}

function renderQuickActions() {
  return `
    <div class="section fade-in fade-in-d2">
      <div class="section-label">Quick Actions</div>
      <div class="actions-list">
        <button class="action-row primary" id="btn-suspend-all-except-current">
          <span class="action-row-icon">${ICONS.moon}</span>
          <span class="action-row-label">Suspend All Except Current</span>
          <span class="action-row-arrow">${ICONS.chevronRight}</span>
        </button>
        <button class="action-row" id="btn-suspend-current">
          <span class="action-row-icon">${ICONS.pause}</span>
          <span class="action-row-label">Suspend Current Tab</span>
          <span class="action-row-arrow">${ICONS.chevronRight}</span>
        </button>
        <button class="action-row" id="btn-suspend-all">
          <span class="action-row-icon">${ICONS.zap}</span>
          <span class="action-row-label">Suspend All Inactive</span>
          <span class="action-row-arrow">${ICONS.chevronRight}</span>
        </button>
      </div>
    </div>
  `
}

function renderSuspendedTabsSection() {
  return `
    <div class="section fade-in fade-in-d3">
      <div class="section-label">Suspended Tabs</div>
      ${renderSuspendedList()}
    </div>
  `
}

function renderFooter() {
  return `
    <div class="popup-footer fade-in fade-in-d4">
      <button class="footer-btn" id="btn-open-options">
        ${ICONS.settings}
        <span>Settings</span>
      </button>
    </div>
  `
}

function render() {
  const root = document.getElementById('root')
  if (!root) return

  const mem = formatMemory(state.stats.memorySaved)

  root.innerHTML = `
    <div class="popup-header fade-in">
      <div class="popup-brand">
        <div class="popup-title">TabRest</div>
        <div class="popup-subtitle">Tab Suspension Manager</div>
      </div>
    </div>

    <div class="divider"></div>

    ${renderTabLimitSection()}
    ${renderQuickActions()}
    ${renderSuspendedTabsSection()}
    ${renderFooter()}
  `

  bindEventListeners()
}

function bindEventListeners() {
  document.getElementById('btn-open-options')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage()
  })
  document.getElementById('btn-suspend-current')?.addEventListener('click', suspendCurrent)
  document.getElementById('btn-suspend-all')?.addEventListener('click', suspendAll)
  document.getElementById('btn-suspend-all-except-current')?.addEventListener('click', suspendAllExceptCurrent)
}

function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MESSAGE_TYPES.TAB_SUSPENDED) {
      refreshData()
    }
  })
}

setupMessageListeners()
refreshData()
