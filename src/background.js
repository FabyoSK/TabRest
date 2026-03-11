/**
 * TabRest - Background Service Worker
 */

const ALARM_NAME = 'tabrest-check'
const ALARM_INTERVAL = 1
const DEFAULT_SETTINGS = {
  idleTimeout: 15,
  suspendPinned: false,
  restoreScroll: true,
  maxSuspended: 100,
  backgroundOnly: true,
  showToasts: true,
  maxOpenTabs: 20,
  trackDetailedMetrics: false,
}





let lastActiveTimes = {}

async function getSettings() {
  const result = await chrome.storage.local.get('settings')
  return { ...DEFAULT_SETTINGS, ...(result.settings || {}) }
}

async function getWhitelist() {
  const result = await chrome.storage.local.get('whitelist')
  return result.whitelist || []
}

async function getSuspendedCount() {
  const result = await chrome.storage.local.get('suspendedTabs')
  const suspended = result.suspendedTabs || {}
  return Object.keys(suspended).length
}

async function addSuspendedTab(tabId, url, title) {
  const result = await chrome.storage.local.get('suspendedTabs')
  const suspended = result.suspendedTabs || {}
  suspended[tabId] = { url, title, suspendedAt: Date.now() }
  await chrome.storage.local.set({ suspendedTabs: suspended })
}

async function removeSuspendedTab(tabId) {
  const result = await chrome.storage.local.get('suspendedTabs')
  const suspended = result.suspendedTabs || {}
  delete suspended[tabId]
  await chrome.storage.local.set({ suspendedTabs: suspended })
}

function isWhitelisted(url, whitelist) {
  if (!url) return false
  try {
    const hostname = new URL(url).hostname
    return whitelist.some(domain => {
      const d = domain.trim().toLowerCase()
      const h = hostname.toLowerCase()
      return h === d || h.endsWith('.' + d)
    })
  } catch {
    return false
  }
}

function touchTab(tabId) {
  lastActiveTimes[tabId] = Date.now()
  chrome.storage.local.set({ lastActiveTimes })
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  touchTab(tabId)
  removeSuspendedTab(tabId)
  updateBadge()
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete' || changeInfo.audible !== undefined) {
    touchTab(tabId)
  }
})

chrome.tabs.onRemoved.addListener((tabId) => {
  delete lastActiveTimes[tabId]
  removeSuspendedTab(tabId)
  chrome.storage.local.set({ lastActiveTimes })
  updateBadge()
})

async function suspendTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!tab || tab.discarded || tab.active) return false

    // Update suspended tabs list
    await addSuspendedTab(tabId, tab.url, tab.title)

    // Actually discard the tab
    await chrome.tabs.discard(tabId)

    // Update metrics
    const res = await chrome.storage.local.get(['totalSuspended', 'suspensionHistory', 'settings', 'detailedMetrics'])
    const total = (res.totalSuspended || 0) + 1
    const settings = { ...DEFAULT_SETTINGS, ...(res.settings || {}) }

    const history = res.suspensionHistory || []
    history.unshift({ title: tab.title || tab.url, at: Date.now() })
    if (history.length > 5) history.pop()

    const storageUpdate = {
      totalSuspended: total,
      suspensionHistory: history
    }

    if (settings.trackDetailedMetrics) {
      const detailed = res.detailedMetrics || []
      const now = Date.now()
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)

      detailed.push(now)
      const pruned = detailed.filter(ts => ts > thirtyDaysAgo)
      storageUpdate.detailedMetrics = pruned

      // Update session count
      chrome.storage.session.get('sessionSuspended', (sessionRes) => {
        const sessionCount = (sessionRes.sessionSuspended || 0) + 1
        chrome.storage.session.set({ sessionSuspended: sessionCount })
      })
    }

    await chrome.storage.local.set(storageUpdate)
    updateBadge()

    if (settings.showToasts) {
      chrome.runtime.sendMessage({
        type: 'TAB_SUSPENDED',
        tabName: tab.title || 'Unknown tab',
        url: tab.url
      }).catch(() => { })
    }

    console.log(`[TabRest] Suspending tab: ${tab.title} (${tab.id})`)
    return true
  } catch (err) {
    console.error(`[TabRest] Error suspending tab ${tabId}:`, err)
    return false
  }
}



async function runCheck() {
  const settings = await getSettings()
  const whitelist = await getWhitelist()
  const tabs = await chrome.tabs.query({})

  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome') || tab.url.startsWith('edge') || tab.url.startsWith('about')) continue
    if (tab.active || tab.discarded || tab.audible) continue
    if (tab.pinned && !settings.suspendPinned) continue
    if (isWhitelisted(tab.url, whitelist)) continue

    const lastActive = lastActiveTimes[tab.id]
    if (!lastActive) {
      touchTab(tab.id)
      continue
    }

    const elapsed = (Date.now() - lastActive) / 1000 / 60
    if (elapsed >= settings.idleTimeout) {
      console.log(`[TabRest] Auto-suspending ${tab.url} (inactive for ${elapsed.toFixed(1)}m)`)
      await suspendTab(tab.id)
    }
  }
}

async function updateBadge() {
  const count = await getSuspendedCount()
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' })
  chrome.action.setBadgeBackgroundColor({ color: '#cba6f7' })
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['settings', 'whitelist', 'suspendedTabs', 'totalSuspended', 'suspensionHistory', 'detailedMetrics'], (res) => {
    if (!res.settings) chrome.storage.local.set({ settings: DEFAULT_SETTINGS })
    if (!res.whitelist) chrome.storage.local.set({ whitelist: [] })
    if (!res.suspendedTabs) chrome.storage.local.set({ suspendedTabs: {} })
    if (!res.totalSuspended) chrome.storage.local.set({ totalSuspended: 0 })
    if (!res.suspensionHistory) chrome.storage.local.set({ suspensionHistory: [] })
    if (!res.detailedMetrics) chrome.storage.local.set({ detailedMetrics: [] })
  })

  chrome.storage.session.set({ sessionSuspended: 0 })


  // Professional menu titles (removed emojis)
  chrome.contextMenus.create({ id: 'suspend-tab', title: 'Suspend Current Tab', contexts: ['page'] })
  chrome.contextMenus.create({ id: 'suspend-all', title: 'Suspend Inactive Tabs', contexts: ['page'] })
  chrome.contextMenus.create({ id: 'restore-all', title: 'Restore All Tabs', contexts: ['page'] })

  chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_INTERVAL })
  updateBadge()
  enforceTabLimit()
})

chrome.tabs.onCreated.addListener(() => {
  enforceTabLimit()
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    enforceTabLimit()
  }
})

async function enforceTabLimit() {
  const settings = await getSettings()
  const limit = settings.maxOpenTabs
  if (!limit || limit <= 0) return

  const tabs = await chrome.tabs.query({ discarded: false })
  if (tabs.length <= limit) return

  const whitelist = await getWhitelist()

  // Sort tabs by last active time (oldest first)
  const allActiveTabs = await chrome.tabs.query({ active: true })
  const activeTabIds = new Set(allActiveTabs.map(t => t.id))

  const candidates = tabs
    .filter(t => !activeTabIds.has(t.id))
    .filter(t => !t.url || (!t.url.startsWith('chrome') && !t.url.startsWith('edge') && !t.url.startsWith('about')))
    .filter(t => !t.pinned || settings.suspendPinned)
    .filter(t => !isWhitelisted(t.url, whitelist))
    .sort((a, b) => {
      const timeA = lastActiveTimes[a.id] || 0
      const timeB = lastActiveTimes[b.id] || 0
      return timeA - timeB
    })

  const surplus = tabs.length - limit
  for (let i = 0; i < Math.min(surplus, candidates.length); i++) {
    await suspendTab(candidates[i].id)
  }
}


chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'suspend-tab' && tab) await suspendTab(tab.id)
  else if (info.menuItemId === 'suspend-all') await suspendAll()
  else if (info.menuItemId === 'restore-all') await restoreAll()
})

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) runCheck()
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_STATS') {
    Promise.all([
      getSuspendedCount(),
      chrome.storage.local.get(['totalSuspended', 'detailedMetrics', 'settings']),
      chrome.storage.session.get('sessionSuspended'),
      chrome.tabs.query({ discarded: false })
    ]).then(([current, localRes, sessionRes, openTabs]) => {
      const total = localRes.totalSuspended || 0
      const settings = { ...DEFAULT_SETTINGS, ...(localRes.settings || {}) }
      const detailed = localRes.detailedMetrics || []
      const sessionCount = sessionRes.sessionSuspended || 0

      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000
      const today = detailed.filter(ts => ts > (now - oneDay)).length
      const week = detailed.filter(ts => ts > (now - 7 * oneDay)).length
      const month = detailed.filter(ts => ts > (now - 30 * oneDay)).length

      sendResponse({
        current,
        total,
        session: sessionCount,
        today,
        week,
        month,
        memorySaved: total * 80,
        currentMemorySaved: current * 80,
        openTabsCount: openTabs.length,
        maxOpenTabs: settings.maxOpenTabs,
        trackDetailedMetrics: settings.trackDetailedMetrics
      })
    })
    return true
  }

  if (msg.type === 'SUSPEND_CURRENT') {
    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      if (tabs[0]) sendResponse({ success: await suspendTab(tabs[0].id) })
      else sendResponse({ success: false })
    })
    return true
  }
  if (msg.type === 'SUSPEND_ALL') {
    suspendAll().then(count => sendResponse({ count }))
    return true
  }
  if (msg.type === 'RESTORE_ALL') {
    restoreAll().then(count => sendResponse({ count }))
    return true
  }
  if (msg.type === 'GET_SUSPENDED_LIST') {
    chrome.storage.local.get('suspendedTabs', res => sendResponse({ tabs: res.suspendedTabs || {} }))
    return true
  }
})

async function suspendAll() {
  const settings = await getSettings()
  const whitelist = await getWhitelist()
  const tabs = await chrome.tabs.query({ currentWindow: true })
  let count = 0
  for (const tab of tabs) {
    if (tab.active || tab.discarded || tab.audible) continue
    if (!tab.url || tab.url.startsWith('chrome')) continue
    if (isWhitelisted(tab.url, whitelist)) continue
    if (await suspendTab(tab.id)) count++
  }
  return count
}

async function restoreAll() {
  const res = await chrome.storage.local.get('suspendedTabs')
  const suspended = res.suspendedTabs || {}
  let count = 0
  for (const id in suspended) {
    try {
      await chrome.tabs.reload(parseInt(id, 10))
      count++
    } catch { }
  }
  await chrome.storage.local.set({ suspendedTabs: {} })
  updateBadge()
  return count
}

chrome.tabs.query({}, tabs => {
  tabs.forEach(t => { if (!lastActiveTimes[t.id]) lastActiveTimes[t.id] = Date.now() })
})
updateBadge()
