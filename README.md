# ⚡ Aura AI — Real-Time Universal Assistant with Auto-Voice Talk

A fast, lightweight, and modern AI chat application powered by **local Ollama models** (Meta's **`llama3.2:1b`**) with **real-time live web grounding across all sectors** and **hands-free two-way voice conversation** (Aura talks back out loud automatically!).

**100% free, completely private, zero API keys required.**

---

## 🌟 Key Capabilities

* 🌐 **Real-Time Live Web Grounding**: Dynamically fetches current live articles, breaking news, and sector-wide statistics (finance, technology, healthcare, energy, global politics) and attaches clickable verified source links.
* 🗣️ **Two-Way Voice Talk (Aura Speaks to You!)**:
  - **Speech-to-Text**: Click the microphone in the input dock to dictate your thoughts. Auto-submits after you finish speaking.
  - **Auto-Talk (TTS)**: Aura automatically speaks its answers out loud to you like a real conversational partner.
* 🏛️ **Universal Scope (Ancient Antiquity to 2026)**: Deep mastery of world history from ancient civilizations (Mesopotamia, Egypt, Indus Valley, Greece, Rome, Dynasty China, Mesoamerica) through medieval, renaissance, industrial, and real-time 2026 live web articles.
* 🗣️ **Multilingual Intelligence**: Speaks and understands all major languages fluently (English, Telugu, Hindi, Tamil, Spanish, French, German, Japanese, Chinese, Arabic, and more).
* 🔒 **100% Local & Private**: Chatting and inference runs on your own hardware via Ollama. No token costs, zero API keys.
* 🎨 **Modern Cyberpunk Glassmorphism UI**: Ambient background glow, live status dot, prompt starter cards, and Markdown code blocks with 1-click copy buttons.

---

## 🌐 Live Access Links

* **Local Machine Access:** [http://localhost:8000](http://localhost:8000)
* **Cloudflare 24/7 Public Tunnel:** [https://teach-police-hartford-increase.trycloudflare.com](https://teach-police-hartford-increase.trycloudflare.com)
* **GitHub Repository:** [https://github.com/25A31A0316/AURA-AI-](https://github.com/25A31A0316/AURA-AI-)

---

## 🚀 Quick Start (1-Click)

### Option A: Windows Launcher (Easiest)
Double-click **`run.bat`**. It will automatically:
1. Verify the local Ollama background service is running on port 11434.
2. Launch the Aura AI server on port 8000.
3. Open **`http://localhost:8000`** in your default web browser.

### Option B: Terminal
```bash
# 1. Start Ollama (if not already running)
ollama serve

# 2. Run the server
python server.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser!

---

## 📁 Clean Architecture

```
AURA-AI/
├── index.html        # Multilingual interface with voice controls & web toggle
├── styles.css        # Responsive dark-theme styling with glassmorphism
├── app.js            # Controller with Auto-Voice Talk & streaming (~260 lines)
├── server.py         # Streaming proxy & real-time live web grounding (~150 lines)
├── run.bat           # 1-click Windows launcher
└── README.md         # Documentation & quick start guide
```
