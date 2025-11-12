# YouTube Preview Speed Control

A lightweight Chrome extension that adds speed control to YouTube video previews.

## Features

- Adds a speed control button to YouTube video previews
- Toggle between 0.5x, 1x, 1.5x, and 2x playback speeds
- Speed preference persists across sessions
- Lightweight and non-intrusive
- Matches YouTube's native UI

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the extension directory
5. The extension should now be active on YouTube

## Usage

1. Hover over any video thumbnail on YouTube
2. In the preview overlay, find the speed button next to the mute button
3. Click the speed button to cycle through different speeds (0.5x → 1x → 1.5x → 2x)
4. Your speed preference will be remembered for future previews

## Development

- `manifest.json` - Extension configuration
- `content.js` - Main extension logic
- `background.js` - Background script for extension management

## License

MIT
