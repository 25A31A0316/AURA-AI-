/**
 * Aura AI - Real-Time Universal Assistant with Auto-Voice Talk
 * Features:
 * - Real-Time Web Grounding & Verified Sources
 * - Two-Way Voice Talk (Aura talks back out loud automatically!)
 * - Speech-to-Text Microphone Dictation
 * - Universal Scope: Ancient Antiquity to Real-Time 2026
 * - Multilingual Support (Telugu, Hindi, Spanish, French, English, etc.)
 */

const DEFAULT_SYSTEM_PROMPT = `You are Aura AI, an intelligent, helpful, and comprehensive AI assistant.
- COMPREHENSIVE DATA & ANSWERS: When asked questions (science, history, technology, news, data, coding, concepts, or tutorials), provide thorough, accurate, and complete information with all requested details, facts, numbers, and step-by-step explanations.
- STRUCTURE & FORMATTING: Use clean Markdown with bullet points, numbered lists, bold text, and code blocks to present data clearly.
- ADAPTIVE DEPTH: For casual greetings (like "hi" or "hello"), be warm, friendly, and natural. For questions, provide deep, informative, and complete data.
- MULTILINGUAL: Fluently understand and respond in the language used by the user (English, Telugu, Hindi, Spanish, French, etc.).`;

const state = {
  model: localStorage.getItem('aura_model') || 'llama3.2:1b',
  systemPrompt: (() => {
    const p = localStorage.getItem('aura_prompt');
    if (!p || p.includes('1-3 sentences') || p.includes('typically 1-3') || p.includes('CHRONOLOGICAL SCOPE') || p.includes('ancient prehistory')) {
      localStorage.setItem('aura_prompt', DEFAULT_SYSTEM_PROMPT);
      return DEFAULT_SYSTEM_PROMPT;
    }
    return p;
  })(),
  temperature: parseFloat(localStorage.getItem('aura_temp')) || 0.7,
  webSearch: localStorage.getItem('aura_web') !== 'false', // Default ON
  autoTalk: localStorage.getItem('aura_autotalk') !== 'false', // Default ON
  voiceLanguage: localStorage.getItem('aura_voice') || 'auto',
  messages: []
};

let isGenerating = false;
let abortCtrl = null;
let recognition = null;
let isListening = false;
let currentUtterance = null;
let activeSpeakingBtn = null;
let speechSilenceTimer = null;

// DOM Elements
const dom = {
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  modelIndicator: document.getElementById('modelIndicator'),
  btnToggleWeb: document.getElementById('btnToggleWeb'),
  webIcon: document.getElementById('webIcon'),
  webLabel: document.getElementById('webLabel'),
  btnToggleTalk: document.getElementById('btnToggleTalk'),
  talkIcon: document.getElementById('talkIcon'),
  talkLabel: document.getElementById('talkLabel'),
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
  updateAutoTalkUI();
  checkOllamaStatus();
  initVoiceFeatures();
  bindEvents();
});

function updateModelLabels() {
  if (dom.modelIndicator) {
    dom.modelIndicator.textContent = state.model;
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
      dom.webIcon.textContent = '🌐';
      dom.webLabel.textContent = 'Web: OFF';
    }
  }
}

function updateAutoTalkUI() {
  if (dom.btnToggleTalk) {
    if (state.autoTalk) {
      dom.btnToggleTalk.classList.add('active-toggle');
      dom.talkIcon.textContent = '🗣️';
      dom.talkLabel.textContent = 'Voice: ON';
      if (dom.voiceStatusHint) {
        dom.voiceStatusHint.textContent = 'Voice & Web Active';
      }
    } else {
      dom.btnToggleTalk.classList.remove('active-toggle');
      dom.talkIcon.textContent = '🔇';
      dom.talkLabel.textContent = 'Voice: OFF';
      if (dom.voiceStatusHint) {
        dom.voiceStatusHint.textContent = 'Simple & Private Chat';
      }
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
        dom.settingVoiceSelect.innerHTML = '<option value="auto">Auto-detect Language & Best Natural Voice</option>';
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
      showToast('🎙️ Listening... Speak naturally! Aura will talk back to you.');
      // Stop any current speaking while user talks
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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

        // Auto-submit after 1.2s of silence when final sentence detected
        clearTimeout(speechSilenceTimer);
        speechSilenceTimer = setTimeout(() => {
          if (isListening && dom.chatInput.value.trim().length > 0) {
            stopListening();
            sendMessage();
          }
        }, 1300);
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
      if (dom.chatInput.value.trim().length > 0 && !isGenerating) {
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
  clearTimeout(speechSilenceTimer);
  if (dom.btnVoiceInput) dom.btnVoiceInput.classList.remove('listening');
}

// Speak out loud (TTS)
function speakText(text, btnElement = null) {
  if (!('speechSynthesis' in window)) return;

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (activeSpeakingBtn) {
      activeSpeakingBtn.classList.remove('speaking');
      activeSpeakingBtn.querySelector('span').textContent = 'Speak';
      if (activeSpeakingBtn === btnElement) {
        activeSpeakingBtn = null;
        return;
      }
    }
  }

  // Strip real-time sources footer and code blocks so Aura talks naturally
  let speechContent = text.split('**🌐 Real-Time Sources:**')[0];
  speechContent = speechContent
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_#>-]/g, '')
    .trim();

  if (!speechContent) return;

  const utter = new SpeechSynthesisUtterance(speechContent);
  const voices = window.speechSynthesis.getVoices();

  // Smart natural voice selection
  if (state.voiceLanguage && state.voiceLanguage !== 'auto') {
    utter.lang = state.voiceLanguage;
  } else {
    // Pick highest quality natural voice
    const naturalVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural')) && v.lang.startsWith(navigator.language))
                      || voices.find(v => v.name.includes('Natural') || v.name.includes('Google'))
                      || voices[0];
    if (naturalVoice) utter.voice = naturalVoice;
  }

  utter.rate = 1.0;
  utter.pitch = 1.0;

  if (btnElement) {
    activeSpeakingBtn = btnElement;
    btnElement.classList.add('speaking');
    btnElement.querySelector('span').textContent = 'Stop';
  }

  utter.onstart = () => {
    if (dom.btnToggleTalk && state.autoTalk) {
      dom.btnToggleTalk.classList.add('pulse-accent');
    }
  };

  utter.onend = utter.onerror = () => {
    if (btnElement) {
      btnElement.classList.remove('speaking');
      btnElement.querySelector('span').textContent = 'Speak';
      activeSpeakingBtn = null;
    }
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
    showToast(state.webSearch ? '🌐 Real-Time Web Grounding Enabled' : '⭕ Web Grounding Disabled (Offline Only)');
  });

  // Voice talk toggle (Aura talks back out loud!)
  dom.btnToggleTalk.addEventListener('click', () => {
    state.autoTalk = !state.autoTalk;
    localStorage.setItem('aura_autotalk', state.autoTalk.toString());
    updateAutoTalkUI();
    if (!state.autoTalk && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    showToast(state.autoTalk ? '🗣️ Voice Talk Active: Aura will talk back to you out loud!' : '🔇 Voice Talk Muted: Text only');
  });

  // Voice input button (Microphone)
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

  dom.btnSend.addEventListener('click', () => {
    if (isGenerating) {
      if (abortCtrl) abortCtrl.abort();
    } else {
      sendMessage();
    }
  });
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
  if (window.speechSynthesis) window.speechSynthesis.cancel();

  // Hide welcome hero on first message
  dom.welcomeCard.style.display = 'none';

  // Add User Message
  state.messages.push({ role: 'user', content: text });
  appendMessage('user', text);

  // Clear Input
  dom.chatInput.value = '';
  dom.chatInput.style.height = 'auto';

  // Create AI Message bubble placeholder with visual thinking indicator
  const { row, bubble } = appendMessage('ai', '');
  bubble.innerHTML = `
    <div class="thinking-state">
      <div class="typing-dots"><span></span><span></span><span></span></div>
      <span class="thinking-label">Aura is thinking & gathering data...</span>
    </div>
  `;

  isGenerating = true;
  // Change btnSend to a Stop button
  dom.btnSend.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2"></rect>
    </svg>
  `;
  dom.btnSend.title = 'Stop generating';
  dom.btnSend.disabled = false;
  abortCtrl = new AbortController();

  let accumulatedResponse = '';
  let firstTokenReceived = false;

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
            if (!firstTokenReceived) {
              firstTokenReceived = true;
              bubble.innerHTML = '';
              bubble.classList.add('typing-cursor');
            }
            accumulatedResponse += token;
            bubble.innerHTML = renderMarkdown(accumulatedResponse);
            scrollToBottom();
          }
        } catch (_) {}
      }
    }

    if (!accumulatedResponse.trim()) {
      bubble.innerHTML = '<span style="color:#f87171;">⚠️ Aura was unable to generate an answer for this question. Please try asking again.</span>';
    }

    state.messages.push({ role: 'assistant', content: accumulatedResponse });
    const speakBtn = attachActionButtons(row, accumulatedResponse);

    // Auto-Speak: Aura talks back out loud automatically!
    if (state.autoTalk && accumulatedResponse) {
      speakText(accumulatedResponse, speakBtn);
    }

  } catch (err) {
    if (err.name !== 'AbortError') {
      bubble.innerHTML = `<span style="color:#f87171;">⚠️ Error: ${escapeHtml(err.message)}</span><br><small style="color:#94a3b8;">Make sure Ollama is running (\`ollama serve\`).</small>`;
    }
  } finally {
    bubble.classList.remove('typing-cursor');
    isGenerating = false;
    dom.btnSend.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
    `;
    dom.btnSend.title = 'Send message';
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
  if (!wrapper || wrapper.querySelector('.message-actions')) return null;

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
  return speakBtn;
}

// Lightweight Markdown Renderer (Code blocks, bold, lists, quotes, links)
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

  // Markdown links: [title](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1 ↗</a>');

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
