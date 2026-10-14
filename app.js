/**
 * Aura AI - Multilingual Assistant with Voice Chat & Live Web Grounding
 * Features:
 * - Local Ollama Streaming Proxy
 * - Speech-to-Text (Voice Input) & Text-to-Speech (Read Aloud)
 * - Multilingual System Prompt (English, Hindi, Telugu, Spanish, French, etc.)
 * - Live Web Search Grounding across all data sectors
 */

const DEFAULT_SYSTEM_PROMPT = `You are Aura AI, an intelligent, empathetic, versatile, and fluent multilingual assistant.
- You converse effortlessly in all world languages, including English, Hindi, Telugu, Tamil, Spanish, French, German, Japanese, Chinese, Arabic, and more.
- Always respond naturally in whichever language the user addresses you in, or as requested.
- You have access to live web articles and data across all sectors (news, science, tech, economics, health, and humanities).
- Provide accurate, structured, and insightful answers with clear markdown formatting.`;

const state = {
  model: localStorage.getItem('aura_model') || 'llama3.2:1b',
  systemPrompt: localStorage.getItem('aura_prompt') || DEFAULT_SYSTEM_PROMPT,
  temperature: parseFloat(localStorage.getItem('aura_temp')) || 0.7,
  webSearch: localStorage.getItem('aura_web') !== 'false', // Default ON
  voiceLanguage: localStorage.getItem('aura_voice') || 'auto',
  messages: []
};

let isGenerating = false;
let abortCtrl = null;
let recognition = null;
let isListening = false;
let currentUtterance = null;
let activeSpeakingBtn = null;

// DOM Elements
const dom = {
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  modelIndicator: document.getElementById('modelIndicator'),
  btnToggleWeb: document.getElementById('btnToggleWeb'),
  webIcon: document.getElementById('webIcon'),
  webLabel: document.getElementById('webLabel'),
  btnNewChat: document.getElementById('btnNewChat'),
  btnSettings: document.getElementById('btnSettings'),
  chatViewport: document.getElementById('chatViewport'),
  chatContainer: document.getElementById('chatContainer'),
  welcomeCard: document.getElementById('welcomeCard'),
  chatInput: document.getElementById('chatInput'),
  btnVoiceInput: document.getElementById('btnVoiceInput'),
  btnSend: document.getElementById('btnSend'),
  voiceStatusHint: document.getElementById('voiceStatusHint'),
  
  // Settings Modal
  settingsModal: document.getElementById('settingsModal'),
  btnCloseSettings: document.getElementById('btnCloseSettings'),
  btnCancelSettings: document.getElementById('btnCancelSettings'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  settingModel: document.getElementById('settingModel'),
  settingVoiceSelect: document.getElementById('settingVoiceSelect'),
  settingSystemPrompt: document.getElementById('settingSystemPrompt'),
  settingTemperature: document.getElementById('settingTemperature'),
  tempVal: document.getElementById('tempVal'),
  
  toast: document.getElementById('toast')
};

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  updateModelLabels();
  updateWebSearchUI();
  checkOllamaStatus();
  initVoiceFeatures();
  bindEvents();
});

function updateModelLabels() {
  if (dom.modelIndicator) {
    dom.modelIndicator.textContent = `Model: ${state.model}`;
  }
}

function updateWebSearchUI() {
  if (dom.btnToggleWeb) {
    if (state.webSearch) {
      dom.btnToggleWeb.classList.add('active-toggle');
      dom.webIcon.textContent = '🌐';
      dom.webLabel.textContent = 'Web: ON';
    } else {
      dom.btnToggleWeb.classList.remove('active-toggle');
      dom.webIcon.textContent = '⭕';
      dom.webLabel.textContent = 'Web: OFF';
    }
  }
}

// Check Ollama server status
async function checkOllamaStatus() {
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      const data = await res.json();
      if (data.online) {
        dom.statusDot.classList.add('online');
        dom.statusText.textContent = `🦙 ${state.model}`;
        return;
      }
    }
  } catch (_) {}
  dom.statusDot.classList.remove('online');
  dom.statusText.textContent = 'Ollama Offline';
}

// ============================================================
// VOICE CHAT (STT & TTS)
// ============================================================
function initVoiceFeatures() {
  // Populate system voices in settings
  if ('speechSynthesis' in window) {
    const populateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (dom.settingVoiceSelect) {
        dom.settingVoiceSelect.innerHTML = '<option value="auto">Auto-detect Language</option>';
        voices.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v.lang;
          opt.textContent = `${v.name} (${v.lang})`;
          if (v.lang === state.voiceLanguage) opt.selected = true;
          dom.settingVoiceSelect.appendChild(opt);
        });
      }
    };
    populateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = populateVoices;
    }
  }

  // Initialize SpeechRecognition (Microphone)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onstart = () => {
      isListening = true;
      if (dom.btnVoiceInput) dom.btnVoiceInput.classList.add('listening');
      showToast('🎙️ Listening... Speak in any language!');
    };

    recognition.onresult = (e) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        transcript += e.results[i][0].transcript;
      }
      if (transcript) {
        dom.chatInput.value = transcript;
        dom.chatInput.style.height = 'auto';
        dom.chatInput.style.height = Math.min(dom.chatInput.scrollHeight, 180) + 'px';
      }
    };

    recognition.onerror = (e) => {
      console.warn('Speech recognition error:', e.error);
      stopListening();
      if (e.error === 'not-allowed') {
        showToast('Microphone access blocked. Click the lock/mic icon in the address bar to allow.');
      }
    };

    recognition.onend = () => {
      stopListening();
      // If text was recognized, user can review and send
      if (dom.chatInput.value.trim().length > 0) {
        dom.chatInput.focus();
      }
    };
  } else {
    if (dom.btnVoiceInput) {
      dom.btnVoiceInput.title = 'Voice input requires Chrome, Edge, or a browser with SpeechRecognition.';
    }
  }
}

function toggleListening() {
  if (!recognition) {
    showToast('Voice input is not supported in this browser. Please use Chrome or Edge.');
    return;
  }
  if (isListening) {
    recognition.stop();
    stopListening();
  } else {
    try {
      recognition.start();
    } catch (_) {
      recognition.abort();
      setTimeout(() => recognition.start(), 100);
    }
  }
}

function stopListening() {
  isListening = false;
  if (dom.btnVoiceInput) dom.btnVoiceInput.classList.remove('listening');
}

// Text to Speech
function speakText(text, btn) {
  if (!('speechSynthesis' in window)) {
    showToast('Speech synthesis not supported in this browser.');
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (activeSpeakingBtn) {
      activeSpeakingBtn.classList.remove('speaking');
      activeSpeakingBtn.querySelector('span').textContent = 'Speak';
      if (activeSpeakingBtn === btn) {
        activeSpeakingBtn = null;
        return;
      }
    }
  }

  // Clean markdown syntax for speech
  const cleanSpeech = text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_#>-]/g, '')
    .trim();

  if (!cleanSpeech) return;

  const utter = new SpeechSynthesisUtterance(cleanSpeech);
  utter.rate = 1.0;
  utter.pitch = 1.0;

  // Set voice language if configured
  if (state.voiceLanguage && state.voiceLanguage !== 'auto') {
    utter.lang = state.voiceLanguage;
  }

  utter.onstart = () => {
    activeSpeakingBtn = btn;
    btn.classList.add('speaking');
    btn.querySelector('span').textContent = 'Stop';
  };

  utter.onend = utter.onerror = () => {
    btn.classList.remove('speaking');
    btn.querySelector('span').textContent = 'Speak';
    activeSpeakingBtn = null;
  };

  window.speechSynthesis.speak(utter);
}

// ============================================================
// EVENT HANDLERS
// ============================================================
function bindEvents() {
  // Web toggle
  dom.btnToggleWeb.addEventListener('click', () => {
    state.webSearch = !state.webSearch;
    localStorage.setItem('aura_web', state.webSearch.toString());
    updateWebSearchUI();
    showToast(state.webSearch ? '🌐 Live Web Grounding Enabled' : '⭕ Web Grounding Disabled (Offline Only)');
  });

  // Voice input button
  if (dom.btnVoiceInput) {
    dom.btnVoiceInput.addEventListener('click', toggleListening);
  }

  // New chat button
  dom.btnNewChat.addEventListener('click', () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    state.messages = [];
    dom.chatContainer.innerHTML = '';
    dom.chatContainer.appendChild(dom.welcomeCard);
    dom.welcomeCard.style.display = 'flex';
    dom.chatInput.value = '';
    dom.chatInput.focus();
    showToast('Fresh conversation started');
  });

  // Settings modal open/close
  dom.btnSettings.addEventListener('click', openSettings);
  dom.btnCloseSettings.addEventListener('click', closeSettings);
  dom.btnCancelSettings.addEventListener('click', closeSettings);
  dom.settingsModal.addEventListener('click', (e) => {
    if (e.target === dom.settingsModal) closeSettings();
  });

  dom.settingTemperature.addEventListener('input', (e) => {
    dom.tempVal.textContent = e.target.value;
  });

  dom.btnSaveSettings.addEventListener('click', () => {
    const newModel = dom.settingModel.value.trim() || 'llama3.2:1b';
    const newPrompt = dom.settingSystemPrompt.value.trim() || DEFAULT_SYSTEM_PROMPT;
    const newTemp = parseFloat(dom.settingTemperature.value) || 0.7;
    const newVoice = dom.settingVoiceSelect.value;

    state.model = newModel;
    state.systemPrompt = newPrompt;
    state.temperature = newTemp;
    state.voiceLanguage = newVoice;

    localStorage.setItem('aura_model', newModel);
    localStorage.setItem('aura_prompt', newPrompt);
    localStorage.setItem('aura_temp', newTemp.toString());
    localStorage.setItem('aura_voice', newVoice);

    updateModelLabels();
    checkOllamaStatus();
    closeSettings();
    showToast('Settings saved!');
  });

  // Starter suggestion cards click
  dom.welcomeCard.querySelectorAll('.starter-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      if (prompt) {
        dom.chatInput.value = prompt;
        sendMessage();
      }
    });
  });

  // Input textarea behavior
  dom.chatInput.addEventListener('input', () => {
    dom.chatInput.style.height = 'auto';
    dom.chatInput.style.height = Math.min(dom.chatInput.scrollHeight, 180) + 'px';
  });

  dom.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  dom.btnSend.addEventListener('click', sendMessage);
}

function openSettings() {
  dom.settingModel.value = state.model;
  dom.settingSystemPrompt.value = state.systemPrompt;
  dom.settingTemperature.value = state.temperature;
  dom.tempVal.textContent = state.temperature;
  dom.settingsModal.classList.add('open');
}

function closeSettings() {
  dom.settingsModal.classList.remove('open');
}

function showToast(msg) {
  dom.toast.textContent = msg;
  dom.toast.classList.add('show');
  setTimeout(() => dom.toast.classList.remove('show'), 2500);
}

function scrollToBottom() {
  dom.chatViewport.scrollTo({
    top: dom.chatViewport.scrollHeight,
    behavior: 'smooth'
  });
}

// ============================================================
// CHAT & STREAMING LOGIC
// ============================================================
async function sendMessage() {
  const text = dom.chatInput.value.trim();
  if (!text || isGenerating) return;

  stopListening();

  // Hide welcome hero on first message
  dom.welcomeCard.style.display = 'none';

  // Add User Message
  state.messages.push({ role: 'user', content: text });
  appendMessage('user', text);

  // Clear Input
  dom.chatInput.value = '';
  dom.chatInput.style.height = 'auto';

  // Create AI Message bubble placeholder
  const { row, bubble } = appendMessage('ai', '');
  bubble.classList.add('typing-cursor');

  isGenerating = true;
  dom.btnSend.disabled = true;
  abortCtrl = new AbortController();

  let accumulatedResponse = '';

  try {
    const payload = {
      model: state.model,
      messages: [
        { role: 'system', content: state.systemPrompt },
        ...state.messages
      ],
      webSearch: state.webSearch,
      stream: true,
      options: {
        temperature: state.temperature
      }
    };

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortCtrl.signal
    });

    if (!res.ok) {
      let errText = 'Failed to generate response';
      try {
        const errJson = await res.json();
        errText = errJson.error || errText;
      } catch (_) {}
      throw new Error(errText);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const chunk = JSON.parse(trimmed);
          const token = chunk.message?.content || '';
          if (token) {
            accumulatedResponse += token;
            bubble.innerHTML = renderMarkdown(accumulatedResponse);
            scrollToBottom();
          }
        } catch (_) {}
      }
    }

    state.messages.push({ role: 'assistant', content: accumulatedResponse });
    attachActionButtons(row, accumulatedResponse);

  } catch (err) {
    if (err.name !== 'AbortError') {
      bubble.innerHTML = `<span style="color:#f87171;">⚠️ Error: ${escapeHtml(err.message)}</span><br><small style="color:#94a3b8;">Make sure Ollama is running (\`ollama serve\`).</small>`;
    }
  } finally {
    bubble.classList.remove('typing-cursor');
    isGenerating = false;
    dom.btnSend.disabled = false;
    scrollToBottom();
  }
}

function appendMessage(role, text) {
  const row = document.createElement('div');
  row.className = `message-row ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'ai' ? '⚡' : '👤';

  const wrapper = document.createElement('div');
  wrapper.className = 'message-bubble-wrapper';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = role === 'ai' ? renderMarkdown(text) : escapeHtml(text).replace(/\n/g, '<br>');

  wrapper.appendChild(bubble);

  if (role === 'ai') {
    row.appendChild(avatar);
    row.appendChild(wrapper);
  } else {
    row.appendChild(wrapper);
  }

  dom.chatContainer.appendChild(row);
  scrollToBottom();
  return { row, bubble };
}

function attachActionButtons(row, fullText) {
  const wrapper = row.querySelector('.message-bubble-wrapper');
  if (!wrapper || wrapper.querySelector('.message-actions')) return;

  const actions = document.createElement('div');
  actions.className = 'message-actions';

  // Speak button
  const speakBtn = document.createElement('button');
  speakBtn.className = 'btn-msg-action';
  speakBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
    <span>Speak</span>
  `;
  speakBtn.addEventListener('click', () => speakText(fullText, speakBtn));

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn-msg-action';
  copyBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
    <span>Copy</span>
  `;
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(fullText).then(() => {
      copyBtn.querySelector('span').textContent = 'Copied!';
      setTimeout(() => copyBtn.querySelector('span').textContent = 'Copy', 1500);
    });
  });

  actions.appendChild(speakBtn);
  actions.appendChild(copyBtn);
  wrapper.appendChild(actions);
}

// Lightweight Markdown Renderer (Code blocks, bold, lists, quotes)
function renderMarkdown(raw) {
  if (!raw) return '';

  let html = raw;

  // Code blocks: ```lang ... ```
  html = html.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const cleanLang = lang.trim() || 'code';
    const escapedCode = escapeHtml(code.trim());
    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        <span>${cleanLang}</span>
        <button class="btn-copy-code" onclick="copyCode(this)">Copy</button>
      </div>
      <pre><code>${escapedCode}</code></pre>
    </div>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);

  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Bullet points
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Newlines into <br> (only outside pre blocks)
  const parts = html.split(/(<div class="code-block-wrapper">[\s\S]*?<\/div>)/);
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = parts[i].replace(/\n/g, '<br>');
  }
  return parts.join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.copyCode = function(btn) {
  const code = btn.closest('.code-block-wrapper').querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });
};
