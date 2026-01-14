# ⚡ YouTube Preview Speed Control

_A small idea that turned into my first real project._  
This Chrome extension adds a **speed control button** to YouTube’s hover previews — because sometimes, even curiosity deserves a fast-forward button.

---

## 🌟 About This Project

This is more than code.  
It’s my first **self-built Chrome extension**, created from scratch with a simple thought —

> “If YouTube lets me mute or unmute previews, why can’t I change their speed too?”

From debugging `manifest.json` errors to finally seeing that tiny icon appear on the browser,  
this project became my first taste of _turning imagination into execution._

---

## 🚀 Features

- 🎛 Adds a **Speed Control Button** to YouTube’s video hover previews
- ⏩ Option to set speed between **0.5x → 1x → 1.5x → 2x**
- 💾 Saves your preferred preview speed across sessions
- 🧩 Integrates natively — looks like a part of YouTube itself
- ⚡ Lightweight, minimal, and non-intrusive
- ⌨️ **Keyboard Shortcuts**: Use `Shift + >` / `Shift + <` to adjust speed, or `S` to cycle

---

## 🧰 Installation

1. **Clone or download** this repository
2. Open Chrome and visit `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the project folder
5. Visit [YouTube](https://www.youtube.com) and hover over any video thumbnail
6. You’ll see a new “Speed” button appear — just like magic ✨

---

## 🕹️ Usage

2. Find the new **Speed button** in toolbar of chrome browser (top right corner)
1. Hover over any video thumbnail on YouTube
1. Click to cycle speeds: **0.5x → 1x → 1.5x → 2x**
1. **Shortcuts:**
    - `Shift + >`: Increase speed
    - `Shift + <`: Decrease speed
    - `s` or `S`: Cycle speed
1. Your choice persists for future previews

---

## 🧑‍💻 Tech Stack

- **Manifest V3** (Chrome extension framework)
- **JavaScript** (content scripts + storage API)
- **MutationObserver** for DOM event detection
- **Minimal inline CSS** for seamless UI blending

---

## 🧠 Development Notes

| File                    | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `manifest.json`         | Extension configuration (permissions, scripts, icons) |
| `content.js`            | Core logic: detecting previews, injecting buttons     |
| `background.js`         | Background script for state management                |
| `popup.html / popup.js` | (Optional) Toolbar interface experiments              |

---

## ❤️ My First Milestone

Every developer remembers their first working project —  
this one’s mine.  
A reminder that you don’t need to be a pro to build something real;  
you just need that one weekend, one idea, and one stubborn will to make it work.

> _“Mindset is what separates the BEST from REST” ~Virat Kohli_

---

## 🗺️ Future Plans

# Need your Valuable Contribution


- Custom speed presets, a slider (user-defined)
- Compact UI redesign for hover overlay (Bring this functionality below the caption on/off button during the preview)
- Publish on Chrome Web Store (once refined)
- Open-source collaboration invites 🤝

---

## 📜 License

MIT License — feel free to fork, modify, and make it better.  
If you do, just remember where the first spark came from 🔥

---

### 🙌 Author

**[Vicky Kumar]**

> A learner, a dreamer, and now — a creator.

---
