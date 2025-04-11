# Streaming Mode (Tab Lock)

**Streaming Mode (Tab Lock)** is a Chrome extension designed to enhance your streaming experience by locking you into a single tab. Say goodbye to annoying pop-up ads and distractions while watching content online.

## 🚀 Features

- Locks your browser to a single tab during streaming sessions
- Prevents unwanted tab switching
- Helps reduce interruptions from pop-up ads
- Lightweight and easy to use

## 📦 Installation

1. Clone or download this repository to your local machine.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked** and select the project directory.
5. The extension should now be visible in your extensions bar.

## 🛠️ Project Structure

```
video_streaming_player/
├── background.js         # Service worker that handles tab locking logic
├── popup.html            # Popup UI shown when clicking the extension icon
├── icon.png              # Extension icon
├── manifest.json         # Chrome extension manifest
```

## 🔐 Permissions Used

- `tabs`: To monitor and control tab activity
- `activeTab`: To detect which tab is currently active
- `scripting`: To inject any necessary scripts
- `storage`: To save user preferences if needed

## 📋 Manifest Overview

- **Manifest Version**: 3
- **Service Worker**: `background.js`
- **Popup Interface**: `popup.html`
- **Icons**: Included in three sizes (16px, 48px, 128px)

