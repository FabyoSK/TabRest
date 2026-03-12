/**
 * TabRest - Injection Toast
 */

const CONFIG = {
  CONTAINER_ID: 'tabrest-toast-container',
  TOAST_DURATION_MS: 4000,
  FADE_DURATION_MS: 400,
  STYLES_ID: 'tabrest-styles',
  TOAST_CLASS: 'tabrest-toast',
  HIDING_CLASS: 'hiding',
}

const ZAP_ICON = `<svg class="tabrest-toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`

const COLORS = {
  background: '#181825',
  text: '#cdd6f4',
  border: 'rgba(203, 166, 247, 0.3)',
  accent: '#cba6f7',
  secondary: '#7f849c',
}

function createStyles() {
  const style = document.createElement('style')
  style.id = CONFIG.STYLES_ID
  style.textContent = `
    #${CONFIG.CONTAINER_ID} {
      position: fixed;
      bottom: 32px;
      right: 32px;
      z-index: 2147483647;
      pointer-events: none;
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
    }
    .${CONFIG.TOAST_CLASS} {
      background: ${COLORS.background};
      color: ${COLORS.text};
      border: 1px solid ${COLORS.border};
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
      animation: tabrest-fade-in 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tabrest-toast-icon {
      width: 16px;
      height: 16px;
      color: ${COLORS.accent};
    }
    .tabrest-toast-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .tabrest-toast-title {
      font-weight: 600;
      color: ${COLORS.accent};
    }
    .tabrest-toast-desc {
      font-size: 11px;
      color: ${COLORS.secondary};
    }
    @keyframes tabrest-fade-in {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .${CONFIG.TOAST_CLASS}.${CONFIG.HIDING_CLASS} {
      opacity: 0;
      transform: translateX(40px);
    }
  `
  return style
}

function createContainer() {
  const container = document.createElement('div')
  container.id = CONFIG.CONTAINER_ID
  return container
}

function createToastElement(tabName) {
  const toast = document.createElement('div')
  toast.className = CONFIG.TOAST_CLASS
  toast.innerHTML = `
    ${ZAP_ICON}
    <div class="tabrest-toast-content">
      <span class="tabrest-toast-title">Tab Resting</span>
      <span class="tabrest-toast-desc">${tabName} is now asleep</span>
    </div>
  `
  return toast
}

function showToast(tabName, container) {
  const toast = createToastElement(tabName)
  container.appendChild(toast)

  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add(CONFIG.HIDING_CLASS)
      setTimeout(() => toast.remove(), CONFIG.FADE_DURATION_MS)
    }
  }, CONFIG.TOAST_DURATION_MS)
}

export default function main() {
  const style = createStyles()
  document.head.appendChild(style)

  const container = createContainer()
  document.body.appendChild(container)

  const messageListener = (message) => {
    if (message.type === 'TAB_SUSPENDED') {
      showToast(message.tabName, container)
    }
  }

  chrome.runtime.onMessage.addListener(messageListener)

  return () => {
    chrome.runtime.onMessage.removeListener(messageListener)
    style.remove()
    container.remove()
  }
}
