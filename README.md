# 🔍 Vizion — AI Image Analyzer

A sleek, minimalistic web app that analyzes images using **Google Gemini AI**. Upload any image and get instant AI-powered identification, descriptions, and tags — all running directly in your browser.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=flat&logo=google&logoColor=white)

---

## ✨ Features

- 🧠 **AI-Powered Analysis** — Uses Google Gemini (Flash Lite / Flash 2.0 / Flash 2.5) for accurate image recognition
- 🖼️ **Drag & Drop Upload** — Drop images directly or browse from files
- 📋 **Rich Results** — Get identification, category, description, emoji, and tags for every image
- 🎨 **Minimal Dark UI** — Clean split-layout with animated background orbs and staggered result animations
- 🔄 **Smart Fallback** — Automatically switches between Gemini models if one hits its quota
- 🔒 **Privacy First** — API key stored locally in your browser, images are never saved
- 📱 **Responsive** — Works on desktop and mobile devices
- ⚡ **Zero Dependencies** — Pure HTML, CSS, and JavaScript — no frameworks, no build step

---

## 🖥️ How It Works

| Step | Action |
|------|--------|
| 1 | Get a **free API key** from [Google AI Studio](https://aistudio.google.com/apikey) |
| 2 | Open the app and paste your key in the header |
| 3 | **Upload** an image (drag & drop or click to browse) |
| 4 | Click **Analyze** — results appear instantly on the right panel |

The AI returns:
- **Identification** — What the image is (e.g., "Red Passenger Train")
- **Category** — Animal, Vehicle, Food, Nature, Architecture, etc.
- **Emoji** — A representative emoji
- **Description** — 2-3 detailed sentences about the image
- **Tags** — 5 relevant keywords

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Raghav06-bit/Image-analyzer.git
cd Image-analyzer
```

### 2. Open in browser

Simply open `index.html` in your browser — no server or build step required:

```bash
# On Windows
start index.html

# On macOS
open index.html

# On Linux
xdg-open index.html
```

### 3. Add your API key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey) and create a free API key
2. Click **"Set Key"** in the app header
3. Paste your key and click **Save**

That's it! You're ready to analyze images.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic page structure |
| **CSS3** | Animations, grid layout, glassmorphism effects |
| **Vanilla JavaScript** | API integration, drag & drop, DOM manipulation |
| **Google Gemini API** | AI-powered image analysis |
| **Inter Font** | Clean, modern typography |

---

## 📁 Project Structure

```
Image-analyzer/
├── index.html     # Main HTML with split-panel layout
├── style.css      # Dark theme, animations, responsive design
├── script.js      # Gemini API, file handling, result rendering
└── README.md
```

---

## 🎨 UI Highlights

- **Split-panel layout** — Upload on the left, results on the right (no scrolling)
- **Animated gradient orbs** — Subtle floating background elements
- **Staggered animations** — Results appear with sequenced fade-up effects
- **Micro-interactions** — Hover effects on tags, buttons, and upload zone
- **Compact header** — API status indicator, model selector, and key management

---

## 🤖 Supported Models

| Model | Best For |
|-------|----------|
| **Gemini 2.0 Flash Lite** | Fastest, highest free quota (recommended) |
| **Gemini 2.0 Flash** | Balanced speed and accuracy |
| **Gemini 2.5 Flash** | Latest model, most capable |

The app automatically falls back to the next model if the selected one's quota is exceeded.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/Raghav06-bit">Raghav</a>
</p>