# ✨ AuraChat — Conversational Gemini AI Chat Box

A fast, beautifully styled conversational AI chat application powered by **Google Gemini**. Designed purely for seamless, responsive chatting with zero token costs on Google AI Studio's free tier.

![AuraChat Interface](screenshot_placeholder)

---

## 🌟 Key Features

* **⚡ Gemini Flash Lite & Pro**: Connects directly to Google Generative AI with real-time SSE token streaming. Preconfigured with active, ultra-fast Gemini models.
* **🎭 4 Built-In Personas**:
  * 🌟 **Friendly Pal**: Warm, upbeat, and empathetic everyday companion.
  * 💡 **Deep Thinker**: Philosophical, curious, intellectual exploration.
  * ⚡ **Concise & Direct**: Rapid, clear answers with zero fluff.
  * 🎭 **Storyteller**: Vivid narratives, metaphors, and creative dialogues.
* **🎙️ Voice Speech-to-Text**: Click the microphone button to dictate your thoughts directly into the chat.
* **🔊 Text-to-Speech**: Listen to any AI response read aloud with audio feedback.
* **🎵 Synthesized Audio FX**: Custom Web Audio API sound cues for message dispatch and replies (with one-click mute).
* **📝 Markdown & Syntax Highlighting**: Clean rendering of code blocks, one-click code copy, blockquotes, bold/italics, and lists.
* **💾 Multi-Conversation History**: Stores your chats locally in your browser so you never lose your history.
* **📤 Chat Export**: Download any conversation as a Markdown (`.md`) file anytime.
* **🔒 Privacy-First**: Your API key stays in your local browser storage and is sent only to Google's official Gemini endpoint.

---

## 🚀 Quick Start

### 1. How to run
You can simply double-click `index.html` to open it in any modern browser (Chrome, Edge, Firefox, Brave), or run the local Python server:

```bash
# In the project directory:
python server.py
```
This will automatically launch `http://localhost:8000` in your default browser.

---

### 2. Getting a 100% Free Gemini API Key (No Credit Card Required)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your standard Google account.
3. Click **Create API Key**.
4. In AuraChat, click **API Key** or open **Settings**, paste your key, and click **Save & Apply**!

---

## 🌐 Public Cloudflare Access & 24/7 Hosting

### Live Cloudflare Tunnel
AuraChat is connected to a Cloudflare Tunnel:
* **Public URL:** `https://teach-police-hartford-increase.trycloudflare.com`

### Permanent 24/7 Cloudflare Pages Deployment
To run 24/7 in the cloud without keeping your local computer running:
1. Push this repository to your GitHub account.
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Compute (Workers & Pages)** -> **Create application** -> **Pages**.
3. Select your GitHub repository and click **Deploy**!
4. Cloudflare will host AuraChat 24/7 across 300+ global data centers with an SSL certificate for free.
* `Enter` : Send message
* `Shift + Enter` : Insert newline
* `Microphone Button` : Start / Stop Voice recognition
* `Sound Button` : Toggle sound effects
* `Settings` : Change Persona, Model, or Creativity Temperature
