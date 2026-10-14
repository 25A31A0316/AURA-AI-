# ⚡ Aura AI — Universal Intelligence from Ancient Antiquity to 2026

A fast, lightweight, and modern AI chat application powered by **local Ollama models** (Meta's **`llama3.2:1b`**) with **live web access across all data sectors**, **multilingual fluency**, and **hands-free voice conversation**. 

**100% free, completely private, zero API keys required.**

---

## 🌟 Key Capabilities

* 🏛️ **Universal Scope (Ancient Antiquity to 2026)**: Deep mastery of world history from ancient civilizations (Mesopotamia, Egypt, Indus Valley, Greece, Rome, Dynasty China, Mesoamerica) through medieval, renaissance, industrial, and real-time 2026 live web articles.\n* 🌐 **Live Web & Sector-Wide Grounding**: Automatically searches the internet for up-to-the-minute 2026 news, scientific discoveries, and sector-wide statistics (finance, technology, healthcare, space, energy, and global geopolitics).
* 🗣️ **Multilingual Intelligence**: Speaks and understands all major languages fluently (English, Hindi, Telugu, Tamil, Spanish, French, German, Japanese, Chinese, Arabic, and more).
* 🎙️ **Voice Chat (STT & TTS)**:
  - **Speech-to-Text**: Click the microphone in the input dock to dictate messages in your native language.
  - **Read Aloud (TTS)**: Click the "Speak" button on any response to have Aura read it out loud with matching voice and accent.
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

## 🗣️ Multilingual Prompts to Try

Aura AI seamlessly detects and replies in whatever language you speak:
- **Hindi (हिंदी):** *"नमस्ते! मुझे 2026 की नवीनतम तकनीकी प्रगति के बारे में बताएं।"*
- **Telugu (తెలుగు):** *"నమస్కారం! ఈరోజు ప్రపంచంలో జరుగుతున్న ముఖ్యమైన వార్తలేమిటి?"*
- **Spanish (Español):** *"¡Hola! ¿Cuáles son los principales avances en energía renovable este año?"*
- **French (Français):** *"Bonjour ! Peux-tu m'expliquer la physique quantique simplement ?"*
- **German (Deutsch):** *"Hallo! Kannst du mir bei der Optimierung dieses Python-Codes helfen?"*

---

## 🦙 Switching Models (e.g. DeepSeek-R1, Mistral)

Aura AI comes preconfigured with Meta's fast, lightweight **`llama3.2:1b`**. To switch to any other Ollama model:
1. Pull the model in your terminal or PowerShell:
   ```bash
   ollama run mistral
   # or
   ollama run deepseek-r1
   ```
2. In Aura AI, click **Settings (⚙️)** in the top right.
3. Enter the model name into the **Ollama Model** field and click **Save Settings**.

---

## 📁 Clean Architecture

```
AURA-AI/
├── index.html        # Multilingual interface with voice controls & web toggle
├── styles.css        # Responsive dark-theme styling with glassmorphism
├── app.js            # Controller with SpeechRecognition, TTS & streaming (~250 lines)
├── server.py         # Streaming proxy & DuckDuckGo sector-wide web search (~140 lines)
├── run.bat           # 1-click Windows launcher
└── README.md         # Documentation & quick start guide
```
