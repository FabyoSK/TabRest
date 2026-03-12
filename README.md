# 💤 TabRest — Tab Suspension Extension

**Automatically suspend inactive tabs** to reduce memory/CPU usage and keep your browser fast.

## Features

- **Auto Suspension** — Tabs inactive for a configurable time are automatically suspended via `chrome.tabs.discard()`
- **Manual Controls** — Suspend current tab, suspend all inactive, or restore all from the popup
- **Smart Protection** — Pinned tabs, audio-playing tabs, and whitelisted domains are never suspended
- **Domain Whitelist** — Exclude specific sites from ever being suspended
- **Context Menus** — Right-click any page to suspend/restore tabs
- **Memory Stats** — See estimated memory savings at a glance

## Target Browsers

| Browser        | Supported |
|----------------|-----------|
| Google Chrome  | ✅        |
| Microsoft Edge | ✅        |
| Brave Browser  | ✅        |
| Opera          | ✅        |

## Installation

You can download the latest version of **TabRest** directly from the [GitHub Releases](https://github.com/FabyoSK/TabRest/releases) page.

### How to Install

1.  **Download**: Head to the [Releases](https://github.com/FabyoSK/TabRest/releases) page and download the latest `TabRest-v*-chrome.zip` file.
2.  **Extract**: Extract the downloaded zip file to a folder of your choice on your computer.
3.  **Open Extensions Page**: In your browser (Chrome, Edge, Brave, or Opera), go to the extensions management page:
    - **Chrome**: `chrome://extensions`
    - **Edge**: `edge://extensions`
    - **Brave**: `brave://extensions`
4.  **Enable Developer Mode**: Toggle the **Developer mode** switch in the top right corner (or side menu in some browsers).
5.  **Load Unpacked**: Click the **Load unpacked** button.
6.  **Select Folder**: Browse to and select the folder where you extracted the extension.
7.  **Done!**: TabRest is now installed. You can pin it to your toolbar for easy access.

## Project Structure

```
src/
├── manifest.json        # Extension manifest (MV3)
├── background.js        # Service worker — tab tracking, alarms, suspension logic
├── popup/
│   ├── index.html       # Popup UI shell
│   ├── scripts.js       # Popup logic & rendering
│   └── styles.css       # Popup styles
├── options/
│   ├── index.html       # Settings page shell
│   ├── scripts.js       # Settings logic & rendering
│   └── styles.css       # Settings page styles
└── images/
    └── icon.png         # Extension icon
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode (opens browser with extension loaded)
npm run dev

# Build for production
npm run build
```

## Permissions

| Permission    | Purpose                               |
|---------------|---------------------------------------|
| `tabs`        | Query and discard tabs                |
| `storage`     | Persist settings, whitelist data      |
| `contextMenus`| Right-click menu items               |
| `alarms`      | Periodic suspension checks            |
| `activeTab`   | Access to the currently active tab    |

## Settings

- **Idle Timeout** — 5min / 10min / 15min (default) / 30min / 1hr / Custom
- **Suspend Pinned Tabs** — Off by default
- **Restore Scroll Position** — On by default
- **Max Suspended Tabs** — Default 100
- **Background Only** — Only suspend non-foreground tabs
- **Domain Whitelist** — Add domains that should never be suspended
