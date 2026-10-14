# ✨ AuraChat — Modern AI Chat Box (Zero API Key with Ollama)

A high-performance conversational AI chat application supporting **Ollama Local AI (Zero API Keys)** and **Google Gemini Cloud**. Built with real-time token streaming, 2026 live web grounding, two-way hands-free voice conversation, and glassmorphism UI.

---

## 🌟 Key Features

* 🦙 **Native Ollama Local AI (Zero API Key Needed)**: Connects directly to local Ollama on your computer (`http://localhost:11434`). Preconfigured with Meta's **`llama3.2:1b`** model for fast, 100% private, offline chatting.
* 🌐 **Live 2026 Web Search & Grounding**: Pulls verified recent web articles and discussions via built-in DuckDuckGo scraping.
* 🎙️ **Hands-Free Two-Way Voice Mode**: Speak naturally to the AI and have it respond out loud automatically via browser SpeechRecognition and SpeechSynthesis.
* ⚡ **Google Gemini Cloud (Optional)**: Dual-engine support—switch to Gemini Flash Lite anytime via Settings.
* 🎭 **4 Built-in Personas**: Friendly Pal, Deep Thinker, Concise & Direct, Storyteller.
* 🎨 **Glassmorphism Dark Mode**: Cyberpunk-inspired aesthetic with audio feedback and smooth token streaming.

---

## 🚀 Quick Start

### 1. Run with Ollama (Zero API Keys)
Ollama is pre-installed on this machine with `llama3.2:1b`. Just start the local server:

```bash
python server.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser. The app connects automatically to Ollama with **zero keys required**.

### 2. Live Cloudflare 24/7 Access Link
* **Public URL:** [https://teach-police-hartford-increase.trycloudflare.com](https://teach-police-hartford-increase.trycloudflare.com)
* **Cloudflare Workers Deployment:** `https://aura-ai.prasanthbehara81.workers.dev/`

---

## 🦙 How Ollama Local AI Works

AuraChat includes a built-in reverse proxy in `server.py` that connects the frontend directly to Ollama at `http://localhost:11434`:
- **Status Check:** `/api/ollama/status` checks if Ollama is running and lists installed models.
- **Streaming Chat:** `/api/ollama/chat` streams model generation in real-time using NDJSON chunks.

### Using Other Ollama Models:
You can pull and use any model from the Ollama library. In your terminal:
```bash
ollama run mistral
# or
ollama run deepseek-r1
```
Then in AuraChat Settings (⚙️), simply type the model name into the **Ollama Model** field and click **Save Settings**.

---

## ⌨️ Shortcuts & Controls
* `Enter`: Send message
* `Shift + Enter`: Insert newline
* `Voice Button (Microphone)`: Dictate message (Speech to Text)
* `Voice Talk Mode (Topbar)`: Toggle hands-free voice conversation
* `Settings (⚙️)`: Switch between Ollama and Gemini engines, change models, personas, or creativity temperature.
* `Web Search Toggle`: Ground AI responses with live 2026 web research.

---

## 📁 Project Architecture

```
AURA-AI/
├── index.html        # Glassmorphism chat interface & settings modal
├── style.css         # Modern dark-mode styling & animations
├── app.js            # State management, audio FX, Markdown & dual-engine controller
├── server.py         # Python streaming server with Ollama proxy & web search
└── README.md         # Documentation & quick start guide
```
