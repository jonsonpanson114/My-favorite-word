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

const CONFIG = {
  sheetsEndpoint: localStorage.getItem("voiceShelfEndpoint") || "",
  speechRate: 0.88
};

const state = {
  quotes: [],
  mode: "both",
  theme: "all",
  favoritesOnly: false,
  favorites: new Set(JSON.parse(localStorage.getItem("voiceShelfFavorites") || "[]")),
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
  installButton: document.querySelector("#installButton")
};

const audio = new Audio();
let progressTimer = 0;

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
  utterance.pitch = 0.92;
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
}

function syncFloatingPlayerVisibility() {
  const hero = document.querySelector(".hero");
  const threshold = hero ? hero.offsetHeight * 0.72 : 480;
  state.showFloatingPlayer = state.isPlaying || window.scrollY > threshold;
  document.body.classList.toggle("has-floating-player", state.showFloatingPlayer);
}

async function boot() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
  }

  await loadQuotes();
  populateThemes();
  buildQueue();
  renderQuotes();
  updateNowPlaying();
  bindEvents();
  syncFloatingPlayerVisibility();
}

boot();
