/**
 * Theme synchronization for TabRest
 * Matches the extension UI to the browser's theme.
 */

const THEME_MAPPINGS = {
  toolbar: ['--card', '--ctp-mantle', '--input'],
  ntp_background: ['--background', '--ctp-base'],
  ntp_text: ['--foreground', '--ctp-text'],
  button_background: ['--primary', '--ctp-mauve'],
}

const FALLBACK_BORDER = 'rgba(128, 128, 128, 0.15)'

function rgbToCss(rgb) {
  if (!rgb) return null

  if (rgb.length === 4) {
    const alpha = typeof rgb[3] === 'number' ? (rgb[3] / 255).toFixed(2) : 1
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
  }
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

function applyColorMapping(themeRoot, cssProperty, rgbValue) {
  if (rgbValue) {
    themeRoot.style.setProperty(cssProperty, rgbValue)
  }
}

function applyThemeColors(themeRoot, themeColors) {
  Object.entries(THEME_MAPPINGS).forEach(([themeKey, cssProperties]) => {
    const rgbValue = rgbToCss(themeColors[themeKey])
    cssProperties.forEach(cssProperty => {
      applyColorMapping(themeRoot, cssProperty, rgbValue)
    })
  })

  if (themeColors.toolbar) {
    themeRoot.style.setProperty('--border', FALLBACK_BORDER)
  }
}

function applyTheme(theme) {
  if (!theme || !theme.colors) return

  const themeRoot = document.documentElement
  applyThemeColors(themeRoot, theme.colors)
}

function fetchAndApplyTheme() {
  if (!chrome.theme || !chrome.theme.getCurrent) return

  chrome.theme.getCurrent(applyTheme)
}

function setupThemeUpdateListener() {
  if (!chrome.theme || !chrome.theme.onUpdated) return

  chrome.theme.onUpdated.addListener(fetchAndApplyTheme)
}

export function startThemeSync() {
  fetchAndApplyTheme()
  setupThemeUpdateListener()
}
