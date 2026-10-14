/**
 * AuraChat - Modern Gemini AI Chat Application
 * Features: Real-time streaming, Multi-chat persistence, Audio FX,
 * Speech-to-text / Text-to-speech, Personas, Markdown rendering.
 */

// ============================================================
// CONFIGURATION & STATE
// ============================================================

const PERSONAS = {
  friendly: {
    id: 'friendly',
    name: 'Friendly Pal',
    icon: '🌟',
    description: 'Warm, empathetic, witty, and upbeat everyday conversationalist.',
    systemInstruction: `You are Aura, a warm, thoughtful, empathetic, and witty conversational AI companion.
You speak naturally like a close, smart friend who is curious, attentive, and fun to talk to.
Use natural cadence, occasional conversational humor, and genuine engagement.
Format responses cleanly with markdown when appropriate.`
  },
  thinker: {
    id: 'thinker',
    name: 'Deep Thinker',
    icon: '💡',
    description: 'Philosophical, curious, intellectual, and thought-provoking.',
    systemInstruction: `You are Aura, an intellectual, philosophical, and reflective conversation partner.
You look at questions from multiple angles, ask thought-provoking follow-ups, and enjoy exploring ideas, concepts, and nuance with depth and elegance.`
  },
  concise: {
    id: 'concise',
    name: 'Concise & Direct',
    icon: '⚡',
    description: 'Short, snappy, direct to the point with zero unnecessary fluff.',
    systemInstruction: `You are Aura in concise mode. You provide clear, direct, and efficient answers.
Avoid filler words, introductory fluff, or apologies. Get straight to the essence with bullet points or brief paragraphs.`
  },
  creative: {
    id: 'creative',
    name: 'Storyteller',
    icon: '🎭',
    description: 'Vivid, imaginative, poetic, and great at narratives.',
    systemInstruction: `You are Aura, a creative storyteller and poet. You weave vivid imagery, metaphors, and evocative language into your conversations. You love brainstorming fictional worlds and imaginative scenarios.`
  }
};

const DEFAULT_API_KEY = '';
const DEFAULT_MODEL = 'gemini-flash-lite-latest';

const DEFAULT_STATE = {
  engine: 'ollama', // 'ollama' | 'gemini'
  ollamaModel: 'llama3.2:1b',
  apiKey: DEFAULT_API_KEY,
  model: DEFAULT_MODEL,
  persona: 'friendly',
  temperature: 0.8,
  soundEnabled: true,
  webSearchEnabled: true,
  voiceTalkMode: false,
  currentChatId: null,
  chats: []
};

let state = loadState();
let isGenerating = false;
let abortController = null;
let currentSpeechUtterance = null;
let recognition = null;
let isListening = false;

// Web Audio API Sound Synthesizer (No external asset files needed)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'send') {
      // Crisp subtle upward tick
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'receive') {
      // Pleasant welcoming chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch (err) {
    // Non-critical audio error
    console.debug('Audio error', err);
  }
}

// ============================================================
// STORAGE & STATE MANAGEMENT
// ============================================================

function loadState() {
  try {
    const saved = localStorage.getItem('aurachat_state_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      const merged = { ...DEFAULT_STATE, ...parsed };
      merged.engine = merged.engine || 'ollama';
      merged.ollamaModel = merged.ollamaModel || 'llama3.2:1b';
      // Use active default key if none exists or if it was the revoked test token
      if (!merged.apiKey || merged.apiKey.trim().length === 0 || merged.apiKey === '') {
        merged.apiKey = DEFAULT_API_KEY;
      }
      const validModels = [
        'gemini-flash-lite-latest',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-3.8-flash',
        'gemini-pro-latest'
      ];
      if (!validModels.includes(merged.model) || merged.model === 'gemini-1.5-flash' || merged.model === 'gemini-2.0-flash' || merged.model === 'gemini-2.5-flash') {
        merged.model = DEFAULT_MODEL;
      }
      return merged;
    }
  } catch (e) {
    console.warn('Failed to parse saved state', e);
  }
  return { ...DEFAULT_STATE };
}

function saveState() {
  try {
    localStorage.setItem('aurachat_state_v1', JSON.stringify({
      apiKey: state.apiKey,
      model: state.model,
      persona: state.persona,
      temperature: state.temperature,
      soundEnabled: state.soundEnabled,
      webSearchEnabled: state.webSearchEnabled,
      voiceTalkMode: state.voiceTalkMode,
      currentChatId: state.currentChatId,
      chats: state.chats
    }));
  } catch (e) {
    console.warn('Failed to save state to localStorage', e);
  }
}

function getCurrentChat() {
  if (!state.currentChatId) return null;
  return state.chats.find(c => c.id === state.currentChatId) || null;
}

function createNewChat() {
  const newChat = {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: 'New Conversation',
    createdAt: Date.now(),
    messages: []
  };
  state.chats.unshift(newChat);
  state.currentChatId = newChat.id;
  saveState();
  renderChatHistory();
  renderActiveChat();
  focusInput();
}

function deleteChat(chatId, e) {
  if (e) e.stopPropagation();
  state.chats = state.chats.filter(c => c.id !== chatId);
  if (state.currentChatId === chatId) {
    state.currentChatId = state.chats.length > 0 ? state.chats[0].id : null;
    if (!state.currentChatId) {
      createNewChat();
      return;
    }
  }
  saveState();
  renderChatHistory();
  renderActiveChat();
  showToast('Conversation deleted');
}

// ============================================================
// DOM ELEMENTS
// ============================================================

const dom = {
  appSidebar: document.getElementById('appSidebar'),
  btnToggleSidebar: document.getElementById('btnToggleSidebar'),
  btnSidebarClose: document.getElementById('btnSidebarClose'),
  btnNewChat: document.getElementById('btnNewChat'),
  chatHistoryList: document.getElementById('chatHistoryList'),
  apiStatusBanner: document.getElementById('apiStatusBanner'),
  apiStatusText: document.getElementById('apiStatusText'),
  btnOpenSettings: document.getElementById('btnOpenSettings'),
  btnTopbarSettings: document.getElementById('btnTopbarSettings'),
  btnClearCurrentChat: document.getElementById('btnClearCurrentChat'),
  btnQuickPersona: document.getElementById('btnQuickPersona'),
  sidebarPersonaIcon: document.getElementById('sidebarPersonaIcon'),
  sidebarPersonaName: document.getElementById('sidebarPersonaName'),

  chatTitleHeader: document.getElementById('chatTitleHeader'),
  currentModelBadge: document.getElementById('currentModelBadge'),
  currentPersonaHeader: document.getElementById('currentPersonaHeader'),
  btnVoiceModeToggle: document.getElementById('btnVoiceModeToggle'),
  voiceModeIcon: document.getElementById('voiceModeIcon'),
  voiceModeLabel: document.getElementById('voiceModeLabel'),
  btnWebSearchToggle: document.getElementById('btnWebSearchToggle'),
  webSearchIcon: document.getElementById('webSearchIcon'),
  webSearchLabel: document.getElementById('webSearchLabel'),
  btnSoundToggle: document.getElementById('btnSoundToggle'),
  soundIcon: document.getElementById('soundIcon'),
  soundLabel: document.getElementById('soundLabel'),
  btnExportChat: document.getElementById('btnExportChat'),

  chatScrollArea: document.getElementById('chatScrollArea'),
  messagesContainer: document.getElementById('messagesContainer'),
  welcomeHero: document.getElementById('welcomeHero'),
  heroGreetingText: document.getElementById('heroGreetingText'),
  btnScrollBottom: document.getElementById('btnScrollBottom'),

  messageInput: document.getElementById('messageInput'),
  btnVoiceInput: document.getElementById('btnVoiceInput'),
  btnSendMessage: document.getElementById('btnSendMessage'),
  inputCharCount: document.getElementById('inputCharCount'),
  linkApiKeyReminder: document.getElementById('linkApiKeyReminder'),

  settingsModal: document.getElementById('settingsModal'),
  btnCloseSettings: document.getElementById('btnCloseSettings'),
  btnCancelSettings: document.getElementById('btnCancelSettings'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  btnToggleApiKeyEye: document.getElementById('btnToggleApiKeyEye'),
  btnTestApiKey: document.getElementById('btnTestApiKey'),
  apiKeyTestStatus: document.getElementById('apiKeyTestStatus'),
  modelSelect: document.getElementById('modelSelect'),
  personaSelectionGrid: document.getElementById('personaSelectionGrid'),
  temperatureRange: document.getElementById('temperatureRange'),
  temperatureVal: document.getElementById('temperatureVal'),

  engineSelect: document.getElementById('engineSelect'),
  ollamaConfigSection: document.getElementById('ollamaConfigSection'),
  geminiConfigSection: document.getElementById('geminiConfigSection'),
  geminiModelGroup: document.getElementById('geminiModelGroup'),
  ollamaModelInput: document.getElementById('ollamaModelInput'),
  btnRefreshOllama: document.getElementById('btnRefreshOllama'),
  ollamaConnectionBadge: document.getElementById('ollamaConnectionBadge'),
  toastContainer: document.getElementById('toastContainer')
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initGreetings();
  initSettingsForm();
  initSpeechRecognition();
  bindEvents();

  // Ensure there is at least one active chat
  if (!state.chats || state.chats.length === 0) {
    createNewChat();
  } else {
    if (!state.currentChatId || !getCurrentChat()) {
      state.currentChatId = state.chats[0].id;
    }
    renderChatHistory();
    renderActiveChat();
  }

  updateApiStatusUI();
  updateSoundButtonUI();
  updateWebSearchButtonUI();
  updateVoiceModeButtonUI();
  updatePersonaBadgeUI();
});

function initGreetings() {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';
  
  if (dom.heroGreetingText) {
    dom.heroGreetingText.textContent = `${greeting}, how can I brighten your day?`;
  }
}

function updateSoundButtonUI() {
  if (state.soundEnabled) {
    dom.soundIcon.textContent = '🔊';
    dom.soundLabel.textContent = 'Sound On';
    dom.btnSoundToggle.classList.remove('active-accent');
  } else {
    dom.soundIcon.textContent = '🔇';
    dom.soundLabel.textContent = 'Muted';
    dom.btnSoundToggle.classList.add('active-accent');
  }
}

function updateVoiceModeButtonUI() {
  if (!dom.btnVoiceModeToggle) return;
  if (state.voiceTalkMode) {
    dom.btnVoiceModeToggle.className = 'btn-topbar voice-active';
    dom.voiceModeIcon.textContent = '🗣️';
    dom.voiceModeLabel.textContent = 'Voice Talk: ON';
  } else {
    dom.btnVoiceModeToggle.className = 'btn-topbar';
    dom.voiceModeIcon.textContent = '🎙️';
    dom.voiceModeLabel.textContent = 'Voice Talk: OFF';
  }
}

function updateWebSearchButtonUI() {
  if (!dom.btnWebSearchToggle) return;
  if (state.webSearchEnabled) {
    dom.btnWebSearchToggle.classList.add('active-accent');
    dom.webSearchIcon.textContent = '🌐';
    dom.webSearchLabel.textContent = 'Web & 2026: ON';
  } else {
    dom.btnWebSearchToggle.classList.remove('active-accent');
    dom.webSearchIcon.textContent = '⭕';
    dom.webSearchLabel.textContent = 'Web: OFF';
  }
}

async function fetchLiveWebResults(query) {
  try {
    const cleanQ = query.trim().replace(/[^\w\s-]/g, ' ').substring(0, 100);
    const resp = await fetch(`/api/search?q=${encodeURIComponent(cleanQ)}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.results || [];
  } catch (err) {
    console.debug('Search API error or offline mode:', err);
    return [];
  }
}

function formatModelName(model) {
  if (state.engine === 'ollama') {
    return `🦙 ${state.ollamaModel || 'llama3.2:1b'}`;
  }
  if (model === 'gemini-flash-lite-latest') return 'Gemini Flash Lite';
  if (model === 'gemini-3.1-flash-lite') return 'Gemini 3.1 Flash Lite';
  if (model === 'gemini-flash-latest') return 'Gemini Flash Latest';
  if (model === 'gemini-3.8-flash') return 'Gemini 3.8 Flash';
  if (model === 'gemini-pro-latest') return 'Gemini Pro Latest';
  return (model || 'Gemini').replace('gemini-', 'Gemini ').replace(/-/g, ' ');
}

function updatePersonaBadgeUI() {
  const currentPersona = PERSONAS[state.persona] || PERSONAS.friendly;
  dom.sidebarPersonaIcon.textContent = currentPersona.icon;
  dom.sidebarPersonaName.textContent = currentPersona.name;
  dom.currentPersonaHeader.textContent = `${currentPersona.icon} ${currentPersona.name}`;
  dom.currentModelBadge.textContent = formatModelName(state.engine === 'ollama' ? state.ollamaModel : state.model);
}

async function checkOllamaStatus() {
  try {
    const res = await fetch('/api/ollama/status');
    if (res.ok) {
      const data = await res.json();
      if (data.running) {
        if (dom.ollamaConnectionBadge) {
          dom.ollamaConnectionBadge.innerHTML = '🟢 Connected';
          dom.ollamaConnectionBadge.style.color = '#4ade80';
        }
        if (data.models && data.models.length > 0 && dom.ollamaModelInput && !dom.ollamaModelInput.value) {
          dom.ollamaModelInput.value = data.models[0];
          state.ollamaModel = data.models[0];
        }
        return true;
      }
    }
  } catch (_) {}
  if (dom.ollamaConnectionBadge) {
    dom.ollamaConnectionBadge.innerHTML = '🔴 Offline';
    dom.ollamaConnectionBadge.style.color = '#f87171';
  }
  return false;
}

function updateApiStatusUI() {
  if (state.engine === 'ollama') {
    dom.apiStatusBanner.className = 'api-status-banner';
    dom.apiStatusText.textContent = `🦙 Ollama (${state.ollamaModel || 'llama3.2'}) - Zero Key`;
    dom.btnTopbarSettings.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      <span>🦙 Ollama</span>
    `;
    dom.btnTopbarSettings.classList.remove('active-accent');
  } else {
    if (state.apiKey && state.apiKey.trim().length > 10) {
      dom.apiStatusBanner.className = 'api-status-banner';
      dom.apiStatusText.textContent = 'Gemini API Active';
      dom.btnTopbarSettings.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <span>Gemini Active</span>
      `;
      dom.btnTopbarSettings.classList.remove('active-accent');
    } else {
      dom.apiStatusBanner.className = 'api-status-banner no-key';
      dom.apiStatusText.textContent = 'API Key Needed';
      dom.btnTopbarSettings.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>Set Key</span>
      `;
      dom.btnTopbarSettings.classList.add('active-accent');
    }
  }
}

// ============================================================
// EVENT BINDINGS
// ============================================================


async function testApiKeyConnection() {
  const inputKey = dom.apiKeyInput ? dom.apiKeyInput.value.trim() : '';
  const statusEl = dom.apiKeyTestStatus;
  const btn = dom.btnTestApiKey;
  if (!statusEl) return;

  if (!inputKey || inputKey.length < 15) {
    statusEl.innerHTML = '<span style="color:#f87171;">⚠️ Enter a valid API key first.</span>';
    return;
  }

  if (btn) btn.disabled = true;
  statusEl.innerHTML = '<span style="color:#38bdf8;">🔄 Testing connection...</span>';

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${inputKey}`);
    if (res.ok) {
      statusEl.innerHTML = '<span style="color:#4ade80;font-weight:600;">✅ Key is valid & working!</span>';
    } else {
      let msg = '';
      try {
        const json = await res.json();
        msg = json?.error?.message || res.statusText;
      } catch (_) {
        msg = res.statusText;
      }
      statusEl.innerHTML = `<span style="color:#f87171;">❌ Error (${res.status}): ${escapeHtml(msg.substring(0, 80))}</span>`;
    }
  } catch (err) {
    statusEl.innerHTML = `<span style="color:#f87171;">❌ Network error: ${escapeHtml(err.message)}</span>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function bindEvents() {
  // Sidebar toggle
  dom.btnToggleSidebar.addEventListener('click', () => {
    dom.appSidebar.classList.toggle('collapsed');
    dom.appSidebar.classList.toggle('mobile-open');
    playSound('click');
  });

  dom.btnSidebarClose.addEventListener('click', () => {
    dom.appSidebar.classList.remove('mobile-open');
    playSound('click');
  });

  dom.btnNewChat.addEventListener('click', () => {
    createNewChat();
    playSound('click');
    if (window.innerWidth <= 860) {
      dom.appSidebar.classList.remove('mobile-open');
    }
  });

  // Voice mode toggle
  if (dom.btnVoiceModeToggle) {
    dom.btnVoiceModeToggle.addEventListener('click', async () => {
      state.voiceTalkMode = !state.voiceTalkMode;
      saveState();
      updateVoiceModeButtonUI();
      playSound('click');
      if (state.voiceTalkMode) {
        showToast('Voice Conversation Mode Active! Aura will talk and listen.');
        speakText('Voice conversation mode is active. What would you like to talk about?', null, () => {
          if (state.voiceTalkMode && !isListening) {
            toggleVoiceInput();
          }
        });
      } else {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        stopListening();
        showToast('Voice conversation mode disabled');
      }
    });
  }

  // Web search toggle
  if (dom.btnWebSearchToggle) {
    dom.btnWebSearchToggle.addEventListener('click', () => {
      state.webSearchEnabled = !state.webSearchEnabled;
      saveState();
      updateWebSearchButtonUI();
      playSound('click');
      showToast(state.webSearchEnabled ? 'Live Web & 2026 search enabled' : 'Live web search disabled');
    });
  }

  // Sound toggle
  dom.btnSoundToggle.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    saveState();
    updateSoundButtonUI();
    if (state.soundEnabled) playSound('receive');
  });

  // Settings modal
  const openSettings = () => {
    initSettingsForm();
    if (dom.settingsModal) dom.settingsModal.classList.add('open');
    playSound('click');
  };
  if (dom.btnOpenSettings) dom.btnOpenSettings.addEventListener('click', openSettings);
  if (dom.btnTopbarSettings) dom.btnTopbarSettings.addEventListener('click', openSettings);
  if (dom.btnQuickPersona) dom.btnQuickPersona.addEventListener('click', openSettings);
  if (dom.linkApiKeyReminder) dom.linkApiKeyReminder.addEventListener('click', openSettings);

  if (dom.btnCloseSettings) dom.btnCloseSettings.addEventListener('click', closeSettingsModal);
  if (dom.btnCancelSettings) dom.btnCancelSettings.addEventListener('click', closeSettingsModal);

  if (dom.settingsModal) {
    dom.settingsModal.addEventListener('click', (e) => {
      if (e.target === dom.settingsModal) closeSettingsModal();
    });
  }

  if (dom.btnSaveSettings) dom.btnSaveSettings.addEventListener('click', saveSettingsFromForm);

  // Engine selection switch
  if (dom.engineSelect) {
    dom.engineSelect.addEventListener('change', (e) => {
      toggleEngineUI(e.target.value);
    });
  }
  if (dom.btnRefreshOllama) {
    dom.btnRefreshOllama.addEventListener('click', async () => {
      showToast('Checking Ollama...');
      const ok = await checkOllamaStatus();
      if (ok) showToast('🟢 Ollama is running!');
      else showToast('🔴 Ollama not detected on port 11434');
    });
  }
  if (dom.btnTestApiKey) {
    dom.btnTestApiKey.addEventListener('click', testApiKeyConnection);
  }

  if (dom.btnToggleApiKeyEye && dom.apiKeyInput) {
    dom.btnToggleApiKeyEye.addEventListener('click', () => {
      const isPass = dom.apiKeyInput.type === 'password';
      dom.apiKeyInput.type = isPass ? 'text' : 'password';
    });
  }

  // Temperature range slider display
  if (dom.temperatureRange && dom.temperatureVal) {
    dom.temperatureRange.addEventListener('input', (e) => {
      dom.temperatureVal.textContent = e.target.value;
    });
  }

  // Persona card clicks in settings
  if (dom.personaSelectionGrid) {
    dom.personaSelectionGrid.querySelectorAll('.persona-choice-card').forEach(card => {
      card.addEventListener('click', () => {
        dom.personaSelectionGrid.querySelectorAll('.persona-choice-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        playSound('click');
      });
    });
  }

  // Input textarea behavior
  if (dom.messageInput) {
    dom.messageInput.addEventListener('input', () => {
      resizeInputTextarea();
      updateCharCount();
    });

    dom.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserSubmit();
      }
    });
  }

  if (dom.btnSendMessage) {
    dom.btnSendMessage.addEventListener('click', () => {
      handleUserSubmit();
    });
  }

  // Clear current chat
  if (dom.btnClearCurrentChat) {
    dom.btnClearCurrentChat.addEventListener('click', () => {
      const chat = getCurrentChat();
      if (!chat || chat.messages.length === 0) return;
      if (confirm('Clear all messages in this conversation?')) {
        chat.messages = [];
        saveState();
        renderActiveChat();
        showToast('Conversation cleared');
        playSound('click');
      }
    });
  }

  // Export chat
  if (dom.btnExportChat) {
    dom.btnExportChat.addEventListener('click', exportCurrentChat);
  }

  // Scroll to bottom floating button
  if (dom.chatScrollArea && dom.btnScrollBottom) {
    dom.chatScrollArea.addEventListener('scroll', () => {
      const fromBottom = dom.chatScrollArea.scrollHeight - dom.chatScrollArea.scrollTop - dom.chatScrollArea.clientHeight;
      if (fromBottom > 240) {
        dom.btnScrollBottom.classList.add('visible');
      } else {
        dom.btnScrollBottom.classList.remove('visible');
      }
    });

    dom.btnScrollBottom.addEventListener('click', () => {
      scrollToBottom(true);
      playSound('click');
    });
  }

  // Starter card click triggers (delegated to container + direct cards)
  if (dom.welcomeHero) {
    dom.welcomeHero.addEventListener('click', (e) => {
      const card = e.target.closest('.starter-card');
      if (card) {
        const promptText = card.getAttribute('data-prompt');
        if (promptText && dom.messageInput) {
          dom.messageInput.value = promptText;
          resizeInputTextarea();
          handleUserSubmit();
        }
      }
    });
  }
  document.querySelectorAll('.starter-card').forEach(card => {
    card.addEventListener('click', () => {
      const promptText = card.getAttribute('data-prompt');
      if (promptText && dom.messageInput) {
        dom.messageInput.value = promptText;
        resizeInputTextarea();
        handleUserSubmit();
      }
    });
  });

  // Voice speech-to-text
  if (dom.btnVoiceInput) {
    dom.btnVoiceInput.addEventListener('click', toggleVoiceInput);
  }
}

function closeSettingsModal() {
  if (dom.settingsModal) dom.settingsModal.classList.remove('open');
}

function toggleEngineUI(engine) {
  const isOllama = engine === 'ollama';
  if (dom.ollamaConfigSection) dom.ollamaConfigSection.style.display = isOllama ? 'block' : 'none';
  if (dom.geminiConfigSection) dom.geminiConfigSection.style.display = isOllama ? 'none' : 'block';
  if (dom.geminiModelGroup) dom.geminiModelGroup.style.display = isOllama ? 'none' : 'block';
  const engineHint = document.getElementById('engineHint');
  if (engineHint) {
    engineHint.textContent = isOllama
      ? '🦙 Runs directly on your computer via Ollama. No API key, zero token cost, complete privacy.'
      : '✨ Cloud-hosted Google Gemini models. Requires a free Google AI Studio API key.';
  }
}

function initSettingsForm() {
  if (dom.engineSelect) dom.engineSelect.value = state.engine || 'ollama';
  if (dom.ollamaModelInput) dom.ollamaModelInput.value = state.ollamaModel || 'llama3.2:1b';
  toggleEngineUI(state.engine || 'ollama');

  if (dom.apiKeyInput) dom.apiKeyInput.value = state.apiKey || '';
  if (dom.modelSelect) dom.modelSelect.value = state.model || DEFAULT_MODEL;
  if (dom.temperatureRange) dom.temperatureRange.value = state.temperature ?? 0.8;
  if (dom.temperatureVal) dom.temperatureVal.textContent = state.temperature ?? 0.8;

  if (dom.personaSelectionGrid) {
    dom.personaSelectionGrid.querySelectorAll('.persona-choice-card').forEach(card => {
      if (card.getAttribute('data-persona') === state.persona) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }

  if (state.engine === 'ollama') {
    checkOllamaStatus();
  }
}

function saveSettingsFromForm() {
  const chosenEngine = dom.engineSelect ? dom.engineSelect.value : (state.engine || 'ollama');
  const chosenOllamaModel = dom.ollamaModelInput ? (dom.ollamaModelInput.value.trim() || 'llama3.2:1b') : 'llama3.2:1b';
  const chosenKey = dom.apiKeyInput ? dom.apiKeyInput.value.trim() : '';
  const chosenModel = dom.modelSelect ? dom.modelSelect.value : DEFAULT_MODEL;
  const chosenTemp = dom.temperatureRange ? parseFloat(dom.temperatureRange.value) : 0.8;

  let chosenPersona = 'friendly';
  if (dom.personaSelectionGrid) {
    const selectedCard = dom.personaSelectionGrid.querySelector('.persona-choice-card.selected');
    if (selectedCard) {
      chosenPersona = selectedCard.getAttribute('data-persona') || 'friendly';
    }
  }

  state.engine = chosenEngine;
  state.ollamaModel = chosenOllamaModel;
  state.apiKey = chosenKey;
  state.model = chosenModel;
  state.persona = chosenPersona;
  state.temperature = chosenTemp;

  saveState();
  updateApiStatusUI();
  updatePersonaBadgeUI();
  closeSettingsModal();
  showToast('Settings saved successfully!');
  playSound('receive');
}

function resizeInputTextarea() {
  dom.messageInput.style.height = 'auto';
  dom.messageInput.style.height = Math.min(dom.messageInput.scrollHeight, 180) + 'px';
}

function updateCharCount() {
  const len = dom.messageInput.value.length;
  dom.inputCharCount.textContent = `${len} character${len === 1 ? '' : 's'}`;
}

function focusInput() {
  setTimeout(() => {
    dom.messageInput.focus();
  }, 100);
}

function scrollToBottom(smooth = true) {
  dom.chatScrollArea.scrollTo({
    top: dom.chatScrollArea.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  });
}

// ============================================================
// SPEECH RECOGNITION (VOICE INPUT)
// ============================================================

// ============================================================
// SPEECH RECOGNITION (VOICE INPUT) & PERMISSION
// ============================================================

async function ensureMicrophonePermission() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (err) {
      console.warn('Microphone permission check error:', err);
      showToast('Microphone access blocked. Click the lock/mic icon in your address bar to allow.');
      return false;
    }
  }
  return true;
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (dom.btnVoiceInput) {
      dom.btnVoiceInput.title = 'Voice input not supported in this browser. Use Chrome or Edge.';
      dom.btnVoiceInput.style.opacity = '0.5';
    }
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    if (dom.btnVoiceInput) dom.btnVoiceInput.classList.add('listening');
    showToast('🎙️ Listening... Speak now');
  };

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    const currentText = finalTranscript || interimTranscript;
    if (currentText) {
      dom.messageInput.value = currentText;
      resizeInputTextarea();
      updateCharCount();
    }

    if (finalTranscript && finalTranscript.trim().length > 0) {
      stopListening();
      // Auto-submit when user finishes sentence
      setTimeout(() => {
        if (dom.messageInput.value.trim().length > 0 && !isGenerating) {
          handleUserSubmit();
        }
      }, 400);
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      showToast('Microphone permission denied. Allow mic access in your browser settings.');
    } else if (event.error !== 'no-speech') {
      showToast('Voice error: ' + event.error);
    }
    stopListening();
  };

  recognition.onend = () => {
    stopListening();
  };
}

async function toggleVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    return;
  }

  if (isListening) {
    if (recognition) recognition.stop();
    stopListening();
    return;
  }

  const allowed = await ensureMicrophonePermission();
  if (!allowed) return;

  if (!recognition) {
    initSpeechRecognition();
  }

  try {
    recognition.start();
  } catch (e) {
    console.debug('Recognition start issue, restarting:', e);
    try {
      recognition.abort();
      setTimeout(() => recognition.start(), 200);
    } catch (_) {
      stopListening();
    }
  }
}

function stopListening() {
  isListening = false;
  if (dom.btnVoiceInput) dom.btnVoiceInput.classList.remove('listening');
}

// ============================================================
// TEXT TO SPEECH (MAKE THE AI TALK ALOUD)
// ============================================================

function speakText(text, btnElement, onEndCallback) {
  if (!('speechSynthesis' in window)) {
    showToast('Text-to-speech not supported in this browser');
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    document.querySelectorAll('.btn-msg-action.speaking').forEach(b => b.classList.remove('speaking'));
    if (btnElement && btnElement.classList.contains('speaking')) {
      return;
    }
  }

  // Strip code blocks, markdown links, asterisks for natural fluent speech
  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/#+\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();

  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;

  // Pick best high quality voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Guy') || v.name.includes('Samantha') || v.name.includes('Zira'))) ||
                         voices.find(v => v.lang.startsWith('en'));
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  if (btnElement) {
    btnElement.classList.add('speaking');
  }

  utterance.onend = () => {
    if (btnElement) btnElement.classList.remove('speaking');
    if (onEndCallback) onEndCallback();

    // If Voice Talk Mode is active, automatically listen for user reply!
    if (state.voiceTalkMode && !isGenerating && !isListening) {
      setTimeout(() => {
        if (state.voiceTalkMode && !isListening) {
          toggleVoiceInput();
        }
      }, 500);
    }
  };

  utterance.onerror = (e) => {
    if (btnElement) btnElement.classList.remove('speaking');
    console.warn('TTS error:', e);
  };

  window.speechSynthesis.speak(utterance);
}

// ============================================================
// CHAT RENDERING & MANAGEMENT
// ============================================================

function renderChatHistory() {
  dom.chatHistoryList.innerHTML = '<div class="history-label">Recent Chats</div>';

  if (!state.chats || state.chats.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.style.padding = '12px 14px';
    emptyNotice.style.fontSize = '0.8rem';
    emptyNotice.style.color = 'var(--text-muted)';
    emptyNotice.textContent = 'No past conversations';
    dom.chatHistoryList.appendChild(emptyNotice);
    return;
  }

  state.chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = 'chat-history-item' + (chat.id === state.currentChatId ? ' active' : '');
    
    item.innerHTML = `
      <div class="chat-item-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span class="chat-title-text">${escapeHtml(chat.title)}</span>
      </div>
      <div class="chat-item-actions">
        <button class="icon-btn-subtle delete" title="Delete chat" aria-label="Delete chat">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
        </button>
      </div>
    `;

    item.addEventListener('click', () => {
      if (state.currentChatId !== chat.id) {
        state.currentChatId = chat.id;
        saveState();
        renderChatHistory();
        renderActiveChat();
        playSound('click');
        if (window.innerWidth <= 860) {
          dom.appSidebar.classList.remove('mobile-open');
        }
      }
    });

    const deleteBtn = item.querySelector('.delete');
    deleteBtn.addEventListener('click', (e) => {
      deleteChat(chat.id, e);
    });

    dom.chatHistoryList.appendChild(item);
  });
}

function renderActiveChat() {
  const chat = getCurrentChat();
  if (!chat) return;

  dom.chatTitleHeader.textContent = chat.title || 'New Conversation';
  dom.messagesContainer.innerHTML = '';

  if (!chat.messages || chat.messages.length === 0) {
    dom.welcomeHero.style.display = 'flex';
    dom.messagesContainer.appendChild(dom.welcomeHero);
  } else {
    dom.welcomeHero.style.display = 'none';
    chat.messages.forEach(msg => {
      appendMessageElement(msg, false);
    });
  }

  scrollToBottom(false);
}

function appendMessageElement(msg, shouldScroll = true) {
  const isUser = msg.role === 'user';
  const msgEl = document.createElement('div');
  msgEl.className = `chat-message ${isUser ? 'user-message' : 'ai-message'}`;
  msgEl.dataset.id = msg.id;

  const personaConfig = PERSONAS[state.persona] || PERSONAS.friendly;
  const avatarIcon = isUser ? '👤' : personaConfig.icon;

  const timeFormatted = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msgEl.innerHTML = `
    <div class="msg-avatar">${avatarIcon}</div>
    <div class="msg-body-wrapper">
      <div class="msg-bubble">${isUser ? escapeHtml(msg.text).replace(/\n/g, '<br>') : parseMarkdown(msg.text)}</div>
      <div class="msg-meta">
        <span>${timeFormatted}</span>
        ${!isUser ? `
          <div class="msg-actions">
            <button class="btn-msg-action btn-copy-msg" title="Copy response text">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Copy</span>
            </button>
            <button class="btn-msg-action btn-tts-msg" title="Listen to response">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              <span>Listen</span>
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Attach button events
  const copyBtn = msgEl.querySelector('.btn-copy-msg');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(msg.text).then(() => {
        showToast('Message copied to clipboard');
        copyBtn.querySelector('span').textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.querySelector('span').textContent = 'Copy';
        }, 1500);
      });
    });
  }

  const ttsBtn = msgEl.querySelector('.btn-tts-msg');
  if (ttsBtn) {
    ttsBtn.addEventListener('click', () => {
      speakText(msg.text, ttsBtn);
    });
  }

  // Attach copy listeners to any code blocks inside the message
  msgEl.querySelectorAll('.btn-copy-code').forEach(btn => {
    btn.addEventListener('click', () => {
      const codeText = btn.closest('pre').querySelector('code').textContent;
      navigator.clipboard.writeText(codeText).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy Code'; }, 1500);
      });
    });
  });

  dom.messagesContainer.appendChild(msgEl);
  if (shouldScroll) scrollToBottom(true);
  return msgEl;
}

// Typing indicator bubble
function showTypingIndicator() {
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-message ai-message typing-indicator-item';
  typingEl.id = 'activeTypingIndicator';
  const personaConfig = PERSONAS[state.persona] || PERSONAS.friendly;

  typingEl.innerHTML = `
    <div class="msg-avatar">${personaConfig.icon}</div>
    <div class="msg-body-wrapper">
      <div class="msg-bubble typing-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;
  dom.messagesContainer.appendChild(typingEl);
  scrollToBottom(true);
  return typingEl;
}

function removeTypingIndicator() {
  const typingEl = document.getElementById('activeTypingIndicator');
  if (typingEl) typingEl.remove();
}

// ============================================================
// GEMINI API CALL & GENERATION PIPELINE
// ============================================================

async function handleUserSubmit() {
  const text = dom.messageInput.value.trim();
  if (!text || isGenerating) return;

  const chat = getCurrentChat();
  if (!chat) return;

  // Add User Message
  const userMsg = {
    id: 'msg_' + Date.now(),
    role: 'user',
    text: text,
    timestamp: Date.now()
  };

  chat.messages.push(userMsg);

  // Auto-generate a title if it's the first message
  if (chat.messages.length === 1) {
    chat.title = text.slice(0, 32) + (text.length > 32 ? '...' : '');
    dom.chatTitleHeader.textContent = chat.title;
    renderChatHistory();
  }

  // Hide hero if visible
  if (dom.welcomeHero) dom.welcomeHero.style.display = 'none';

  appendMessageElement(userMsg, true);
  dom.messageInput.value = '';
  resizeInputTextarea();
  updateCharCount();
  playSound('send');

  // Trigger Gemini API
  await generateAiResponse(chat);
}

async function generateAiResponse(chat) {
  isGenerating = true;
  dom.btnSendMessage.disabled = true;

  const typingEl = showTypingIndicator();

  // Create empty AI message element that will stream tokens
  let aiMsgBubble = null;
  let aiMsgWrapper = null;
  let fullAccumulatedText = '';

  const personaConfig = PERSONAS[state.persona] || PERSONAS.friendly;
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const lastUserText = chat.messages[chat.messages.length - 1]?.text || '';
  let webSourcesUsed = [];
  let liveWebContext = '';

  if (state.webSearchEnabled) {
    const results = await fetchLiveWebResults(lastUserText);
    if (results && results.length > 0) {
      webSourcesUsed = results;
      liveWebContext = `

[LIVE 2026 WEB ARTICLES & SOURCES - RETRIEVED ON ${todayFormatted}]
` +
        results.map((r, i) => `${i + 1}. Title: ${r.title}
   Summary: ${r.snippet}
   URL: ${r.url}`).join('

') +
        `

INSTRUCTION: You have full access to these verified live 2026 web articles and news. Synthesize these live findings together with your knowledge spanning ancient history to the present day to provide accurate, up-to-date answers!`;
    }
  }

  const enrichedSystemInstruction = `${personaConfig.systemInstruction}

[Context & Temporal Awareness]
- Today's current date is: ${todayFormatted}.
- You have access to deep human knowledge from ancient times all the way up to 2026.${liveWebContext}`;

  abortController = new AbortController();

  try {
    // ========================================================
    // ENGINE 1: OLLAMA (Local & Private - ZERO API KEY NEEDED)
    // ========================================================
    if (state.engine === 'ollama') {
      const ollamaMessages = [
        { role: 'system', content: enrichedSystemInstruction },
        ...chat.messages.map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.text
        }))
      ];

      const modelName = state.ollamaModel || 'llama3.2';

      const response = await fetch('/api/ollama/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: ollamaMessages,
          stream: true
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        let errJson = {};
        try { errJson = await response.json(); } catch (_) {}
        const errMsg = errJson.error || `Ollama returned HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      removeTypingIndicator();

      const aiMsg = {
        id: 'msg_' + Date.now(),
        role: 'model',
        text: '',
        timestamp: Date.now()
      };
      chat.messages.push(aiMsg);

      aiMsgWrapper = appendMessageElement(aiMsg, true);
      aiMsgBubble = aiMsgWrapper.querySelector('.msg-bubble');
      aiMsgBubble.classList.add('is-streaming');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('
');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed);
            const token = data.message?.content || '';
            if (token) {
              fullAccumulatedText += token;
              aiMsg.text = fullAccumulatedText;
              aiMsgBubble.innerHTML = parseMarkdown(fullAccumulatedText);
              scrollToBottom(true);
            }
          } catch (_) {}
        }
      }

    } else {
      // ========================================================
      // ENGINE 2: GOOGLE GEMINI (Cloud API)
      // ========================================================
      const formattedContents = chat.messages.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const payload = {
        contents: formattedContents,
        systemInstruction: {
          parts: [{ text: enrichedSystemInstruction }]
        },
        generationConfig: {
          temperature: state.temperature ?? 0.8,
          maxOutputTokens: 2048
        }
      };

      const candidateModels = [
        state.model || DEFAULT_MODEL,
        'gemini-flash-lite-latest',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest'
      ].filter((m, i, arr) => arr.indexOf(m) === i);

      let success = false;
      let lastError = null;

      for (const modelToTry of candidateModels) {
        try {
          const sseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:streamGenerateContent?alt=sse&key=${state.apiKey.trim()}`;

          const response = await fetch(sseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: abortController.signal
          });

          if (!response.ok) {
            let errDetails = '';
            try {
              const errJson = await response.json();
              errDetails = errJson?.error?.message || response.statusText;
            } catch (_) {
              errDetails = response.statusText;
            }

            if ((response.status === 503 || response.status === 404) && modelToTry !== candidateModels[candidateModels.length - 1]) {
              console.warn(`Model ${modelToTry} returned ${response.status}, cascading to next model...`);
              continue;
            }

            if (response.status === 400 || response.status === 401) {
              throw new Error(`API Key Error (${response.status}): ${errDetails}.`);
            } else if (response.status === 429) {
              throw new Error(`Quota / Rate Limit reached (${response.status}): ${errDetails}.`);
            }
            throw new Error(`Gemini API Error (${response.status}): ${errDetails}`);
          }

          removeTypingIndicator();

          const aiMsg = {
            id: 'msg_' + Date.now(),
            role: 'model',
            text: '',
            timestamp: Date.now()
          };
          chat.messages.push(aiMsg);

          aiMsgWrapper = appendMessageElement(aiMsg, true);
          aiMsgBubble = aiMsgWrapper.querySelector('.msg-bubble');
          aiMsgBubble.classList.add('is-streaming');

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('
');
            buffer = lines.pop();

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6);
                try {
                  const data = JSON.parse(jsonStr);
                  const candidate = data.candidates?.[0];
                  const textChunk = candidate?.content?.parts?.[0]?.text;
                  if (textChunk) {
                    fullAccumulatedText += textChunk;
                    aiMsg.text = fullAccumulatedText;
                    aiMsgBubble.innerHTML = parseMarkdown(fullAccumulatedText);
                    scrollToBottom(true);
                  }
                } catch (_) {}
              }
            }
          }

          // Direct generateContent fallback if streaming yielded empty text
          if (!fullAccumulatedText || fullAccumulatedText.trim().length === 0) {
            const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent?key=${state.apiKey.trim()}`;
            const directRes = await fetch(directUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: abortController.signal
            });
            if (directRes.ok) {
              const directJson = await directRes.json();
              fullAccumulatedText = directJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
              aiMsg.text = fullAccumulatedText;
              aiMsgBubble.innerHTML = parseMarkdown(fullAccumulatedText);
            }
          }

          success = true;
          break;

        } catch (innerErr) {
          lastError = innerErr;
          if (innerErr.name === 'AbortError') break;
          console.warn(`Attempt with ${modelToTry} encountered error:`, innerErr);
        }
      }

      if (!success && lastError) {
        throw lastError;
      }
    }

    if (aiMsgBubble) {
      aiMsgBubble.classList.remove('is-streaming');
    }

    if (webSourcesUsed && webSourcesUsed.length > 0 && aiMsgBubble) {
      const sourcesFooter = document.createElement('div');
      sourcesFooter.style.cssText = 'margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:0.74rem;color:#38bdf8;display:flex;align-items:center;gap:6px;';
      sourcesFooter.innerHTML = `<span>🌐 Grounded with live 2026 web articles & data (${webSourcesUsed.length} sources)</span>`;
      aiMsgBubble.appendChild(sourcesFooter);
    }

    saveState();
    playSound('receive');

    if (state.voiceTalkMode && fullAccumulatedText) {
      speakText(fullAccumulatedText);
    }

  } catch (error) {
    removeTypingIndicator();
    console.error('AI invocation error:', error);

    let errorFormatted = error.message;
    if (state.engine === 'ollama' && (error.message.includes('not running') || error.message.includes('Failed to fetch') || error.message.includes('503'))) {
      errorFormatted = `🦙 **Ollama is not running on your computer.**

To chat without any API key:
1. Open your terminal or PowerShell and run:
   \`\`\`bash
   ollama run llama3.2
   \`\`\`
2. If you haven't installed Ollama yet, download it for free from [ollama.com](https://ollama.com).

*(You can also switch to Google Gemini in **Settings ⚙️** at any time).*`;
    }

    const errorMessageText = `⚠️ **Could not complete request**: ${errorFormatted}`;
    const errorMsg = {
      id: 'msg_err_' + Date.now(),
      role: 'model',
      text: errorMessageText,
      timestamp: Date.now()
    };
    chat.messages.push(errorMsg);
    saveState();
    appendMessageElement(errorMsg, true);

  } finally {
    isGenerating = false;
    dom.btnSendMessage.disabled = false;
    focusInput();
  }
}

// ============================================================
// EXPORT CHAT
// ============================================================

function exportCurrentChat() {
  const chat = getCurrentChat();
  if (!chat || chat.messages.length === 0) {
    showToast('No messages to export');
    return;
  }

  let markdownContent = `# ${chat.title}\n`;
  markdownContent += `*Exported from AuraChat on ${new Date().toLocaleString()}*\n\n---\n\n`;

  chat.messages.forEach(msg => {
    const sender = msg.role === 'user' ? '👤 User' : `✨ Gemini (${state.model})`;
    const time = new Date(msg.timestamp).toLocaleTimeString();
    markdownContent += `### ${sender} (${time})\n\n${msg.text}\n\n---\n\n`;
  });

  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Chat exported as Markdown');
}

// ============================================================
// MARKDOWN PARSER
// ============================================================

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseMarkdown(md) {
  if (!md) return '';

  // 1. Code blocks ```lang ... ```
  const codeBlocks = [];
  let text = md.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    const cleanLang = lang.trim() || 'code';
    codeBlocks.push(`
      <pre><div class="code-header"><span>${escapeHtml(cleanLang)}</span><button class="btn-copy-code" type="button">Copy Code</button></div><code>${escapeHtml(code.trim())}</code></pre>
    `);
    return placeholder;
  });

  // 2. Inline code `code`
  text = text.replace(/`([^`]+)`/g, (_, inline) => `<code>${escapeHtml(inline)}</code>`);

  // 3. Bold **text**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 4. Italic *text* or _text_
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

  // 5. Blockquotes > quote
  text = text.replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>');

  // 6. Unordered lists
  text = text.replace(/^\s*[-*]\s+(.*)$/gm, '<ul><li>$1</li></ul>');
  text = text.replace(/<\/ul>\s*<ul>/g, ''); // consolidate adjacent lists

  // 7. Ordered lists
  text = text.replace(/^\s*(\d+)\.\s+(.*)$/gm, '<ol><li>$2</li></ol>');
  text = text.replace(/<\/ol>\s*<ol>/g, '');

  // 8. Headings
  text = text.replace(/^### (.*$)/gm, '<h4 style="font-size:1.05rem;font-weight:700;margin:10px 0 6px;">$1</h4>');
  text = text.replace(/^## (.*$)/gm, '<h3 style="font-size:1.15rem;font-weight:700;margin:12px 0 6px;">$1</h3>');
  text = text.replace(/^# (.*$)/gm, '<h2 style="font-size:1.25rem;font-weight:700;margin:14px 0 8px;">$1</h2>');

  // 9. Paragraphs and line breaks
  const paragraphs = text.split(/\n\s*\n/).map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<pre') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<blockquote') || p.startsWith('<h')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  });

  let html = paragraphs.join('');

  // Re-inject code blocks
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, block);
  });

  return html;
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✨</span><span>${escapeHtml(message)}</span>`;
  dom.toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.remove(); }, 300);
  }, duration);
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}
