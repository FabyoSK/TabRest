import './styles.css'

// ─── Lucide Icons (inline SVG) ──────────────────────────────────────────────

const icons = {
  moon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  cpu: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`,
  pause: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>`,
  rotateCcw: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  inbox: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
}

// ─── State ───────────────────────────────────────────────────────────────────

let stats = { count: 0, memorySaved: 0 }
let suspendedTabs = {}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMemory(mb) {
  if (mb >= 1024) return { value: (mb / 1024).toFixed(1), unit: 'GB' }
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
  toast.textContent = message
  toast.classList.add('visible')
  setTimeout(() => toast.classList.remove('visible'), 2000)
}

// ─── Data ────────────────────────────────────────────────────────────────────

async function fetchStats() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
      if (response) stats = response
      resolve()
    })
  })
}

async function fetchSuspendedList() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SUSPENDED_LIST' }, (response) => {
      if (response) suspendedTabs = response.tabs || {}
      resolve()
    })
  })
}

// ─── Actions ─────────────────────────────────────────────────────────────────

async function suspendCurrent() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'SUSPEND_CURRENT' }, (response) => {
      showToast(response?.success ? 'Tab suspended' : 'Cannot suspend this tab')
      resolve()
      refreshData()
    })
  })
}

async function suspendAll() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'SUSPEND_ALL' }, (response) => {
      const count = response?.count || 0
      showToast(`${count} tab${count !== 1 ? 's' : ''} suspended`)
      resolve()
      refreshData()
    })
  })
}

async function restoreAll() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'RESTORE_ALL' }, (response) => {
      const count = response?.count || 0
      showToast(`${count} tab${count !== 1 ? 's' : ''} restored`)
      resolve()
      refreshData()
    })
  })
}

// ─── Render ──────────────────────────────────────────────────────────────────

function renderSuspendedList() {
  const entries = Object.entries(suspendedTabs)

  if (entries.length === 0) {
    return `
      <div class="empty-state">
        <span class="empty-icon">${icons.inbox}</span>
        <span class="empty-text">No suspended tabs yet.<br/>Inactive tabs will suspend automatically.</span>
      </div>
    `
  }

  return `
    <div class="suspended-list">
      ${entries.map(([, data]) => {
        const domain = getDomain(data.url)
        let favicon = ''
        try {
          const url = new URL(data.url)
          favicon = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`
        } catch { /* skip */ }

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
      }).join('')}
    </div>
  `
}

function render() {
  const root = document.getElementById('root')
  if (!root) return

  const mem = formatMemory(stats.memorySaved)

  root.innerHTML = `
    <!-- Header -->
    <div class="popup-header fade-in">
      <div class="popup-brand">
        <div class="popup-title">TabRest</div>
        <div class="popup-subtitle">Tab Suspension Manager</div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- Stats -->
    <div class="stats-grid fade-in fade-in-d1">
      <div class="stat-card suspended">
        <div class="stat-top">
          <span class="stat-icon">${icons.moon}</span>
          <span class="stat-label">Suspended</span>
        </div>
        <span class="stat-value">${stats.count}<span class="stat-unit"> tab${stats.count !== 1 ? 's' : ''}</span></span>
      </div>
      <div class="stat-card memory">
        <div class="stat-top">
          <span class="stat-icon">${icons.cpu}</span>
          <span class="stat-label">Memory Saved</span>
        </div>
        <span class="stat-value">~${mem.value}<span class="stat-unit">${mem.unit}</span></span>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="section fade-in fade-in-d2">
      <div class="section-label">Quick Actions</div>
      <div class="actions-list">
        <button class="action-row primary" id="btn-suspend-all">
          <span class="action-row-icon">${icons.zap}</span>
          <span class="action-row-label">Suspend All Inactive</span>
          <span class="action-row-arrow">${icons.chevronRight}</span>
        </button>
        <button class="action-row" id="btn-suspend-current">
          <span class="action-row-icon">${icons.pause}</span>
          <span class="action-row-label">Suspend Current Tab</span>
          <span class="action-row-arrow">${icons.chevronRight}</span>
        </button>
        <button class="action-row" id="btn-restore-all">
          <span class="action-row-icon">${icons.rotateCcw}</span>
          <span class="action-row-label">Restore All Tabs</span>
          <span class="action-row-arrow">${icons.chevronRight}</span>
        </button>
      </div>
    </div>

    <!-- Suspended Tabs -->
    <div class="section fade-in fade-in-d3">
      <div class="section-label">Suspended Tabs</div>
      ${renderSuspendedList()}
    </div>

    <!-- Footer -->
    <div class="popup-footer fade-in fade-in-d4">
      <button class="footer-btn" id="btn-open-options">
        ${icons.settings}
        <span>Settings</span>
      </button>
    </div>

    <div class="toast" id="toast"></div>
  `

  // Bind events
  document.getElementById('btn-open-options')?.addEventListener('click', () => chrome.runtime.openOptionsPage())
  document.getElementById('btn-suspend-current')?.addEventListener('click', suspendCurrent)
  document.getElementById('btn-suspend-all')?.addEventListener('click', suspendAll)
  document.getElementById('btn-restore-all')?.addEventListener('click', restoreAll)
}

// ─── Init ────────────────────────────────────────────────────────────────────

async function refreshData() {
  await Promise.all([fetchStats(), fetchSuspendedList()])
  render()
}

refreshData()
