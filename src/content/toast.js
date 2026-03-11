/**
 * TabRest - Injection Toast
 */

export default function main() {
  // ─── Setup Styles ───────────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'tabrest-styles';
  style.textContent = `
    #tabrest-toast-container {
      position: fixed;
      bottom: 32px;
      right: 32px;
      z-index: 2147483647;
      pointer-events: none;
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
    }
    .tabrest-toast {
      background: #181825;
      color: #cdd6f4;
      border: 1px solid rgba(203, 166, 247, 0.3);
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
      color: #cba6f7;
    }
    .tabrest-toast-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .tabrest-toast-title {
      font-weight: 600;
      color: #cba6f7;
    }
    .tabrest-toast-desc {
      font-size: 11px;
      color: #7f849c;
    }
    @keyframes tabrest-fade-in {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .tabrest-toast.hiding {
      opacity: 0;
      transform: translateX(40px);
    }
  `;
  document.head.appendChild(style);

  // ─── Setup Container ────────────────────────────────────────────
  const container = document.createElement('div');
  container.id = 'tabrest-toast-container';
  document.body.appendChild(container);

  // ─── Functions ──────────────────────────────────────────────────
  function showToast(tabName) {
    const toast = document.createElement('div');
    toast.className = 'tabrest-toast';
    
    toast.innerHTML = `
      <svg class="tabrest-toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
      <div class="tabrest-toast-content">
        <span class="tabrest-toast-title">Tab Resting</span>
        <span class="tabrest-toast-desc">${tabName} is now asleep</span>
      </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 400);
      }
    }, 4000);
  }

  // ─── Listeners ───────────────────────────────────────────────────
  const messageListener = (msg) => {
    if (msg.type === 'TAB_SUSPENDED') {
      showToast(msg.tabName);
    }
  };

  chrome.runtime.onMessage.addListener(messageListener);

  // ─── Cleanup ─────────────────────────────────────────────────────
  return () => {
    chrome.runtime.onMessage.removeListener(messageListener);
    style.remove();
    container.remove();
  };
}
