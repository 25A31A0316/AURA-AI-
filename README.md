# ⚡ Aura AI — Multilingual Assistant with Live Web Grounding & Voice Chat

A fast, lightweight, and modern AI chat application powered by **local Ollama models** (Meta's **`llama3.2:1b`**) with **live web access across all data sectors**, **multilingual fluency**, and **hands-free voice conversation**. 

**100% free, completely private, zero API keys required.**

---

## 🌟 Key Capabilities

* 🌐 **Live Web & Article Grounding**: Dynamically searches the web for current 2026 data, breaking news, scientific articles, and sector-wide statistics (finance, technology, healthcare, energy, global politics).
* 🗣️ **Multilingual Intelligence**: Speaks and understands all major languages fluently (English, Hindi, Telugu, Tamil, Spanish, French, German, Japanese, Chinese, Arabic, and more).
* 🎙️ **Voice Chat (STT & TTS)**:
  - **Speech-to-Text**: Click the microphone in the input dock to dictate messages in your native language.
  - **Read Aloud (TTS)**: Click the "Speak" button on any response to have Aura read it out loud with matching voice and accent.
* 🔒 **100% Local & Private**: Chatting and inference runs on your own hardware via Ollama. No token costs, zero API keys.
* 🎨 **Modern Cyberpunk Glassmorphism UI**: Ambient background glow, live status dot, prompt starter cards, and Markdown code blocks with 1-click copy buttons.

---

## 🚀 Quick Start (1-Click)

### Option A: Windows Launcher (Easiest)
Double-click **`run.bat`**. It will automatically:
1. Verify the local Ollama background service is running.
2. Launch the Aura AI server on port 8000.
3. Open **`http://localhost:8000`** in your browser.

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
├── app.js            # Controller with SpeechRecognition, TTS & streaming (~250 lines)
├── server.py         # Streaming proxy & DuckDuckGo sector-wide web search (~140 lines)
├── run.bat           # 1-click Windows launcher
└── README.md         # Documentation
```
