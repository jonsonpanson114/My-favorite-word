const FALLBACK_QUOTES = [
  {
    id: "q1",
    text: "焦らなくていい。今日できる一歩を、静かに積み重ねる。",
    source: "自作メモ",
    tags: ["継続", "朝"],
    enabled: true,
    quoteAudioUrl: "",
    aiMessage:
      "今日は、結果を急ぐよりも、いま選べる小さな一歩を丁寧に選んでください。続ける力は、静かな選択から育ちます。",
    aiAudioUrl: "",
    generatedDate: "demo"
  },
  {
    id: "q2",
    text: "自分を責める時間を、次の工夫に変える。",
    source: "自作メモ",
    tags: ["回復", "思考"],
    enabled: true,
    quoteAudioUrl: "",
    aiMessage:
      "うまくいかなかったことを責める材料にせず、次の工夫の材料にしてみてください。あなたは何度でも調整できます。",
    aiAudioUrl: "",
    generatedDate: "demo"
  },
  {
    id: "q3",
    text: "大切なことは、派手な変化よりも、戻ってこられる場所を持つこと。",
    source: "自作メモ",
    tags: ["習慣", "夜"],
    enabled: true,
    quoteAudioUrl: "",
    aiMessage:
      "今日のあなたに必要なのは、完璧な前進ではなく、戻れるリズムです。整え直せる場所があれば、また進めます。",
    aiAudioUrl: "",
    generatedDate: "demo"
  },
  {
    id: "q4",
    text: "迷いは、まだ本気で選ぼうとしている証拠。",
    source: "自作メモ",
    tags: ["決断", "仕事"],
    enabled: true,
    quoteAudioUrl: "",
    aiMessage:
      "迷っている自分を否定しなくて大丈夫です。迷いの中には、ちゃんと選びたいという誠実さがあります。",
    aiAudioUrl: "",
    generatedDate: "demo"
  },
  {
    id: "q5",
    text: "静かな集中は、今日の自分への信頼から始まる。",
    source: "自作メモ",
    tags: ["集中", "朝"],
    enabled: true,
    quoteAudioUrl: "",
    aiMessage:
      "今日は、自分を追い込む集中ではなく、信じて任せる集中を選んでみてください。落ち着いた力は長く続きます。",
    aiAudioUrl: "",
    generatedDate: "demo"
  },
  {
    id: "q6",
    text: "不安を消すより、不安を抱えたまま動ける自分を育てる。",
    source: "自作メモ",
    tags: ["挑戦", "回復"],
    enabled: true,
    quoteAudioUrl: "",
    aiMessage:
      "不安があるから止まるのではなく、不安があってもできる小さな行動を選んでください。それが強さの練習になります。",
    aiAudioUrl: "",
    generatedDate: "demo"
  }
];

const DEFAULT_GAS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbybOvd5tQZAavAIrsY2xHQRZk9KCjzeSJSEi054KV8Sm34vbdV8VlYmMZJAs3LgDVMt/exec";

const CONFIG = {
  sheetsEndpoint: localStorage.getItem("voiceShelfEndpoint") || DEFAULT_GAS_ENDPOINT,
  sheetId: "1maNGIkVq8CslP5SwJtrDglcGqjJduXa3hRGM_KQadK8",
  pushPublicKeyEndpoint: "/api/push-public-key",
  pushSubscribeEndpoint: "/api/push-subscribe",
  speechRate: 0.9,
  speechPitch: 0.95
};

const state = {
  quotes: [],
  mode: "both",
  theme: "all",
  favoritesOnly: false,
  favorites: new Set(JSON.parse(localStorage.getItem("voiceShelfFavorites") || "[]")),
  ttsSettings: null,
  queue: [],
  cursor: 0,
  isPlaying: false,
  deferredInstallPrompt: null,
  showFloatingPlayer: false
};

const els = {
  quoteGrid: document.querySelector("#quoteGrid"),
  template: document.querySelector("#quoteTemplate"),
  themeSelect: document.querySelector("#themeSelect"),
  favoritesOnly: document.querySelector("#favoritesOnly"),
  segments: document.querySelectorAll(".segment"),
  playButton: document.querySelector("#playButton"),
  miniPlayButton: document.querySelector("#miniPlayButton"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  miniPrevButton: document.querySelector("#miniPrevButton"),
  miniNextButton: document.querySelector("#miniNextButton"),
  nowMode: document.querySelector("#nowMode"),
  nowTitle: document.querySelector("#nowTitle"),
  miniMode: document.querySelector("#miniMode"),
  miniTitle: document.querySelector("#miniTitle"),
  aiBrief: document.querySelector("#aiBrief"),
  progress: document.querySelector("#progress"),
  elapsed: document.querySelector("#elapsed"),
  duration: document.querySelector("#duration"),
  syncButton: document.querySelector("#syncButton"),
  installButton: document.querySelector("#installButton"),
  quoteForm: document.querySelector("#quoteForm"),
  quoteText: document.querySelector("#quoteText"),
  quoteTags: document.querySelector("#quoteTags"),
  quoteSource: document.querySelector("#quoteSource"),
  formStatus: document.querySelector("#formStatus"),
  submitQuoteButton: document.querySelector("#submitQuoteButton"),
  notifyButton: document.querySelector("#notifyButton"),
  notifyStatus: document.querySelector("#notifyStatus"),
  ttsSettingsForm: document.querySelector("#ttsSettingsForm"),
  ttsPreset: document.querySelector("#ttsPreset"),
  ttsVoiceName: document.querySelector("#ttsVoiceName"),
  ttsLanguageCode: document.querySelector("#ttsLanguageCode"),
  ttsSpeakingRate: document.querySelector("#ttsSpeakingRate"),
  ttsPitch: document.querySelector("#ttsPitch"),
  ttsUseSsml: document.querySelector("#ttsUseSsml"),
  ttsPauseShortMs: document.querySelector("#ttsPauseShortMs"),
  ttsPauseMediumMs: document.querySelector("#ttsPauseMediumMs"),
  ttsPauseLongMs: document.querySelector("#ttsPauseLongMs"),
  ttsAliases: document.querySelector("#ttsAliases"),
  ttsSampleText: document.querySelector("#ttsSampleText"),
  ttsStatus: document.querySelector("#ttsStatus"),
  ttsReloadButton: document.querySelector("#ttsReloadButton"),
  ttsSamplesButton: document.querySelector("#ttsSamplesButton"),
  ttsSaveButton: document.querySelector("#ttsSaveButton"),
  ttsSamples: document.querySelector("#ttsSamples")
};

const audio = new Audio();
let progressTimer = 0;
let swRegistration = null;
let preferredSpeechVoice = null;

function normalizeQuote(row, index) {
  const tags = Array.isArray(row.tags)
    ? row.tags
    : String(row.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

  return {
    id: String(row.id || `q-${index}`),
    text: String(row.text || row.quote || ""),
    source: String(row.source || ""),
    tags,
    enabled: row.enabled !== false && row.enabled !== "FALSE",
    quoteAudioUrl: String(row.quoteAudioUrl || row.originalAudioUrl || ""),
    aiMessage: String(row.aiMessage || row.aiText || ""),
    aiAudioUrl: String(row.aiAudioUrl || ""),
    generatedDate: String(row.generatedDate || "")
  };
}

function createLocalQuote({ text, tags, source }) {
  return {
    id: `local-${Date.now()}`,
    text,
    source: source || "サイト入力",
    tags,
    enabled: true,
    quoteAudioUrl: "",
    aiMessage: `今日はこの言葉を、自分の芯を整えるための合図として受け取ってください。${text}`,
    aiAudioUrl: "",
    generatedDate: new Date().toISOString().slice(0, 10)
  };
}

async function loadQuotes() {
  if (!CONFIG.sheetsEndpoint) {
    state.quotes = FALLBACK_QUOTES;
    return;
  }

  try {
    const response = await fetch(CONFIG.sheetsEndpoint, { cache: "no-store" });
    if (!response.ok) throw new Error(`Sheets endpoint returned ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : payload.quotes || [];
    state.quotes = rows.map(normalizeQuote).filter((quote) => quote.enabled && quote.text);
  } catch (error) {
    console.warn(error);
    state.quotes = FALLBACK_QUOTES;
  }
}

function filteredQuotes() {
  return state.quotes.filter((quote) => {
    const themeMatch = state.theme === "all" || quote.tags.includes(state.theme);
    const favoriteMatch = !state.favoritesOnly || state.favorites.has(quote.id);
    return quote.enabled && themeMatch && favoriteMatch;
  });
}

function buildQueue(startId = null) {
  const items = filteredQuotes();
  const tracks = [];

  items.forEach((quote) => {
    if (state.mode === "both" || state.mode === "quote") {
      tracks.push({
        type: "quote",
        quoteId: quote.id,
        title: quote.text,
        modeLabel: "原文アファメーション",
        text: quote.text,
        audioUrl: quote.quoteAudioUrl
      });
    }

    if (state.mode === "both" || state.mode === "ai") {
      tracks.push({
        type: "ai",
        quoteId: quote.id,
        title: quote.aiMessage || "AI語りかけ",
        modeLabel: "AI語りかけ",
        text: quote.aiMessage || createFallbackAiMessage(quote),
        audioUrl: quote.aiAudioUrl
      });
    }
  });

  state.queue = tracks;
  const index = startId ? tracks.findIndex((track) => track.quoteId === startId) : 0;
  state.cursor = Math.max(0, index);
}

function createFallbackAiMessage(quote) {
  return `今日はこの言葉を、いまの自分を整える合図として受け取ってください。${quote.text} その感覚を、次の小さな行動につなげてみましょう。`;
}

function populateThemes() {
  const tags = [...new Set(state.quotes.flatMap((quote) => quote.tags))].sort((a, b) => a.localeCompare(b, "ja"));
  els.themeSelect.innerHTML = '<option value="all">すべて</option>';
  tags.forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    els.themeSelect.append(option);
  });
}

function renderQuotes() {
  els.quoteGrid.innerHTML = "";
  const quotes = filteredQuotes();

  quotes.forEach((quote) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.dataset.id = quote.id;
    node.querySelector(".tag").textContent = quote.tags[0] || "名言";
    node.querySelector(".quote-text").textContent = quote.text;
    node.querySelector(".quote-source").textContent = quote.source || "出典未設定";

    const favoriteButton = node.querySelector(".favorite-button");
    favoriteButton.classList.toggle("is-active", state.favorites.has(quote.id));
    favoriteButton.textContent = state.favorites.has(quote.id) ? "★" : "☆";
    favoriteButton.addEventListener("click", () => toggleFavorite(quote.id));

    node.querySelector(".queue-button").addEventListener("click", () => {
      buildQueue(quote.id);
      updateNowPlaying();
    });

    node.querySelector(".listen-button").addEventListener("click", () => {
      buildQueue(quote.id);
      playCurrent();
    });

    els.quoteGrid.append(node);
  });

  highlightCurrentCard();
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }

  localStorage.setItem("voiceShelfFavorites", JSON.stringify([...state.favorites]));
  renderQuotes();
}

function currentTrack() {
  return state.queue[state.cursor] || null;
}

function updateNowPlaying() {
  const track = currentTrack();
  const title = track ? track.title : "今日の声を再生できます";
  const mode = track ? track.modeLabel : "待機中";

  els.nowMode.textContent = mode;
  els.nowTitle.textContent = title;
  els.miniMode.textContent = mode;
  els.miniTitle.textContent = title;

  const firstAi = filteredQuotes().find((quote) => quote.aiMessage);
  if (firstAi) els.aiBrief.textContent = firstAi.aiMessage;
  highlightCurrentCard();
}

function highlightCurrentCard() {
  const track = currentTrack();
  document.querySelectorAll(".quote-card").forEach((card) => {
    card.classList.toggle("is-current", Boolean(track && card.dataset.id === track.quoteId));
  });
}

function setPlaying(isPlaying) {
  state.isPlaying = isPlaying;
  document.body.classList.toggle("is-playing", isPlaying);
  els.playButton.textContent = isPlaying ? "Ⅱ" : "▶";
  els.miniPlayButton.textContent = isPlaying ? "Ⅱ" : "▶";
  syncFloatingPlayerVisibility();
}

async function playCurrent() {
  const track = currentTrack();
  if (!track) return;

  updateNowPlaying();

  if (track.audioUrl) {
    if (audio.src !== track.audioUrl) audio.src = track.audioUrl;
    await audio.play();
    setPlaying(true);
    startProgressTimer();
    return;
  }

  speakText(track.text, () => nextTrack(true));
}

function togglePlayback() {
  if (state.isPlaying) {
    audio.pause();
    window.speechSynthesis.cancel();
    setPlaying(false);
    return;
  }

  playCurrent();
}

function speakText(text, onEnd) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = CONFIG.speechRate;
  utterance.pitch = CONFIG.speechPitch;
  utterance.volume = 1;
  utterance.voice = preferredSpeechVoice;
  utterance.onstart = () => {
    setPlaying(true);
    fakeProgress(text);
  };
  utterance.onend = () => {
    setPlaying(false);
    onEnd?.();
  };
  window.speechSynthesis.speak(utterance);
}

function selectPreferredSpeechVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const japaneseVoices = voices.filter((voice) => /^ja([-_]|$)/i.test(voice.lang || ""));
  const pool = japaneseVoices.length ? japaneseVoices : voices;
  const preferredPatterns = [
    /google.*japanese/i,
    /google/i,
    /natural/i,
    /ja-jp/i,
    /kyoko|otoya|haruka|sayaka|nanami/i
  ];

  for (const pattern of preferredPatterns) {
    const match = pool.find((voice) => pattern.test(`${voice.name} ${voice.voiceURI}`));
    if (match) return match;
  }

  return pool[0] || null;
}

function fakeProgress(text) {
  clearInterval(progressTimer);
  const estimatedSeconds = Math.max(8, Math.min(180, text.length / 5));
  const startedAt = Date.now();
  els.duration.textContent = formatTime(estimatedSeconds);
  progressTimer = window.setInterval(() => {
    if (!state.isPlaying) return;
    const elapsed = Math.min(estimatedSeconds, (Date.now() - startedAt) / 1000);
    els.elapsed.textContent = formatTime(elapsed);
    els.progress.value = String((elapsed / estimatedSeconds) * 100);
  }, 300);
}

function startProgressTimer() {
  clearInterval(progressTimer);
  progressTimer = window.setInterval(() => {
    if (!Number.isFinite(audio.duration)) return;
    els.elapsed.textContent = formatTime(audio.currentTime);
    els.duration.textContent = formatTime(audio.duration);
    els.progress.value = String((audio.currentTime / audio.duration) * 100 || 0);
  }, 300);
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function nextTrack(autoplay = state.isPlaying) {
  if (!state.queue.length) return;
  state.cursor = (state.cursor + 1) % state.queue.length;
  audio.pause();
  updateNowPlaying();
  if (autoplay) playCurrent();
}

function previousTrack() {
  if (!state.queue.length) return;
  state.cursor = (state.cursor - 1 + state.queue.length) % state.queue.length;
  audio.pause();
  updateNowPlaying();
  if (state.isPlaying) playCurrent();
}

function bindEvents() {
  els.segments.forEach((segment) => {
    segment.addEventListener("click", () => {
      els.segments.forEach((item) => item.classList.remove("is-active"));
      segment.classList.add("is-active");
      state.mode = segment.dataset.mode;
      buildQueue();
      renderQuotes();
      updateNowPlaying();
    });
  });

  els.themeSelect.addEventListener("change", () => {
    state.theme = els.themeSelect.value;
    buildQueue();
    renderQuotes();
    updateNowPlaying();
  });

  els.favoritesOnly.addEventListener("change", () => {
    state.favoritesOnly = els.favoritesOnly.checked;
    buildQueue();
    renderQuotes();
    updateNowPlaying();
  });

  [els.playButton, els.miniPlayButton].forEach((button) => button.addEventListener("click", togglePlayback));
  [els.nextButton, els.miniNextButton].forEach((button) => button.addEventListener("click", () => nextTrack()));
  [els.prevButton, els.miniPrevButton].forEach((button) => button.addEventListener("click", previousTrack));

  els.progress.addEventListener("input", () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = (Number(els.progress.value) / 100) * audio.duration;
    }
  });

  audio.addEventListener("ended", () => nextTrack(true));

  els.syncButton.addEventListener("click", async () => {
    await loadQuotes();
    populateThemes();
    buildQueue();
    renderQuotes();
    updateNowPlaying();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    els.installButton.hidden = false;
  });

  els.installButton.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    els.installButton.hidden = true;
  });

  window.addEventListener("scroll", syncFloatingPlayerVisibility, { passive: true });

  els.quoteForm.addEventListener("submit", handleQuoteSubmit);
  els.notifyButton.addEventListener("click", enableNotifications);
  els.ttsSettingsForm.addEventListener("submit", saveTtsSettings);
  els.ttsReloadButton.addEventListener("click", loadTtsSettings);
  els.ttsSamplesButton.addEventListener("click", generateTtsSamples);
  els.ttsPreset.addEventListener("change", applyTtsPreset);
}

function syncFloatingPlayerVisibility() {
  const hero = document.querySelector(".hero");
  const threshold = hero ? hero.offsetHeight * 0.72 : 480;
  state.showFloatingPlayer = state.isPlaying || window.scrollY > threshold;
  document.body.classList.toggle("has-floating-player", state.showFloatingPlayer);
}

function setFormStatus(message) {
  els.formStatus.textContent = message;
}

function setTtsStatus(message) {
  els.ttsStatus.textContent = message;
}

function populateTtsPresets(presets = []) {
  const current = els.ttsPreset.value;
  els.ttsPreset.innerHTML = '<option value="">現在の設定を維持</option>';
  presets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.voiceName;
    option.textContent = `${preset.label} | ${preset.family}`;
    option.dataset.voiceName = preset.voiceName;
    els.ttsPreset.append(option);
  });
  els.ttsPreset.value = current;
}

function renderTtsSettings(settings) {
  if (!settings) return;
  state.ttsSettings = settings;
  populateTtsPresets(settings.presets || []);
  els.ttsVoiceName.value = settings.voiceName || "";
  els.ttsLanguageCode.value = settings.languageCode || "ja-JP";
  els.ttsSpeakingRate.value = settings.speakingRate ?? 0.92;
  els.ttsPitch.value = settings.pitch ?? 0;
  els.ttsUseSsml.value = String(settings.useSSML || "auto");
  els.ttsPauseShortMs.value = settings.pauseShortMs ?? 220;
  els.ttsPauseMediumMs.value = settings.pauseMediumMs ?? 360;
  els.ttsPauseLongMs.value = settings.pauseLongMs ?? 650;
  els.ttsAliases.value = settings.aliasesJson || "{}";
  els.ttsSampleText.value = settings.sampleText || "";
}

function renderTtsSamples(outputs = []) {
  els.ttsSamples.innerHTML = "";

  if (!outputs.length) {
    const empty = document.createElement("p");
    empty.className = "sample-empty";
    empty.textContent = "ここにサンプル音声が並びます。";
    els.ttsSamples.append(empty);
    return;
  }

  outputs.forEach((sample) => {
    const card = document.createElement("article");
    card.className = "sample-card";

    const title = document.createElement("h3");
    title.textContent = sample.label || sample.voiceName || sample.preset;

    const meta = document.createElement("p");
    meta.className = "sample-meta";
    meta.textContent = `${sample.voiceName} / ${sample.inputMode}`;

    const audioEl = document.createElement("audio");
    audioEl.controls = true;
    audioEl.preload = "none";
    audioEl.src = sample.audioUrl || "";

    card.append(title, meta, audioEl);
    els.ttsSamples.append(card);
  });
}

async function loadTtsSettings() {
  if (!CONFIG.sheetsEndpoint) {
    setTtsStatus("GAS URL が見つからないので、音声設定はまだ読めません。");
    return;
  }

  setTtsStatus("音声設定を読み込んでいます。");
  try {
    const response = await fetch(`${CONFIG.sheetsEndpoint}?action=ttsSettings`, { cache: "no-store" });
    if (!response.ok) throw new Error(`tts settings status ${response.status}`);
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || "Failed to load settings");
    renderTtsSettings(payload.settings);
    setTtsStatus("現在の音声設定を読み込みました。");
  } catch (error) {
    console.warn(error);
    setTtsStatus("音声設定の読み込みに失敗しました。GAS の反映を確認してください。");
  }
}

function collectTtsSettingsForm() {
  return {
    voiceName: els.ttsVoiceName.value.trim(),
    languageCode: els.ttsLanguageCode.value.trim(),
    speakingRate: els.ttsSpeakingRate.value.trim(),
    pitch: els.ttsPitch.value.trim(),
    useSSML: els.ttsUseSsml.value,
    pauseShortMs: els.ttsPauseShortMs.value.trim(),
    pauseMediumMs: els.ttsPauseMediumMs.value.trim(),
    pauseLongMs: els.ttsPauseLongMs.value.trim(),
    aliasesJson: els.ttsAliases.value.trim(),
    sampleText: els.ttsSampleText.value.trim()
  };
}

async function saveTtsSettings(event) {
  event.preventDefault();
  if (!CONFIG.sheetsEndpoint) return;

  const params = new URLSearchParams({ action: "updateTtsSettings", ...collectTtsSettingsForm() });
  setTtsStatus("音声設定を保存しています。");
  els.ttsSaveButton.disabled = true;

  try {
    let saved = false;
    try {
      const response = await fetch(CONFIG.sheetsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: params.toString()
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload.ok && payload.settings) {
          renderTtsSettings(payload.settings);
          saved = true;
        }
      }
    } catch (error) {
      console.warn("cors save failed, retrying with no-cors", error);
    }

    if (!saved) {
      await fetch(CONFIG.sheetsEndpoint, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: params.toString()
      });
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      await loadTtsSettings();
    }

    setTtsStatus("音声設定を保存しました。必要ならサンプル生成で確認できます。");
  } catch (error) {
    console.warn(error);
    setTtsStatus("保存の送信に失敗しました。もう一度試してください。");
  } finally {
    els.ttsSaveButton.disabled = false;
  }
}

async function generateTtsSamples() {
  if (!CONFIG.sheetsEndpoint) return;
  setTtsStatus("比較用のサンプル音声を生成しています。少し待ってください。");
  els.ttsSamplesButton.disabled = true;

  try {
    const response = await fetch(`${CONFIG.sheetsEndpoint}?action=createVoiceComparisonSamples`, {
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`tts sample status ${response.status}`);
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || "Failed to create samples");
    renderTtsSamples(payload.outputs || []);
    setTtsStatus("サンプル音声を更新しました。聞き比べて良い声を選べます。");
  } catch (error) {
    console.warn(error);
    setTtsStatus("サンプル生成に失敗しました。GAS 側の更新を確認してください。");
  } finally {
    els.ttsSamplesButton.disabled = false;
  }
}

function applyTtsPreset() {
  const voiceName = els.ttsPreset.value;
  if (!voiceName || !state.ttsSettings?.presets) return;
  const preset = state.ttsSettings.presets.find((item) => item.voiceName === voiceName);
  if (!preset) return;

  els.ttsVoiceName.value = preset.voiceName;

  if (preset.family === "chirp3hd") {
    els.ttsUseSsml.value = "auto";
    els.ttsSpeakingRate.value = "0.90";
    els.ttsPitch.value = "0";
  } else {
    els.ttsUseSsml.value = "true";
    els.ttsSpeakingRate.value = "0.94";
    els.ttsPitch.value = "-1.5";
  }

  setTtsStatus("プリセットをフォームに反映しました。保存するとすぐ使えます。");
}

async function handleQuoteSubmit(event) {
  event.preventDefault();

  const text = els.quoteText.value.trim();
  const tags = els.quoteTags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const source = els.quoteSource.value.trim();

  if (!text) {
    setFormStatus("名言を入力すると追加できます。");
    els.quoteText.focus();
    return;
  }

  const localQuote = createLocalQuote({ text, tags, source });
  state.quotes = [localQuote, ...state.quotes];
  buildQueue(localQuote.id);
  renderQuotes();
  updateNowPlaying();

  els.quoteForm.reset();
  setFormStatus("一覧に追加しました。保存先への反映も進めています。");

  if (!CONFIG.sheetsEndpoint) {
    setFormStatus("一覧に追加しました。GAS の URL を設定すると Google Sheets にも保存されます。");
    return;
  }

  els.submitQuoteButton.disabled = true;

  try {
    await saveQuoteToSheets({ text, tags, source });
    setFormStatus("一覧に追加して、Google Sheets への保存も送信しました。");
  } catch (error) {
    console.warn(error);
    setFormStatus("一覧には追加しました。Google Sheets への保存はあとで接続確認が必要です。");
  } finally {
    els.submitQuoteButton.disabled = false;
  }
}

async function saveQuoteToSheets({ text, tags, source }) {
  const payload = new URLSearchParams({
    action: "addQuote",
    sheetId: CONFIG.sheetId,
    text,
    tags: tags.join(", "),
    source
  });

  await fetch(CONFIG.sheetsEndpoint, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: payload.toString()
  });
}

async function boot() {
  preferredSpeechVoice = selectPreferredSpeechVoice();
  if ("speechSynthesis" in window) {
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      preferredSpeechVoice = selectPreferredSpeechVoice();
    });
  }

  if ("serviceWorker" in navigator) {
    swRegistration = await navigator.serviceWorker.register("./service-worker.js");
  }

  await loadQuotes();
  populateThemes();
  buildQueue();
  renderQuotes();
  updateNowPlaying();
  renderTtsSamples([]);
  bindEvents();
  syncFloatingPlayerVisibility();
  await loadTtsSettings();
  await refreshNotificationState();
}

boot();

async function refreshNotificationState() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    els.notifyButton.disabled = true;
    els.notifyStatus.textContent = "このブラウザでは通知を使えません。";
    return;
  }

  if (!window.isSecureContext) {
    els.notifyButton.disabled = true;
    els.notifyStatus.textContent = "通知は https の公開サイトで有効になります。";
    return;
  }

  if (!swRegistration) {
    els.notifyButton.disabled = true;
    els.notifyStatus.textContent = "通知の準備に失敗しました。";
    return;
  }

  const existing = await swRegistration.pushManager.getSubscription();
  if (existing) {
    els.notifyButton.textContent = "通知を有効化済み";
    els.notifyButton.disabled = true;
    els.notifyStatus.textContent = "毎朝の新しい音声が Android に届く状態です。";
    return;
  }

  els.notifyButton.disabled = false;
  if (Notification.permission === "denied") {
    els.notifyStatus.textContent = "ブラウザ設定で通知がブロックされています。";
    return;
  }

  els.notifyStatus.textContent = "Android のホーム画面追加後に通知を有効化できます。";
}

async function enableNotifications() {
  if (!swRegistration) return;

  els.notifyButton.disabled = true;
  els.notifyStatus.textContent = "通知の準備をしています。";

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      els.notifyStatus.textContent = "通知の許可が必要です。";
      els.notifyButton.disabled = false;
      return;
    }

    const keyResponse = await fetch(CONFIG.pushPublicKeyEndpoint, { cache: "no-store" });
    if (!keyResponse.ok) throw new Error(`push key status ${keyResponse.status}`);
    const keyPayload = await keyResponse.json();
    const publicKey = keyPayload.publicKey;
    if (!publicKey) throw new Error("missing public key");

    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    const saveResponse = await fetch(CONFIG.pushSubscribeEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subscription,
        userAgent: navigator.userAgent
      })
    });

    if (!saveResponse.ok) throw new Error(`subscribe status ${saveResponse.status}`);

    els.notifyButton.textContent = "通知を有効化済み";
    els.notifyStatus.textContent = "毎朝の新しい音声が Android に届く状態です。";
  } catch (error) {
    console.warn(error);
    els.notifyButton.disabled = false;
    els.notifyStatus.textContent = "通知設定に失敗しました。GAS と Vercel の設定を確認してください。";
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}
