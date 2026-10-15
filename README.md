# ⚡ Aura AI — Simple, Clean & Private Local AI Chat Box

A fast, lightweight, and simple AI chat box powered by **local Ollama models** (Meta's **`llama3.2:1b`**) with **concise answers**, **optional real-time web search**, and **hands-free voice conversation** (Aura talks back out loud!).

**100% free, completely private, zero API keys required.**

---

## 🌟 Key Features

* 💬 **Simple, Crisp & Concise Responses**: No long lectures or over-explaining. Aura gets straight to the point in 1-3 conversational sentences.
* 🌐 **Smart Web Grounding**: Automatically searches the web for current facts, news, and 2026 events when needed, attaching clickable source links.
* 🗣️ **Two-Way Voice Talk**:
  - **Dictate**: Click the microphone to speak naturally.
  - **Aura Speaks**: Aura can read answers out loud like a real conversational partner.
* 🔒 **100% Local & Private**: Runs directly on your device via Ollama. No token costs, zero API keys.
* 🎨 **Clean, Minimalist Interface**: Dark glassmorphic design, friendly starter suggestions, and distraction-free chatting.

---

## 🌐 Live Access Links

* **Local Machine Access:** [http://localhost:8000](http://localhost:8000)
* **Cloudflare Public Tunnel:** [https://upper-female-marc-obligations.trycloudflare.com](https://upper-female-marc-obligations.trycloudflare.com)
* **Cloudflare Worker (Alternative):** [https://aura-ai.prasanthbehara81.workers.dev/](https://aura-ai.prasanthbehara81.workers.dev/)
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
