import './styles.css'
import iconUrl from '../images/icon.png'

// ─── Lucide Icons (inline SVG) ──────────────────────────────────────────────

const icons = {
  settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
}

// ─── State ───────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  idleTimeout: 15,
  suspendPinned: false,
  restoreScroll: true,
  maxSuspended: 100,
  backgroundOnly: true,
}

let settings = { ...DEFAULT_SETTINGS }
let whitelist = []

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showToast(message, isSuccess = false) {
  const toast = document.getElementById('toast')
  if (!toast) return
  toast.textContent = message
  toast.className = 'toast'
  if (isSuccess) toast.classList.add('success')
  toast.classList.add('visible')
  setTimeout(() => toast.classList.remove('visible'), 2000)
}

// ─── Actions ─────────────────────────────────────────────────────────────────

async function loadSettings() {
  const result = await chrome.storage.local.get(['settings', 'whitelist'])
  settings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) }
  whitelist = result.whitelist || []
}

async function saveSettings() {
  await chrome.storage.local.set({ settings })
}

async function saveWhitelist() {
  await chrome.storage.local.set({ whitelist })
}

function handleTimeoutChange(e) {
  const val = e.target.value
  if (val !== 'custom') {
    settings.idleTimeout = parseInt(val, 10)
    saveSettings()
    showToast('Settings saved', true)
  }
  render()
}

function handleToggle(key) {
  settings[key] = !settings[key]
  saveSettings()
  showToast('Settings saved', true)
  render()
}

function addDomain() {
  const input = document.getElementById('whitelist-input')
  const domain = input?.value.trim().toLowerCase()
  if (!domain) return
  if (!whitelist.includes(domain)) {
    whitelist.push(domain)
    saveWhitelist()
    showToast(`${domain} added`, true)
    render()
  } else {
    showToast('Already in whitelist')
  }
}

function removeDomain(domain) {
  whitelist = whitelist.filter(d => d !== domain)
  saveWhitelist()
  showToast(`${domain} removed`)
  render()
}

// ─── Render ──────────────────────────────────────────────────────────────────

function render() {
  const root = document.getElementById('root')
  if (!root) return

  const isPreset = [5, 10, 15, 30, 60].includes(settings.idleTimeout)

  root.innerHTML = `
    <div class="options-container">
      <header class="options-header">
        <img class="options-logo" src="${iconUrl}" alt="" />
        <div class="options-brand">
          <h1 class="options-title">TabRest Settings</h1>
          <p class="options-subtitle">Personalize your tab suspension experience</p>
        </div>
      </header>

      <div class="settings-section">
        <div class="section-header">
          <span class="section-icon">${icons.settings}</span>
          <span class="section-title">General</span>
        </div>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Idle Timeout</span>
              <span class="setting-desc">How long tabs must be inactive before suspension</span>
            </div>
            <select class="setting-select" id="select-timeout">
              <option value="5" ${settings.idleTimeout === 5 ? 'selected' : ''}>5 minutes</option>
              <option value="10" ${settings.idleTimeout === 10 ? 'selected' : ''}>10 minutes</option>
              <option value="15" ${settings.idleTimeout === 15 ? 'selected' : ''}>15 minutes</option>
              <option value="30" ${settings.idleTimeout === 30 ? 'selected' : ''}>30 minutes</option>
              <option value="60" ${settings.idleTimeout === 60 ? 'selected' : ''}>1 hour</option>
              <option value="custom" ${!isPreset ? 'selected' : ''}>Custom</option>
            </select>
          </div>

          ${!isPreset ? `
            <div class="setting-row sub-row">
              <div class="setting-info">
                <span class="setting-label">Minutes</span>
              </div>
              <input type="number" class="setting-number" id="input-custom-timeout" value="${settings.idleTimeout}" min="1" max="1440" />
            </div>
          ` : ''}

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Suspend Pinned Tabs</span>
              <span class="setting-desc">Apply auto-suspension logic to pinned tabs</span>
            </div>
            <label class="toggle">
              <input type="checkbox" id="toggle-pinned" ${settings.suspendPinned ? 'checked' : ''} />
              <span class="toggle-track"></span>
            </label>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Restore Scroll Position</span>
              <span class="setting-desc">Return to previous position when waking a tab</span>
            </div>
            <label class="toggle">
              <input type="checkbox" id="toggle-scroll" ${settings.restoreScroll ? 'checked' : ''} />
              <span class="toggle-track"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <span class="section-icon">${icons.zap}</span>
          <span class="section-title">Performance</span>
        </div>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Max Suspended Tabs</span>
              <span class="setting-desc">Global limit for concurrent suspended tabs</span>
            </div>
            <input type="number" class="setting-number" id="input-max-suspended" value="${settings.maxSuspended}" min="1" max="500" />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Background Only</span>
              <span class="setting-desc">Never suspend the currently active tab</span>
            </div>
            <label class="toggle">
              <input type="checkbox" id="toggle-background" ${settings.backgroundOnly ? 'checked' : ''} />
              <span class="toggle-track"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <span class="section-icon">${icons.shield}</span>
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
              ${whitelist.map(domain => `
                <div class="whitelist-tag">
                  <span>${domain}</span>
                  <button class="tag-remove" data-domain="${domain}">${icons.x}</button>
                </div>
              `).join('')}
              ${whitelist.length === 0 ? '<span class="whitelist-empty">No exclusions added</span>' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="toast" id="toast"></div>
  `

  // ─── Event Listeners ───────────────────────────────────────────────────

  document.getElementById('select-timeout')?.addEventListener('change', handleTimeoutChange)
  document.getElementById('input-custom-timeout')?.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10)
    if (val > 0) {
      settings.idleTimeout = val
      saveSettings()
      showToast('Settings saved', true)
    }
  })
  document.getElementById('toggle-pinned')?.addEventListener('change', () => handleToggle('suspendPinned'))
  document.getElementById('toggle-scroll')?.addEventListener('change', () => handleToggle('restoreScroll'))
  document.getElementById('toggle-background')?.addEventListener('change', () => handleToggle('backgroundOnly'))
  document.getElementById('input-max-suspended')?.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10)
    if (val > 0) {
      settings.maxSuspended = val
      saveSettings()
      showToast('Settings saved', true)
    }
  })
  document.getElementById('btn-add')?.addEventListener('click', addDomain)
  document.getElementById('whitelist-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addDomain()
  })
  document.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', () => removeDomain(btn.dataset.domain))
  })
}

loadSettings().then(render)
