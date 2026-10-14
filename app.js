/**
 * Aura AI - Clean, Lightweight Client Controller
 * 100% Local Ollama • Streaming Support • Zero API Keys
 */

// Application State
const state = {
  model: localStorage.getItem('aura_model') || 'llama3.2:1b',
  systemPrompt: localStorage.getItem('aura_prompt') || 'You are Aura, an intelligent, concise, and helpful conversational AI assistant.',
  temperature: parseFloat(localStorage.getItem('aura_temp')) || 0.7,
  messages: []
};

let isGenerating = false;
let abortCtrl = null;

// DOM Elements
const dom = {
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  modelIndicator: document.getElementById('modelIndicator'),
  btnNewChat: document.getElementById('btnNewChat'),
  btnSettings: document.getElementById('btnSettings'),
  chatViewport: document.getElementById('chatViewport'),
  chatContainer: document.getElementById('chatContainer'),
  welcomeCard: document.getElementById('welcomeCard'),
  chatInput: document.getElementById('chatInput'),
  btnSend: document.getElementById('btnSend'),
  
  // Settings Modal
  settingsModal: document.getElementById('settingsModal'),
  btnCloseSettings: document.getElementById('btnCloseSettings'),
  btnCancelSettings: document.getElementById('btnCancelSettings'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  settingModel: document.getElementById('settingModel'),
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
  checkOllamaStatus();
  bindEvents();
});

function updateModelLabels() {
  if (dom.modelIndicator) {
    dom.modelIndicator.textContent = `Model: ${state.model}`;
  }
}

// Check if Ollama is running on localhost:11434
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
// EVENT HANDLERS
// ============================================================
function bindEvents() {
  // New chat button
  dom.btnNewChat.addEventListener('click', () => {
    state.messages = [];
    dom.chatContainer.innerHTML = '';
    dom.chatContainer.appendChild(dom.welcomeCard);
    dom.welcomeCard.style.display = 'flex';
    dom.chatInput.value = '';
    dom.chatInput.focus();
    showToast('Started a new conversation');
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
    const newPrompt = dom.settingSystemPrompt.value.trim() || 'You are Aura, an intelligent assistant.';
    const newTemp = parseFloat(dom.settingTemperature.value) || 0.7;

    state.model = newModel;
    state.systemPrompt = newPrompt;
    state.temperature = newTemp;

    localStorage.setItem('aura_model', newModel);
    localStorage.setItem('aura_prompt', newPrompt);
    localStorage.setItem('aura_temp', newTemp.toString());

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

  // Hide welcome hero on first message
  dom.welcomeCard.style.display = 'none';

  // Add User Message
  state.messages.push({ role: 'user', content: text });
  appendMessage('user', text);

  // Clear Input
  dom.chatInput.value = '';
  dom.chatInput.style.height = 'auto';
  dom.chatInput.focus();

  // Create AI Message bubble placeholder
  const aiMessageBubble = appendMessage('ai', '');
  aiMessageBubble.classList.add('typing-cursor');

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
            aiMessageBubble.innerHTML = renderMarkdown(accumulatedResponse);
            scrollToBottom();
          }
        } catch (_) {}
      }
    }

    state.messages.push({ role: 'assistant', content: accumulatedResponse });

  } catch (err) {
    if (err.name !== 'AbortError') {
      aiMessageBubble.innerHTML = `<span style="color:#f87171;">⚠️ Error: ${escapeHtml(err.message)}</span><br><small style="color:#94a3b8;">Make sure Ollama is running (\`ollama serve\`).</small>`;
    }
  } finally {
    aiMessageBubble.classList.remove('typing-cursor');
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

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = role === 'ai' ? renderMarkdown(text) : escapeHtml(text).replace(/\n/g, '<br>');

  if (role === 'ai') {
    row.appendChild(avatar);
    row.appendChild(bubble);
  } else {
    row.appendChild(bubble);
  }

  dom.chatContainer.appendChild(row);
  scrollToBottom();
  return bubble;
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
