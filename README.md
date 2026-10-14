# ⚡ Aura AI — Clean, Private Local AI Chat

A fast, lightweight, and modern AI chat application powered by **local Ollama models** (default: Meta's **`llama3.2:1b`**). 
**100% free, completely private, zero API keys required.**

---

## 🌟 Highlights

* 🔒 **100% Local & Private**: All conversations run entirely on your own hardware via Ollama. No third-party data tracking.
* ⚡ **Zero API Keys**: No Google, OpenAI, or Anthropic subscriptions needed. Completely free forever.
* 🚀 **Real-Time Streaming**: Token-by-token streaming with smooth typing effects and code block copy buttons.
* 🎨 **Clean Glassmorphism UI**: Beautiful, distraction-free modern dark interface built with vanilla HTML/CSS/JS.
* ⚙️ **Customizable**: Change models (`llama3.2:1b`, `mistral`, `deepseek-r1`), adjust creativity temperature, or set custom system instructions.

---

## 🚀 Quick Start (1-Click)

### Option A: Using the Windows Launcher (Easiest)
Simply double-click **`run.bat`**. It will automatically:
1. Start the Ollama background service (if not already running).
2. Start the local web server on port 8000.
3. Open **`http://localhost:8000`** in your default web browser.

### Option B: From the Terminal
```bash
# 1. Start Ollama (if not already active)
ollama serve

# 2. Run the server
python server.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser!

---

## 🦙 Switching or Adding Models

Aura AI comes configured for Meta's ultra-lightweight **`llama3.2:1b`** model. To use any other model:

1. Download the model in your terminal:
   ```bash
   ollama run mistral
   # or
   ollama run deepseek-r1
   ```
2. Open Aura AI in your browser, click **Settings (⚙️)** in the top right, and type the model name into the **Ollama Model** field.
3. Click **Save Settings**!

---

## 📁 Clean Architecture

```
AURA-AI/
├── index.html        # Clean, modern single-page interface
├── styles.css        # Responsive dark-theme styling with glassmorphism
├── app.js            # Lightweight controller & streaming client (~180 lines)
├── server.py         # Robust Python server & Ollama streaming proxy (~70 lines)
├── run.bat           # 1-click Windows starter script
└── README.md         # Project documentation
```
