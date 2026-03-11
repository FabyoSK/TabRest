/**
 * Theme synchronization for TabRest
 * Matches the extension UI to the browser's theme.
 */

export function startThemeSync() {
  function rgbToCss(rgb) {
    if (!rgb) return null;
    if (rgb.length === 4) {
      const alpha = typeof rgb[3] === 'number' ? (rgb[3] / 255).toFixed(2) : 1;
      return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    }
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  function applyTheme(theme) {
    if (!theme || !theme.colors) return;

    const colors = theme.colors;
    const root = document.documentElement;

    const toolbar = rgbToCss(colors.toolbar);
    const ntpBackground = rgbToCss(colors.ntp_background);
    const ntpText = rgbToCss(colors.ntp_text);
    const buttonBackground = rgbToCss(colors.button_background);

    if (ntpBackground) {
      root.style.setProperty('--background', ntpBackground);
      root.style.setProperty('--ctp-base', ntpBackground);
    }
    
    if (ntpText) {
      root.style.setProperty('--foreground', ntpText);
      root.style.setProperty('--ctp-text', ntpText);
    }

    if (toolbar) {
      root.style.setProperty('--card', toolbar);
      root.style.setProperty('--ctp-mantle', toolbar);
      root.style.setProperty('--input', toolbar);
      root.style.setProperty('--border', 'rgba(128, 128, 128, 0.15)');
    }

    if (buttonBackground) {
      root.style.setProperty('--primary', buttonBackground);
      root.style.setProperty('--ctp-mauve', buttonBackground);
    }
  }

  // Initial application
  if (chrome.theme && chrome.theme.getCurrent) {
    chrome.theme.getCurrent((theme) => {
      applyTheme(theme);
    });

    // Listen for updates
    chrome.theme.onUpdated.addListener(() => {
      chrome.theme.getCurrent((theme) => {
        applyTheme(theme);
      });
    });
  }
}
