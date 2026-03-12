/**
 * TabRest - Background Service Worker
 */

const CONFIG = {
  ALARM_NAME: 'tabrest-check',
  ALARM_INTERVAL_MINUTES: 1,
  DEFAULT_SETTINGS: {
    idleTimeout: 15,
    suspendPinned: false,
    restoreScroll: true,
    maxSuspended: 100,
    backgroundOnly: true,
    showToasts: true,
    maxOpenTabs: 20,
    trackDetailedMetrics: false,
  },
  METRICS: {
    MEMORY_SAVED_PER_TAB_MB: 80,
    THIRTY_DAYS_MS: 30 * 24 * 60 * 60 * 1000,
    ONE_DAY_MS: 24 * 60 * 60 * 1000,
    SEVEN_DAYS_MS: 7 * 24 * 60 * 60 * 1000,
  },
  HISTORY_LIMIT: 10,
  BADGE_COLOR: '#cba6f7',
  VISUAL_INDICATOR: '[Zzz] ',
}

const SYSTEM_URL_PROTOCOLS = ['chrome:', 'edge:', 'about:']

class StorageRepository {
  async getSettings() {
    const result = await chrome.storage.local.get('settings')
    return { ...CONFIG.DEFAULT_SETTINGS, ...(result.settings || {}) }
  }

  async saveSettings(settings) {
    await chrome.storage.local.set({ settings })
  }

  async getWhitelist() {
    const result = await chrome.storage.local.get('whitelist')
    return result.whitelist || []
  }

  async getSuspendedTabs() {
    const result = await chrome.storage.local.get('suspendedTabs')
    return result.suspendedTabs || {}
  }

  async getSuspendedTabCount() {
    const suspended = await this.getSuspendedTabs()
    return Object.keys(suspended).length
  }

  async addSuspendedTab(tabId, url, title) {
    const suspended = await this.getSuspendedTabs()
    suspended[tabId] = { url, title, suspendedAt: Date.now() }
    await chrome.storage.local.set({ suspendedTabs: suspended })
  }

  async removeSuspendedTab(tabId) {
    const suspended = await this.getSuspendedTabs()
    delete suspended[tabId]
    await chrome.storage.local.set({ suspendedTabs: suspended })
  }

  async getMetrics() {
    const result = await chrome.storage.local.get([
      'totalSuspended',
      'suspensionHistory',
      'detailedMetrics',
      'settings'
    ])
    return {
      totalSuspended: result.totalSuspended || 0,
      suspensionHistory: result.suspensionHistory || [],
      detailedMetrics: result.detailedMetrics || [],
      settings: { ...CONFIG.DEFAULT_SETTINGS, ...(result.settings || {}) }
    }
  }

  async incrementTotalSuspended() {
    const current = await this.getMetrics()
    await chrome.storage.local.set({ totalSuspended: current.totalSuspended + 1 })
  }

  async addSuspensionHistory(tabTitle, tabUrl) {
    const current = await this.getMetrics()
    const history = current.suspensionHistory
    history.unshift({ title: tabTitle || tabUrl, at: Date.now() })
    if (history.length > CONFIG.HISTORY_LIMIT) history.pop()
    await chrome.storage.local.set({ suspensionHistory: history })
  }

  async addDetailedMetric() {
    const current = await this.getMetrics()
    const detailed = current.detailedMetrics
    const now = Date.now()
    const thirtyDaysAgo = now - CONFIG.METRICS.THIRTY_DAYS_MS

    detailed.push(now)
    const pruned = detailed.filter(ts => ts > thirtyDaysAgo)
    await chrome.storage.local.set({ detailedMetrics: pruned })
  }

  async incrementSessionSuspended() {
    const result = await chrome.storage.session.get('sessionSuspended')
    const count = (result.sessionSuspended || 0) + 1
    await chrome.storage.session.set({ sessionSuspended: count })
  }

  async clearSuspendedTabs() {
    await chrome.storage.local.set({ suspendedTabs: {} })
  }

  async initializeDefaults() {
    const result = await chrome.storage.local.get([
      'settings', 'whitelist', 'suspendedTabs',
      'totalSuspended', 'suspensionHistory', 'detailedMetrics'
    ])

    if (!result.settings) await this.saveSettings(CONFIG.DEFAULT_SETTINGS)
    if (!result.whitelist) await chrome.storage.local.set({ whitelist: [] })
    if (!result.suspendedTabs) await chrome.storage.local.set({ suspendedTabs: {} })
    if (!result.totalSuspended) await chrome.storage.local.set({ totalSuspended: 0 })
    if (!result.suspensionHistory) await chrome.storage.local.set({ suspensionHistory: [] })
    if (!result.detailedMetrics) await chrome.storage.local.set({ detailedMetrics: [] })

    await chrome.storage.session.set({ sessionSuspended: 0 })
  }
}

const storage = new StorageRepository()

const lastActiveTimes = {}

function isSystemUrl(url) {
  if (!url) return true
  return SYSTEM_URL_PROTOCOLS.some(protocol => url.startsWith(protocol))
}

function isWhitelisted(url, whitelist) {
  if (!url || isSystemUrl(url)) return false
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return whitelist.some(domain => {
      const normalizedDomain = domain.trim().toLowerCase()
      return hostname === normalizedDomain || hostname.endsWith('.' + normalizedDomain)
    })
  } catch {
    return false
  }
}

function isTabSuspensionCandidate(tab, settings, whitelist) {
  if (isSystemUrl(tab.url)) return false
  if (tab.discarded || tab.audible) return false
  if (tab.active) return false
  if (tab.pinned && !settings.suspendPinned) return false
  if (isWhitelisted(tab.url, whitelist)) return false
  return true
}

function getTabIdleMinutes(tabId) {
  const lastActive = lastActiveTimes[tabId]
  if (!lastActive) return 0
  return (Date.now() - lastActive) / 1000 / 60
}

function touchTab(tabId) {
  lastActiveTimes[tabId] = Date.now()
  chrome.storage.local.set({ lastActiveTimes })
}

async function updateBadge() {
  const count = await storage.getSuspendedTabCount()
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' })
  chrome.action.setBadgeBackgroundColor({ color: CONFIG.BADGE_COLOR })
}

async function addVisualIndicator(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (indicator) => {
        if (!document.title.startsWith(indicator)) {
          document.title = indicator + document.title
        }
      },
      args: [CONFIG.VISUAL_INDICATOR]
    })
  } catch (e) {
    // Ignore errors for system pages or restricted pages
  }
}

async function sendSuspensionNotification(tabTitle, tabUrl) {
  try {
    await chrome.runtime.sendMessage({
      type: 'TAB_SUSPENDED',
      tabName: tabTitle || 'Unknown tab',
      url: tabUrl
    })
  } catch {
  }
}

async function suspendTab(tabId, force = false) {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!tab || tab.discarded) return false
    if (!force && tab.active) return false

    // Add visual indicator before discarding
    await addVisualIndicator(tabId)

    await storage.addSuspendedTab(tabId, tab.url, tab.title)
    await chrome.tabs.discard(tabId)

    await storage.incrementTotalSuspended()
    await storage.addSuspensionHistory(tab.title, tab.url)

    const metrics = await storage.getMetrics()
    if (metrics.settings.trackDetailedMetrics) {
      await storage.addDetailedMetric()
      await storage.incrementSessionSuspended()
    }

    await updateBadge()

    if (metrics.settings.showToasts) {
      await sendSuspensionNotification(tab.title, tab.url)
    }

    console.log(`[TabRest] Suspending tab: ${tab.title} (${tab.id})`)
    return true
  } catch (error) {
    console.error(`[TabRest] Error suspending tab ${tabId}:`, error)
    return false
  }
}

async function runCheck() {
  const settings = await storage.getSettings()
  const whitelist = await storage.getWhitelist()
  const tabs = await chrome.tabs.query({})

  for (const tab of tabs) {
    if (!isTabSuspensionCandidate(tab, settings, whitelist)) continue

    const lastActive = lastActiveTimes[tab.id]
    if (!lastActive) {
      touchTab(tab.id)
      continue
    }

    const elapsedMinutes = getTabIdleMinutes(tab.id)
    if (elapsedMinutes >= settings.idleTimeout) {
      console.log(`[TabRest] Auto-suspending ${tab.url} (inactive for ${elapsedMinutes.toFixed(1)}m)`)
      await suspendTab(tab.id)
    }
  }
}

function getTabSortingKey(tabId) {
  return lastActiveTimes[tabId] || 0
}

function sortTabsByLastActive(tabs) {
  return [...tabs].sort((a, b) => getTabSortingKey(a.id) - getTabSortingKey(b.id))
}

function filterSuspensionCandidates(tabs, settings, whitelist, activeTabIds) {
  return tabs
    .filter(tab => !activeTabIds.has(tab.id))
    .filter(tab => !isSystemUrl(tab.url))
    .filter(tab => !tab.pinned || settings.suspendPinned)
    .filter(tab => !isWhitelisted(tab.url, whitelist))
}

async function enforceTabLimit() {
  const settings = await storage.getSettings()
  const limit = settings.maxOpenTabs
  if (!limit || limit <= 0) return

  const tabs = await chrome.tabs.query({ discarded: false })
  if (tabs.length <= limit) return

  const whitelist = await storage.getWhitelist()
  const activeTabs = await chrome.tabs.query({ active: true })
  const activeTabIds = new Set(activeTabs.map(t => t.id))

  const candidates = filterSuspensionCandidates(tabs, settings, whitelist, activeTabIds)
  const sortedCandidates = sortTabsByLastActive(candidates)

  const surplus = tabs.length - limit
  const tabsToSuspend = sortedCandidates.slice(0, surplus)

  for (const tab of tabsToSuspend) {
    await suspendTab(tab.id)
  }
}

async function suspendAllInactive() {
  const settings = await storage.getSettings()
  const whitelist = await storage.getWhitelist()
  const tabs = await chrome.tabs.query({ currentWindow: true })

  let count = 0
  for (const tab of tabs) {
    if (isTabSuspensionCandidate(tab, settings, whitelist)) {
      if (await suspendTab(tab.id)) count++
    }
  }
  return count
}

async function suspendAllExceptCurrent() {
  const tabs = await chrome.tabs.query({ currentWindow: true })
  const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const activeTabIds = new Set(activeTabs.map(t => t.id))

  let count = 0
  for (const tab of tabs) {
    if (activeTabIds.has(tab.id)) continue
    if (!isSystemUrl(tab.url)) {
      if (await suspendTab(tab.id, true)) count++
    }
  }
  return count
}


async function getStats() {
  const current = await storage.getSuspendedTabCount()
  const metrics = await storage.getMetrics()
  const sessionResult = await chrome.storage.session.get('sessionSuspended')
  const openTabs = await chrome.tabs.query({ discarded: false })

  const total = metrics.totalSuspended
  const settings = metrics.settings
  const detailed = metrics.detailedMetrics
  const sessionCount = sessionResult.sessionSuspended || 0

  const now = Date.now()
  const oneDay = CONFIG.METRICS.ONE_DAY_MS
  const sevenDays = CONFIG.METRICS.SEVEN_DAYS_MS
  const thirtyDays = CONFIG.METRICS.THIRTY_DAYS_MS

  const today = detailed.filter(ts => ts > (now - oneDay)).length
  const week = detailed.filter(ts => ts > (now - sevenDays)).length
  const month = detailed.filter(ts => ts > (now - thirtyDays)).length

  return {
    current,
    total,
    session: sessionCount,
    today,
    week,
    month,
    memorySaved: total * CONFIG.METRICS.MEMORY_SAVED_PER_TAB_MB,
    currentMemorySaved: current * CONFIG.METRICS.MEMORY_SAVED_PER_TAB_MB,
    openTabsCount: openTabs.length,
    maxOpenTabs: settings.maxOpenTabs,
    trackDetailedMetrics: settings.trackDetailedMetrics
  }
}

function setupEventListeners() {
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    touchTab(tabId)
    storage.removeSuspendedTab(tabId)
    updateBadge()
  })

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete' || changeInfo.audible !== undefined) {
      touchTab(tabId)
    }
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    delete lastActiveTimes[tabId]
    storage.removeSuspendedTab(tabId)
    chrome.storage.local.set({ lastActiveTimes })
    updateBadge()
  })

  chrome.tabs.onCreated.addListener(() => enforceTabLimit())

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
      enforceTabLimit()
    }
  })

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'suspend-tab' && tab) {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const otherTabs = tabs
        .filter(t => t.id !== tab.id && !t.discarded && !isSystemUrl(t.url))
        .sort((a, b) => (lastActiveTimes[b.id] || 0) - (lastActiveTimes[a.id] || 0))

      if (otherTabs[0]) {
        await chrome.tabs.update(otherTabs[0].id, { active: true })
      }
      await suspendTab(tab.id, true)
    }
    else if (info.menuItemId === 'suspend-all') await suspendAllInactive()
    else if (info.menuItemId === 'suspend-all-except-current') await suspendAllExceptCurrent()
  })

  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === CONFIG.ALARM_NAME) runCheck()
  })

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handlers = {
      GET_STATS: async () => sendResponse(await getStats()),
      SUSPEND_CURRENT: async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tabs[0]) {
          const currentTab = tabs[0]
          const allTabs = await chrome.tabs.query({ currentWindow: true })
          const otherTabs = allTabs
            .filter(t => t.id !== currentTab.id && !t.discarded && !isSystemUrl(t.url))
            .sort((a, b) => (lastActiveTimes[b.id] || 0) - (lastActiveTimes[a.id] || 0))

          if (otherTabs[0]) {
            await chrome.tabs.update(otherTabs[0].id, { active: true })
          }
          sendResponse({ success: await suspendTab(currentTab.id, true) })
        }
        else sendResponse({ success: false })
      },
      SUSPEND_ALL: async () => {
        const count = await suspendAllInactive()
        sendResponse({ count })
      },
      SUSPEND_ALL_EXCEPT_CURRENT: async () => {
        const count = await suspendAllExceptCurrent()
        sendResponse({ count })
      },
      GET_SUSPENDED_LIST: async () => {
        const tabs = await storage.getSuspendedTabs()
        sendResponse({ tabs })
      },
      TEST_RUN_CHECK: async () => {
        await runCheck()
        sendResponse({ success: true })
      },
      TEST_GET_ACTIVE_TIMES: () => sendResponse({ lastActiveTimes })
    }

    const handler = handlers[message.type]
    if (handler) {
      handler()
      return true
    }
  })

  chrome.runtime.onInstalled.addListener(async () => {
    await storage.initializeDefaults()

    chrome.contextMenus.create({ id: 'suspend-tab', title: 'Suspend Current Tab', contexts: ['page'] })
    chrome.contextMenus.create({ id: 'suspend-all', title: 'Suspend Inactive Tabs', contexts: ['page'] })
    chrome.contextMenus.create({ id: 'suspend-all-except-current', title: 'Suspend All Except Current', contexts: ['page'] })

    chrome.alarms.create(CONFIG.ALARM_NAME, { periodInMinutes: CONFIG.ALARM_INTERVAL_MINUTES })
    await updateBadge()
    await enforceTabLimit()
  })
}

self.lastActiveTimes = lastActiveTimes
self.runCheck = runCheck
self.suspendTab = suspendTab

setupEventListeners()

chrome.tabs.query({}, tabs => {
  tabs.forEach(tab => {
    if (!lastActiveTimes[tab.id]) lastActiveTimes[tab.id] = Date.now()
  })
})
updateBadge()
