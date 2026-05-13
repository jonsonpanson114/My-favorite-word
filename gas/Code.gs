const SHEET_NAME = 'Quotes';
const DAILY_SHEET_NAME = 'DailyVoices';
const SUBSCRIPTION_SHEET_NAME = 'PushSubscriptions';
const OUTPUT_FOLDER_NAME = 'Voice Shelf Audio';
const SAMPLE_OUTPUT_FOLDER_NAME = 'Voice Shelf Audio Samples';
const FORMATION_OUTPUT_FOLDER_NAME = 'Voice Shelf Formations';
const GEMINI_MODEL = 'gemini-3-flash-preview';
const DEFAULT_GOOGLE_TTS_VOICE = 'ja-JP-Chirp3-HD-Leda';
const DEFAULT_GOOGLE_TTS_LANGUAGE_CODE = 'ja-JP';
const DEFAULT_GOOGLE_TTS_RATE = 0.99;
const DEFAULT_GOOGLE_TTS_PITCH = 0;
const DEFAULT_GOOGLE_TTS_AUDIO_ENCODING = 'MP3';
const DEFAULT_GOOGLE_TTS_USE_SSML = 'auto';
const DEFAULT_TTS_PAUSE_SHORT_MS = 150;
const DEFAULT_TTS_PAUSE_MEDIUM_MS = 260;
const DEFAULT_TTS_PAUSE_LONG_MS = 460;
const DEFAULT_SPREADSHEET_ID = '1maNGIkVq8CslP5SwJtrDglcGqjJduXa3hRGM_KQadK8';
const DEFAULT_DAILY_QUOTE_COUNT = 6;
const DEFAULT_JAPANESE_SAMPLE_TEXT =
  'こんにちは。今日は、設計事務所向けのショールーム案内についてご紹介します。\n' +
  'カタログや図面だけでは伝わりにくい質感、操作感、音の聞こえ方。\n' +
  'そうした実際の体感を、ぜひショールームでご確認ください。';
const TTS_VOICE_PRESETS = {
  wavenet_a: {
    label: 'WaveNet A | 柔らかい女性',
    languageCode: 'ja-JP',
    voiceName: 'ja-JP-Wavenet-A',
    family: 'wavenet',
    speakingRate: 0.94,
    pitch: -1.5
  },
  wavenet_a_sweet: {
    label: 'WaveNet A | 甘め女性',
    languageCode: 'ja-JP',
    voiceName: 'ja-JP-Wavenet-A',
    family: 'wavenet',
    speakingRate: 0.98,
    pitch: 1.2,
    pauseShortMs: 180,
    pauseMediumMs: 300,
    pauseLongMs: 520
  },
  chirp_aoede: {
    label: 'Chirp 3 HD Aoede | 生っぽい女性',
    languageCode: 'ja-JP',
    voiceName: 'ja-JP-Chirp3-HD-Aoede',
    family: 'chirp3hd',
    speakingRate: 0.9,
    pitch: 0
  },
  chirp_aoede_cute: {
    label: 'Chirp 3 HD Aoede | かわいめ',
    languageCode: 'ja-JP',
    voiceName: 'ja-JP-Chirp3-HD-Aoede',
    family: 'chirp3hd',
    speakingRate: 0.96,
    pitch: 0,
    pauseShortMs: 180,
    pauseMediumMs: 300,
    pauseLongMs: 520
  },
  chirp_achernar: {
    label: 'Chirp 3 HD Achernar | 明るめ女性',
    languageCode: 'ja-JP',
    voiceName: 'ja-JP-Chirp3-HD-Achernar',
    family: 'chirp3hd',
    speakingRate: 0.9,
    pitch: 0
  },
  chirp_kore: {
    label: 'Chirp 3 HD Kore | やわらかめ女性',
    languageCode: 'ja-JP',
    voiceName: 'ja-JP-Chirp3-HD-Kore',
    family: 'chirp3hd',
    speakingRate: 0.92,
    pitch: 0,
    pauseShortMs: 200,
    pauseMediumMs: 320,
    pauseLongMs: 560
  },
  chirp_leda: {
    label: 'Chirp 3 HD Leda | 甘め女性',
    languageCode: 'ja-JP',
    voiceName: 'ja-JP-Chirp3-HD-Leda',
    family: 'chirp3hd',
    speakingRate: 0.95,
    pitch: 0,
    pauseShortMs: 180,
    pauseMediumMs: 300,
    pauseLongMs: 520
  },
  chirp_leda_sweeter: {
    label: 'Chirp 3 HD Leda | もっと甘め',
    languageCode: 'ja-JP',
    voiceName: 'ja-JP-Chirp3-HD-Leda',
    family: 'chirp3hd',
    speakingRate: 0.99,
    pitch: 0,
    pauseShortMs: 150,
    pauseMediumMs: 260,
    pauseLongMs: 460
  },
  chirp_zephyr: {
    label: 'Chirp 3 HD Zephyr | 明るい女性',
    languageCode: 'ja-JP',
    voiceName: 'ja-JP-Chirp3-HD-Zephyr',
    family: 'chirp3hd',
    speakingRate: 0.97,
    pitch: 0,
    pauseShortMs: 170,
    pauseMediumMs: 290,
    pauseLongMs: 500
  },
  neural2_b: {
    label: 'Neural2 B | すっきり女性',
    languageCode: 'ja-JP',
    voiceName: 'ja-JP-Neural2-B',
    family: 'neural2',
    speakingRate: 0.93,
    pitch: -1.2
  },
  neural2_b_sweet: {
    label: 'Neural2 B | 甘め女性',
    languageCode: 'ja-JP',
    voiceName: 'ja-JP-Neural2-B',
    family: 'neural2',
    speakingRate: 0.97,
    pitch: 0.8,
    pauseShortMs: 190,
    pauseMediumMs: 310,
    pauseLongMs: 540
  },
  wavenet_d: {
    label: 'WaveNet D | 落ち着いた男性',
    languageCode: 'ja-JP',
    voiceName: 'ja-JP-Wavenet-D',
    family: 'wavenet',
    speakingRate: 0.94,
    pitch: -1.0
  }
};

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || '');
  if (action === 'today') {
    return jsonOutput_(getTodayVoice_());
  }
  if (action === 'history') {
    return jsonOutput_({ ok: true, items: getDailyVoiceHistory_() });
  }
  if (action === 'ttsSettings') {
    return jsonOutput_({ ok: true, settings: getPublicTtsSettings_() });
  }
  if (action === 'createVoiceComparisonSamples') {
    return jsonOutput_(createVoiceComparisonSamples());
  }

  return jsonOutput_({ quotes: getQuoteRows_() });
}

function doPost(e) {
  const action = String((e && e.parameter && e.parameter.action) || '');

  if (action === 'addQuote') {
    return jsonOutput_(appendQuote_((e && e.parameter) || {}));
  }

  if (action === 'createDailyVoice') {
    return jsonOutput_(createDailyVoice({
      force: String((e && e.parameter && e.parameter.force) || '').toLowerCase() === 'true'
    }));
  }

  if (action === 'subscribe') {
    return jsonOutput_(upsertPushSubscription_((e && e.parameter) || {}));
  }

  if (action === 'ensureQuoteAudio') {
    return jsonOutput_(ensureQuoteAudio_((e && e.parameter) || {}));
  }

  if (action === 'ensureFormationAudio') {
    return jsonOutput_(ensureFormationAudio_((e && e.parameter) || {}));
  }

  if (action === 'testPush') {
    return jsonOutput_(sendTestPush_());
  }

  if (action === 'updateTtsSettings') {
    return jsonOutput_(updateTtsSettings_((e && e.parameter) || {}));
  }

  return jsonOutput_({ ok: false, error: 'Unsupported action' });
}

function createDailyVoice(options) {
  const force = Boolean(options && options.force);
  const today = formatDate_(new Date());
  const dailySheet = getDailySheet_();
  ensureDailyHeaders_(dailySheet);

  const existing = getDailyVoiceByDate_(today);
  if (existing && existing.status === 'ready' && !force) {
    return { ok: true, skipped: true, date: today, dailyVoice: existing };
  }

  const quotes = getQuoteRows_().filter((row) => row.enabled);
  if (!quotes.length) {
    return { ok: false, error: 'No enabled quotes found' };
  }

  const dailyQuotes = pickDailyQuotes_(quotes, today);
  const theme = buildTheme_(dailyQuotes);
  const aiMessage = generateAiMessage_(dailyQuotes, theme);
  const ttsConfig = getTtsConfig_();
  const quoteNarration = buildQuoteNarrationForTts_(dailyQuotes, ttsConfig);
  const aiNarration = buildAiNarrationForTts_(aiMessage, theme, ttsConfig);

  const folder = getOutputFolder_();
  const quoteUrl = synthesizeToDrive_(quoteNarration, `quote-${today}.mp3`, folder, ttsConfig);
  const aiUrl = synthesizeToDrive_(aiNarration, `ai-${today}.mp3`, folder, ttsConfig);
  const appUrl = PropertiesService.getScriptProperties().getProperty('PWA_URL') || '';

  const dailyVoice = upsertDailyVoiceRow_({
    date: today,
    quoteIds: dailyQuotes.map((quote) => quote.id),
    theme: theme,
    aiMessage: aiMessage,
    quoteAudioUrl: quoteUrl,
    aiAudioUrl: aiUrl,
    appUrl: appUrl,
    status: 'ready'
  });

  writeDailyResult_(dailyQuotes, dailyVoice);
  const pushResult = sendDailyPush_(dailyQuotes, dailyVoice);
  if (pushResult.ok && pushResult.sent > 0) markPushNotified_(today);

  return {
    ok: true,
    date: today,
    dailyVoice: getDailyVoiceByDate_(today),
    quotesSelected: dailyQuotes.length,
    push: pushResult
  };
}

function installDailyTrigger(hour) {
  const triggerHour = typeof hour === 'number' ? hour : 7;
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((trigger) => {
    if (trigger.getHandlerFunction() === 'createDailyVoiceTrigger') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('createDailyVoiceTrigger')
    .timeBased()
    .everyDays(1)
    .atHour(triggerHour)
    .create();

  return { ok: true, hour: triggerHour };
}

function createDailyVoiceTrigger() {
  return createDailyVoice({ force: false });
}

function createVoiceComparisonSamples() {
  const text = getSampleJapaneseText_();
  const folder = getOrCreateFolder_(SAMPLE_OUTPUT_FOLDER_NAME);
  const presetKeys = [
    'chirp_aoede',
    'chirp_aoede_cute',
    'chirp_kore',
    'chirp_leda',
    'chirp_leda_sweeter',
    'chirp_zephyr'
  ];
  const outputs = [];

  presetKeys.forEach((presetKey) => {
    const preset = TTS_VOICE_PRESETS[presetKey];
    if (!preset) return;
    const config = getTtsConfig_(preset);
    const narration = buildStandaloneNarrationForTts_(text, config);
    const fileName = `output_${presetKey}.mp3`;
    const audioUrl = synthesizeToDrive_(narration, fileName, folder, config);
    outputs.push({
      preset: presetKey,
      label: preset.label,
      voiceName: config.voiceName,
      inputMode: getPreferredInputMode_(config),
      audioUrl: audioUrl
    });
  });

  return {
    ok: true,
    sampleText: text,
    outputs: outputs
  };
}

function ensureQuoteAudio_(params) {
  const quoteId = String(params.quoteId || '').trim();
  const force = String(params.force || '').toLowerCase() === 'true';
  if (!quoteId) {
    return { ok: false, error: 'quoteId is required' };
  }

  const quoteRow = getQuoteRowById_(quoteId);
  if (!quoteRow || !quoteRow.item || !quoteRow.item.text) {
    return { ok: false, error: 'Quote not found' };
  }

  const quote = quoteRow.item;
  const ttsConfig = getTtsConfig_();
  const folder = getOutputFolder_();
  const theme = buildTheme_([quote]);
  const aiMessage = quote.aiMessage || generateAiMessage_([quote], theme);

  let quoteAudioUrl = quote.quoteAudioUrl;
  let aiAudioUrl = quote.aiAudioUrl;

  if (force || !quoteAudioUrl) {
    const quoteNarration = buildQuoteNarrationForTts_([quote], ttsConfig);
    quoteAudioUrl = synthesizeToDrive_(quoteNarration, `quote-${quote.id}.mp3`, folder, ttsConfig);
  }

  if (force || !aiAudioUrl) {
    const aiNarration = buildAiNarrationForTts_(aiMessage, theme, ttsConfig);
    aiAudioUrl = synthesizeToDrive_(aiNarration, `ai-${quote.id}.mp3`, folder, ttsConfig);
  }

  updateQuoteAudioRow_(quoteRow.rowNumber, {
    aiMessage: aiMessage,
    quoteAudioUrl: quoteAudioUrl,
    aiAudioUrl: aiAudioUrl,
    generatedDate: formatDate_(new Date())
  });

  const updated = getQuoteRowById_(quoteId);
  return { ok: true, quote: updated ? updated.item : quote };
}

function ensureFormationAudio_(params) {
  const mode = String(params.mode || 'quote').trim().toLowerCase();
  const requestedIds = String(params.quoteIds || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const title = String(params.title || '').trim();
  const force = String(params.force || '').toLowerCase() === 'true';

  if (!requestedIds.length) {
    return { ok: false, error: 'quoteIds is required' };
  }

  const quotesById = {};
  getQuoteRows_().forEach((quote) => {
    quotesById[quote.id] = quote;
  });

  const quotes = requestedIds
    .map((id) => quotesById[id])
    .filter((quote) => quote && quote.enabled && quote.text)
    .slice(0, 10);

  if (!quotes.length) {
    return { ok: false, error: 'No valid quotes found for formation' };
  }

  const ttsConfig = getTtsConfig_();
  const folder = getOrCreateFolder_(FORMATION_OUTPUT_FOLDER_NAME);
  const theme = buildTheme_(quotes);
  const formationTitle = title || `${quotes.length}件の名言フォーメーション`;
  const signature = buildFormationSignature_(quotes, mode, ttsConfig);
  const fileName = `formation-${signature}.mp3`;

  if (!force) {
    const existingUrl = findExistingDriveFileUrl_(folder, fileName);
    if (existingUrl) {
      return {
        ok: true,
        formation: {
          mode: mode,
          title: formationTitle,
          quoteIds: quotes.map((quote) => quote.id),
          audioUrl: existingUrl
        }
      };
    }
  }

  let narration;
  if (mode === 'ai') {
    const aiMessage = generateAiMessage_(quotes, theme);
    narration = buildAiNarrationForTts_(aiMessage, theme, ttsConfig);
  } else {
    narration = buildQuoteNarrationForTts_(quotes, ttsConfig);
  }

  const audioUrl = synthesizeToDrive_(narration, fileName, folder, ttsConfig);
  return {
    ok: Boolean(audioUrl),
    formation: {
      mode: mode,
      title: formationTitle,
      quoteIds: quotes.map((quote) => quote.id),
      audioUrl: audioUrl
    }
  };
}

function getPublicTtsSettings_() {
  const config = getTtsConfig_();
  return {
    voiceName: config.voiceName,
    languageCode: config.languageCode,
    speakingRate: config.speakingRate,
    pitch: config.pitch,
    audioEncoding: config.audioEncoding,
    useSSML: config.useSSML,
    pauseShortMs: config.pauseShortMs,
    pauseMediumMs: config.pauseMediumMs,
    pauseLongMs: config.pauseLongMs,
    sampleText: getSampleJapaneseText_(),
    aliasesJson: JSON.stringify(config.aliases, null, 2),
    presets: Object.keys(TTS_VOICE_PRESETS).map((key) => ({
      key: key,
      label: TTS_VOICE_PRESETS[key].label,
      voiceName: TTS_VOICE_PRESETS[key].voiceName,
      family: TTS_VOICE_PRESETS[key].family
    }))
  };
}

function updateTtsSettings_(params) {
  const properties = PropertiesService.getScriptProperties();
  const keys = [
    'GOOGLE_TTS_VOICE',
    'GOOGLE_TTS_LANGUAGE_CODE',
    'GOOGLE_TTS_RATE',
    'GOOGLE_TTS_PITCH',
    'GOOGLE_TTS_AUDIO_ENCODING',
    'GOOGLE_TTS_USE_SSML',
    'GOOGLE_TTS_PAUSE_SHORT_MS',
    'GOOGLE_TTS_PAUSE_MEDIUM_MS',
    'GOOGLE_TTS_PAUSE_LONG_MS',
    'GOOGLE_TTS_ALIASES',
    'GOOGLE_TTS_SAMPLE_TEXT'
  ];

  keys.forEach((key) => {
    const paramKey = toCamelCasePropertyKey_(key);
    if (Object.prototype.hasOwnProperty.call(params, paramKey)) {
      const value = String(params[paramKey] || '').trim();
      if (value) {
        properties.setProperty(key, value);
      } else {
        properties.deleteProperty(key);
      }
    }
  });

  return {
    ok: true,
    settings: getPublicTtsSettings_()
  };
}

function sendTestPush_() {
  const today = formatDate_(new Date());
  const existing = getDailyVoiceByDate_(today);
  if (!existing) {
    return { ok: false, error: 'No daily voice exists for today' };
  }

  const quotes = getQuoteRows_().filter((quote) => existing.quoteIds.indexOf(quote.id) !== -1);
  const pushResult = sendDailyPush_(quotes, existing, true);
  return { ok: true, push: pushResult };
}

function getTodayVoice_() {
  const today = formatDate_(new Date());
  const dailyVoice = getDailyVoiceByDate_(today);
  if (!dailyVoice) {
    return { ok: false, date: today, error: 'No daily voice found' };
  }

  return { ok: true, date: today, dailyVoice: dailyVoice };
}

function getDailyVoiceHistory_() {
  const sheet = getDailySheet_();
  ensureDailyHeaders_(sheet);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(String);
  return values
    .slice(1)
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index];
      });
      return {
        date: normalizeSheetDate_(item.date),
        theme: String(item.theme || ''),
        quoteIds: String(item.quoteIds || '').split(',').map((id) => id.trim()).filter(Boolean),
        aiMessage: String(item.aiMessage || ''),
        quoteAudioUrl: String(item.quoteAudioUrl || ''),
        aiAudioUrl: String(item.aiAudioUrl || ''),
        appUrl: String(item.appUrl || ''),
        status: String(item.status || ''),
        pushNotifiedAt: String(item.pushNotifiedAt || '')
      };
    })
    .filter((item) => item.date && (item.quoteAudioUrl || item.aiAudioUrl))
    .sort((left, right) => right.date.localeCompare(left.date));
}

function getQuoteRows_() {
  const sheet = getQuoteSheet_();
  ensureQuoteHeaders_(sheet);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(String);

  return values
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row, index) => {
      const item = {};
      headers.forEach((header, columnIndex) => {
        item[header] = row[columnIndex];
      });

      return {
        id: String(item.id || index + 1),
        text: String(item.text || item.quote || ''),
        source: String(item.source || ''),
        tags: String(item.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
        enabled: item.enabled !== false && String(item.enabled).toUpperCase() !== 'FALSE',
        quoteAudioUrl: String(item.quoteAudioUrl || ''),
        aiMessage: String(item.aiMessage || ''),
        aiAudioUrl: String(item.aiAudioUrl || ''),
        generatedDate: String(item.generatedDate || '')
      };
    })
    .filter((row) => row.text);
}

function getQuoteRowById_(quoteId) {
  const sheet = getQuoteSheet_();
  ensureQuoteHeaders_(sheet);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0].map(String);
  const rowIndex = values.slice(1).findIndex((row) => String(row[headers.indexOf('id')] || '') === String(quoteId));
  if (rowIndex === -1) return null;

  const row = values[rowIndex + 1];
  const item = {};
  headers.forEach((header, index) => {
    item[header] = row[index];
  });

  return {
    rowNumber: rowIndex + 2,
    item: {
      id: String(item.id || ''),
      text: String(item.text || ''),
      tags: String(item.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      source: String(item.source || ''),
      enabled: item.enabled !== false && String(item.enabled).toUpperCase() !== 'FALSE',
      quoteAudioUrl: String(item.quoteAudioUrl || ''),
      aiMessage: String(item.aiMessage || ''),
      aiAudioUrl: String(item.aiAudioUrl || ''),
      generatedDate: String(item.generatedDate || '')
    }
  };
}

function getQuoteSheet_() {
  const spreadsheet = SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;
  return spreadsheet.insertSheet(SHEET_NAME);
}

function getDailySheet_() {
  const spreadsheet = SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(DAILY_SHEET_NAME);
  if (sheet) return sheet;
  return spreadsheet.insertSheet(DAILY_SHEET_NAME);
}

function getSubscriptionSheet_() {
  const spreadsheet = SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SUBSCRIPTION_SHEET_NAME);
  if (sheet) return sheet;
  return spreadsheet.insertSheet(SUBSCRIPTION_SHEET_NAME);
}

function generateAiMessage_(quotes, theme) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return `今日は${theme}を意識する日です。完璧を急がず、今の自分が選べる一歩を静かに続けてください。`;
  }

  const content = quotes.map((quote) => `- ${quote.text}`).join('\n');
  const payload = {
    systemInstruction: {
      parts: [
        {
          text: 'あなたは穏やかな伴走者です。音声で自然に読まれる文章を書きます。名言の原文を長く引用せず、短い文で、やわらかく、会話のような日本語にしてください。箇条書きは使わず、1文を長くしすぎないでください。'
        }
      ]
    },
    contents: [
      {
        parts: [
          {
            text: `今日のテーマは「${theme}」です。次の名言集をもとに、60〜120秒で読めるAI語りかけ文を作ってください。朝に耳で聴いて心地よいことを最優先にしてください。短い文で、少し間が取りやすい自然な日本語にしてください。\n${content}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7
    }
  };

  const response = UrlFetchApp.fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );

  const json = JSON.parse(response.getContentText());
  return json.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
}

function synthesizeToDrive_(content, fileName, folder, ttsConfig) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_TTS_API_KEY');
  if (!apiKey) return '';
  const config = ttsConfig || getTtsConfig_();
  const payload = buildTtsRequestPayload_(content, config);
  const response = callTtsApi_(apiKey, payload);
  let json = response.json;

  if (!json.audioContent && payload.input.ssml) {
    const fallbackPayload = buildTtsRequestPayload_(
      buildMarkupFromPlainText_(content.plainText || stripSsml_(content.ssml || '')),
      withTtsOverrides_(config, { useSSML: false })
    );
    const fallbackResponse = callTtsApi_(apiKey, fallbackPayload);
    json = fallbackResponse.json;
  }

  if (!json.audioContent) {
    Logger.log(JSON.stringify({
      ttsError: json.error || 'No audioContent',
      fileName: fileName,
      voiceName: config.voiceName,
      inputMode: getPreferredInputMode_(config)
    }));
    return '';
  }

  const existingFiles = folder.getFilesByName(fileName);
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }

  const blob = Utilities.newBlob(Utilities.base64Decode(json.audioContent), 'audio/mpeg', fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return `https://drive.google.com/uc?export=download&id=${file.getId()}`;
}

function writeDailyResult_(quotes, dailyVoice) {
  const sheet = getQuoteSheet_();
  ensureQuoteHeaders_(sheet);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const generatedDateCol = headers.indexOf('generatedDate') + 1;
  const aiMessageCol = headers.indexOf('aiMessage') + 1;
  const quoteAudioCol = headers.indexOf('quoteAudioUrl') + 1;
  const aiAudioCol = headers.indexOf('aiAudioUrl') + 1;
  const ids = new Set(quotes.map((quote) => quote.id));

  values.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const id = String(row[headers.indexOf('id')] || index + 1);
    if (!ids.has(id)) return;
    if (generatedDateCol) sheet.getRange(rowNumber, generatedDateCol).setValue(dailyVoice.date);
    if (aiMessageCol) sheet.getRange(rowNumber, aiMessageCol).setValue(dailyVoice.aiMessage);
    if (quoteAudioCol) sheet.getRange(rowNumber, quoteAudioCol).setValue(dailyVoice.quoteAudioUrl);
    if (aiAudioCol) sheet.getRange(rowNumber, aiAudioCol).setValue(dailyVoice.aiAudioUrl);
  });
}

function updateQuoteAudioRow_(rowNumber, payload) {
  const sheet = getQuoteSheet_();
  ensureQuoteHeaders_(sheet);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);

  const fields = ['aiMessage', 'quoteAudioUrl', 'aiAudioUrl', 'generatedDate'];
  fields.forEach((field) => {
    const column = headers.indexOf(field) + 1;
    if (column && Object.prototype.hasOwnProperty.call(payload, field)) {
      sheet.getRange(rowNumber, column).setValue(payload[field] || '');
    }
  });
}

function sendDailyPush_(quotes, dailyVoice, isTest) {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('PUSH_WEBHOOK_URL');
  const sharedSecret = PropertiesService.getScriptProperties().getProperty('PUSH_WEBHOOK_SECRET');
  const appUrl = PropertiesService.getScriptProperties().getProperty('PWA_URL') || '';
  if (!webhookUrl || !sharedSecret) {
    return { ok: false, skipped: true, reason: 'Missing push webhook settings' };
  }

  const subscriptions = getPushSubscriptions_();
  if (!subscriptions.length) {
    return { ok: false, skipped: true, reason: 'No push subscriptions' };
  }

  const preview = quotes.slice(0, 2).map((quote) => `・${quote.text}`).join('\n');
  const title = isTest ? 'Voice Shelf テスト通知' : '今日の声が届きました';
  const body = [
    `${dailyVoice.theme}`,
    preview,
    truncate_(dailyVoice.aiMessage, 88),
  ].join(' / ');

  const response = UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      secret: sharedSecret,
      title: title,
      body: body,
      url: appUrl,
      tag: `voice-shelf-${dailyVoice.date}`,
      subscriptions: subscriptions
    }),
    muteHttpExceptions: true
  });

  const responseBody = response.getContentText();
  if (!responseBody) {
    return { ok: false, status: response.getResponseCode(), error: 'Empty push response' };
  }

  const parsed = JSON.parse(responseBody);
  return {
    ok: response.getResponseCode() >= 200 && response.getResponseCode() < 300,
    status: response.getResponseCode(),
    sent: Number(parsed.sent || 0),
    failed: Number(parsed.failed || 0)
  };
}

function getPushSubscriptions_() {
  const sheet = getSubscriptionSheet_();
  ensureSubscriptionHeaders_(sheet);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(String);
  const endpointIndex = headers.indexOf('endpoint');
  const subscriptionIndex = headers.indexOf('subscriptionJson');

  return values
    .slice(1)
    .filter((row) => row[endpointIndex] && row[subscriptionIndex])
    .map((row) => JSON.parse(String(row[subscriptionIndex])));
}

function upsertPushSubscription_(params) {
  const sharedSecret = PropertiesService.getScriptProperties().getProperty('PUSH_WEBHOOK_SECRET');
  if (sharedSecret && String(params.secret || '') !== sharedSecret) {
    return { ok: false, error: 'Unauthorized' };
  }

  const endpoint = String(params.endpoint || '').trim();
  const subscriptionJson = String(params.subscription || '').trim();
  const userAgent = String(params.userAgent || '').trim();
  if (!endpoint || !subscriptionJson) {
    return { ok: false, error: 'Missing subscription data' };
  }

  const sheet = getSubscriptionSheet_();
  ensureSubscriptionHeaders_(sheet);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const endpointIndex = headers.indexOf('endpoint');
  const rowIndex = values.slice(1).findIndex((row) => String(row[endpointIndex]) === endpoint);
  const now = new Date();
  const rowValues = [endpoint, subscriptionJson, userAgent, now, now];

  if (rowIndex === -1) {
    sheet.appendRow(rowValues);
  } else {
    sheet.getRange(rowIndex + 2, 1, 1, rowValues.length).setValues([rowValues]);
  }

  return { ok: true };
}

function ensureSubscriptionHeaders_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(['endpoint', 'subscriptionJson', 'userAgent', 'createdAt', 'lastSeenAt']);
}

function markPushNotified_(date) {
  const sheet = getDailySheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const dateIndex = headers.indexOf('date');
  const notifiedIndex = headers.indexOf('pushNotifiedAt') + 1;
  const rowIndex = values.slice(1).findIndex((row) => normalizeSheetDate_(row[dateIndex]) === date);
  if (rowIndex === -1 || !notifiedIndex) return;
  sheet.getRange(rowIndex + 2, notifiedIndex).setValue(new Date());
}

function getOutputFolder_() {
  return getOrCreateFolder_(OUTPUT_FOLDER_NAME);
}

function findExistingDriveFileUrl_(folder, fileName) {
  const files = folder.getFilesByName(fileName);
  if (!files.hasNext()) return '';
  const file = files.next();
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return `https://drive.google.com/uc?export=download&id=${file.getId()}`;
}

function buildFormationSignature_(quotes, mode, ttsConfig) {
  const base = [
    mode,
    ttsConfig.voiceName,
    ttsConfig.speakingRate,
    ttsConfig.pauseShortMs,
    ttsConfig.pauseMediumMs,
    ttsConfig.pauseLongMs,
    quotes.map((quote) => `${quote.id}:${quote.text}`).join('|')
  ].join('::');

  let hash = 0;
  for (var index = 0; index < base.length; index += 1) {
    hash = (hash * 31 + base.charCodeAt(index)) % 2147483647;
  }
  return String(hash);
}

function appendQuote_(params) {
  const sheet = getQuoteSheet_();
  ensureQuoteHeaders_(sheet);
  const today = formatDate_(new Date());
  const id = Utilities.getUuid();
  const text = String(params.text || '').trim();
  const tags = String(params.tags || '').trim();
  const source = String(params.source || 'サイト入力').trim();

  if (!text) {
    return { ok: false, error: 'Text is required' };
  }

  sheet.appendRow([id, text, tags, source, true, '', '', '', today]);
  return { ok: true, id: id };
}

function ensureQuoteHeaders_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(['id', 'text', 'tags', 'source', 'enabled', 'quoteAudioUrl', 'aiMessage', 'aiAudioUrl', 'generatedDate']);
}

function ensureDailyHeaders_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(['date', 'theme', 'quoteIds', 'aiMessage', 'quoteAudioUrl', 'aiAudioUrl', 'appUrl', 'status', 'pushNotifiedAt']);
}

function pickDailyQuotes_(quotes, dateKey) {
  const count = getDailyQuoteCount_();
  const sorted = quotes
    .slice()
    .sort((left, right) => scoreQuote_(left, dateKey) - scoreQuote_(right, dateKey));
  return sorted.slice(0, Math.min(count, sorted.length));
}

function scoreQuote_(quote, dateKey) {
  const base = `${dateKey}:${quote.id}:${quote.text}`;
  let score = 0;
  for (var index = 0; index < base.length; index += 1) {
    score = (score * 31 + base.charCodeAt(index)) % 1000003;
  }
  return score;
}

function buildTheme_(quotes) {
  const tags = [];
  quotes.forEach((quote) => {
    quote.tags.forEach((tag) => {
      if (tag) tags.push(tag);
    });
  });

  if (!tags.length) return '今日の整え';

  const counts = {};
  tags.forEach((tag) => {
    counts[tag] = (counts[tag] || 0) + 1;
  });

  return Object.keys(counts).sort((left, right) => counts[right] - counts[left])[0];
}

function upsertDailyVoiceRow_(dailyVoice) {
  const sheet = getDailySheet_();
  ensureDailyHeaders_(sheet);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const dateIndex = headers.indexOf('date');
  const rowIndex = values.slice(1).findIndex((row) => normalizeSheetDate_(row[dateIndex]) === dailyVoice.date);
  const rowValues = [
    dailyVoice.date,
    dailyVoice.theme,
    dailyVoice.quoteIds.join(','),
    dailyVoice.aiMessage,
    dailyVoice.quoteAudioUrl,
    dailyVoice.aiAudioUrl,
    dailyVoice.appUrl,
    dailyVoice.status,
    ''
  ];

  if (rowIndex === -1) {
    sheet.appendRow(rowValues);
  } else {
    sheet.getRange(rowIndex + 2, 1, 1, rowValues.length).setValues([rowValues]);
  }

  return dailyVoice;
}

function getDailyVoiceByDate_(date) {
  const sheet = getDailySheet_();
  ensureDailyHeaders_(sheet);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const headers = values[0].map(String);
  const dateIndex = headers.indexOf('date');
  const row = values.slice(1).find((currentRow) => normalizeSheetDate_(currentRow[dateIndex]) === date);
  if (!row) return null;

  const item = {};
  headers.forEach((header, index) => {
    item[header] = row[index];
  });

  return {
    date: normalizeSheetDate_(item.date),
    theme: String(item.theme || ''),
    quoteIds: String(item.quoteIds || '').split(',').map((id) => id.trim()).filter(Boolean),
    aiMessage: String(item.aiMessage || ''),
    quoteAudioUrl: String(item.quoteAudioUrl || ''),
    aiAudioUrl: String(item.aiAudioUrl || ''),
    appUrl: String(item.appUrl || ''),
    status: String(item.status || ''),
    pushNotifiedAt: String(item.pushNotifiedAt || '')
  };
}

function getDailyQuoteCount_() {
  const raw = PropertiesService.getScriptProperties().getProperty('DAILY_QUOTE_COUNT');
  const value = Number(raw || DEFAULT_DAILY_QUOTE_COUNT);
  return Math.max(1, Math.min(12, value));
}

function getTtsConfig_(overrides) {
  const voiceName = getScriptPropertyOrDefault_('GOOGLE_TTS_VOICE', DEFAULT_GOOGLE_TTS_VOICE);
  const languageCode = getScriptPropertyOrDefault_('GOOGLE_TTS_LANGUAGE_CODE', DEFAULT_GOOGLE_TTS_LANGUAGE_CODE);
  const family = inferVoiceFamily_(voiceName);
  const pitchDefault = family === 'chirp3hd' ? 0 : DEFAULT_GOOGLE_TTS_PITCH;
  const config = {
    voiceName: voiceName,
    languageCode: languageCode,
    family: family,
    speakingRate: getNumberProperty_('GOOGLE_TTS_RATE', DEFAULT_GOOGLE_TTS_RATE, 0.7, 1.2),
    pitch: getNumberProperty_('GOOGLE_TTS_PITCH', pitchDefault, -6, 6),
    audioEncoding: getScriptPropertyOrDefault_('GOOGLE_TTS_AUDIO_ENCODING', DEFAULT_GOOGLE_TTS_AUDIO_ENCODING),
    useSSML: getScriptPropertyOrDefault_('GOOGLE_TTS_USE_SSML', DEFAULT_GOOGLE_TTS_USE_SSML),
    pauseShortMs: getNumberProperty_('GOOGLE_TTS_PAUSE_SHORT_MS', DEFAULT_TTS_PAUSE_SHORT_MS, 80, 1000),
    pauseMediumMs: getNumberProperty_('GOOGLE_TTS_PAUSE_MEDIUM_MS', DEFAULT_TTS_PAUSE_MEDIUM_MS, 120, 1500),
    pauseLongMs: getNumberProperty_('GOOGLE_TTS_PAUSE_LONG_MS', DEFAULT_TTS_PAUSE_LONG_MS, 180, 2000),
    aliases: getReadingAliases_()
  };
  return withTtsOverrides_(config, overrides || {});
}

function withTtsOverrides_(baseConfig, overrides) {
  const merged = {};
  Object.keys(baseConfig).forEach((key) => {
    merged[key] = baseConfig[key];
  });
  Object.keys(overrides || {}).forEach((key) => {
    if (overrides[key] !== undefined && overrides[key] !== null && overrides[key] !== '') {
      merged[key] = overrides[key];
    }
  });
  if (!merged.family) merged.family = inferVoiceFamily_(merged.voiceName);
  return merged;
}

function inferVoiceFamily_(voiceName) {
  const value = String(voiceName || '').toLowerCase();
  if (value.indexOf('chirp3-hd') !== -1) return 'chirp3hd';
  if (value.indexOf('wavenet') !== -1) return 'wavenet';
  if (value.indexOf('neural2') !== -1) return 'neural2';
  if (value.indexOf('studio') !== -1) return 'studio';
  return 'standard';
}

function getPreferredInputMode_(config) {
  const normalizedUseSsml = String(config.useSSML || 'auto').toLowerCase();
  if (config.family === 'chirp3hd') return 'markup';
  if (normalizedUseSsml === 'false' || normalizedUseSsml === '0' || normalizedUseSsml === 'text') return 'text';
  return 'ssml';
}

function buildQuoteNarrationForTts_(quotes, config) {
  const paragraphs = quotes
    .map((quote) => preprocessJapaneseForTts_(quote.text, config))
    .filter((paragraph) => paragraph.sentences.length);
  return buildNarrationContent_(paragraphs, config, { intro: [], outro: [] });
}

function buildAiNarrationForTts_(message, theme, config) {
  const introText = `おはようございます。今日は、${theme}を意識する日です。`;
  const outroText = 'では、今日も無理なく、ひとつずつ進めていきましょう。';
  const paragraphs = preprocessJapaneseForTts_(message, config);
  return buildNarrationContent_([paragraphs], config, {
    intro: preprocessJapaneseForTts_(introText, config).sentences,
    outro: preprocessJapaneseForTts_(outroText, config).sentences
  });
}

function buildStandaloneNarrationForTts_(text, config) {
  const paragraph = preprocessJapaneseForTts_(text, config);
  return buildNarrationContent_([paragraph], config, { intro: [], outro: [] });
}

function buildNarrationContent_(paragraphs, config, options) {
  const plainParagraphs = paragraphs
    .map((paragraph) => paragraph.sentences)
    .filter((sentences) => sentences.length);
  const intro = (options && options.intro) || [];
  const outro = (options && options.outro) || [];
  const allParagraphs = [];

  if (intro.length) allParagraphs.push(intro);
  plainParagraphs.forEach((paragraph) => allParagraphs.push(paragraph));
  if (outro.length) allParagraphs.push(outro);

  const plainText = allParagraphs
    .map((sentences) => sentences.join('\n'))
    .join('\n\n');

  if (getPreferredInputMode_(config) === 'ssml') {
    return {
      ssml: buildJapaneseSsml_(allParagraphs, config),
      plainText: plainText
    };
  }

  return {
    markup: buildMarkupFromParagraphs_(allParagraphs),
    plainText: plainText
  };
}

function preprocessJapaneseForTts_(text, config) {
  const normalized = normalizeNarrationText_(text);
  const expanded = expandReadableJapanese_(normalized);
  const lines = expanded
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .map((line) => normalizeBulletLine_(line));

  const sentences = [];
  lines.forEach((line) => {
    splitIntoSpeechSentences_(line).forEach((sentence) => {
      splitLongSentence_(sentence).forEach((piece) => {
        const finalText = piece.trim();
        if (finalText) sentences.push(finalText);
      });
    });
  });

  return { sentences: sentences };
}

function expandReadableJapanese_(text) {
  return String(text || '')
    .replace(/https?:\/\/[^\s]+/g, (url) => convertUrlToSpeech_(url))
    .replace(/\bwww\.[^\s]+/gi, (url) => convertUrlToSpeech_(url))
    .replace(/\bPWA\b/gi, 'ピー ダブリュー エー')
    .replace(/\bAI\b/g, 'エーアイ')
    .replace(/\bUI\b/g, 'ユーアイ')
    .replace(/\bUX\b/g, 'ユーエックス')
    .replace(/\bSSML\b/gi, 'エス エス エム エル')
    .replace(/\bURL\b/gi, 'ユーアールエル')
    .replace(/\//g, '／')
    .replace(/&/g, ' アンド ')
    .replace(/[•●◦▪︎■]/g, '・');
}

function normalizeBulletLine_(line) {
  return line
    .replace(/^\s*[-*・]+\s*/g, '')
    .replace(/^\s*\d+[.)．、]\s*/g, '')
    .replace(/^\s*#+\s*/g, '');
}

function convertUrlToSpeech_(url) {
  return String(url || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, 'ダブリュー ダブリュー ダブリュー ドット ')
    .replace(/\./g, ' ドット ')
    .replace(/\//g, ' スラッシュ ')
    .replace(/-/g, ' ハイフン ')
    .replace(/_/g, ' アンダーバー ');
}

function splitLongSentence_(sentence) {
  const trimmed = String(sentence || '').trim();
  if (!trimmed) return [];
  if (trimmed.length <= 34) return [trimmed];

  const chunks = [];
  let current = '';
  const parts = trimmed.split(/([、，])/);
  parts.forEach((part) => {
    if (!part) return;
    if ((current + part).length > 34 && current) {
      chunks.push(current.trim());
      current = '';
    }
    current += part;
  });
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [trimmed];
}

function buildJapaneseSsml_(paragraphs, config) {
  const shortBreak = `<break time="${Math.round(config.pauseShortMs)}ms"/>`;
  const mediumBreak = `<break time="${Math.round(config.pauseMediumMs)}ms"/>`;
  const longBreak = `<break time="${Math.round(config.pauseLongMs)}ms"/>`;
  const paragraphsSsml = paragraphs
    .map((sentences) => {
      const body = sentences
        .map((sentence) => `<s>${renderSentenceToSsml_(sentence, config.aliases)}</s>`)
        .join(shortBreak);
      return `<p>${body}</p>`;
    })
    .join(longBreak);
  const prosodyAttrs = [
    `rate="${toSsmlRate_(config.speakingRate)}"`,
    config.family === 'chirp3hd' ? '' : `pitch="${formatPitchForSsml_(config.pitch)}"`
  ].filter(Boolean).join(' ');
  return `<speak><prosody ${prosodyAttrs}>${paragraphsSsml}</prosody></speak>`;
}

function renderSentenceToSsml_(sentence, aliases) {
  const matches = buildAliasMatches_(sentence, aliases || {});
  if (!matches.length) return escapeXml_(sentence);

  let cursor = 0;
  let output = '';
  matches.forEach((match) => {
    if (match.index > cursor) {
      output += escapeXml_(sentence.slice(cursor, match.index));
    }
    output += `<sub alias="${escapeXmlAttribute_(match.alias)}">${escapeXml_(match.text)}</sub>`;
    cursor = match.index + match.text.length;
  });
  if (cursor < sentence.length) {
    output += escapeXml_(sentence.slice(cursor));
  }
  return output;
}

function buildAliasMatches_(sentence, aliases) {
  const keys = Object.keys(aliases || {}).sort((left, right) => right.length - left.length);
  const matches = [];
  let cursor = 0;

  while (cursor < sentence.length) {
    let found = null;
    keys.some((key) => {
      if (sentence.slice(cursor, cursor + key.length) === key) {
        found = {
          index: cursor,
          text: key,
          alias: aliases[key]
        };
        return true;
      }
      return false;
    });
    if (found) {
      matches.push(found);
      cursor += found.text.length;
    } else {
      cursor += 1;
    }
  }

  return matches;
}

function buildMarkupFromParagraphs_(paragraphs) {
  return paragraphs
    .map((sentences) => sentences.join(' [pause] '))
    .filter(Boolean)
    .join(' [pause long] ');
}

function buildMarkupFromPlainText_(text) {
  return splitIntoSpeechSentences_(text).join(' [pause] ');
}

function buildTtsRequestPayload_(content, config) {
  const inputMode = getPreferredInputMode_(config);
  const payload = {
    voice: {
      languageCode: config.languageCode,
      name: config.voiceName
    },
    audioConfig: {
      audioEncoding: config.audioEncoding,
      speakingRate: config.speakingRate
    },
    input: {}
  };

  if (config.family !== 'chirp3hd' && Number(config.pitch)) {
    payload.audioConfig.pitch = config.pitch;
  }

  if (inputMode === 'ssml' && content.ssml) {
    payload.input.ssml = content.ssml;
  } else if (inputMode === 'markup' && content.markup) {
    payload.input.markup = content.markup;
  } else {
    payload.input.text = content.plainText || content.markup || stripSsml_(content.ssml || '');
  }

  return payload;
}

function callTtsApi_(apiKey, payload) {
  const response = UrlFetchApp.fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  return {
    responseCode: response.getResponseCode(),
    json: JSON.parse(response.getContentText() || '{}')
  };
}

function getReadingAliases_() {
  const defaults = {
    PWA: 'ピー ダブリュー エー',
    AI: 'エーアイ',
    UI: 'ユーアイ',
    UX: 'ユーエックス',
    SSML: 'エス エス エム エル',
    TTS: 'ティー ティー エス',
    URL: 'ユーアールエル'
  };
  const raw = PropertiesService.getScriptProperties().getProperty('GOOGLE_TTS_ALIASES');
  if (!raw) return defaults;

  try {
    const parsed = JSON.parse(raw);
    Object.keys(parsed || {}).forEach((key) => {
      defaults[key] = String(parsed[key]);
    });
  } catch (error) {
    Logger.log(`Failed to parse GOOGLE_TTS_ALIASES: ${error}`);
  }

  return defaults;
}

function getSampleJapaneseText_() {
  return getScriptPropertyOrDefault_('GOOGLE_TTS_SAMPLE_TEXT', DEFAULT_JAPANESE_SAMPLE_TEXT);
}

function getScriptPropertyOrDefault_(key, fallback) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  return value === null || value === undefined || value === '' ? fallback : value;
}

function getNumberProperty_(key, fallback, min, max) {
  const value = Number(getScriptPropertyOrDefault_(key, fallback));
  if (!isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function getOrCreateFolder_(name) {
  const folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}

function toCamelCasePropertyKey_(propertyKey) {
  return String(propertyKey || '')
    .toLowerCase()
    .split('_')
    .map((part, index) => {
      if (!index) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function normalizeSheetDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return formatDate_(value);
  }

  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return formatDate_(parsed);
  }

  return text;
}

function truncate_(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function normalizeNarrationText_(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function splitIntoSpeechSentences_(text) {
  const normalized = normalizeNarrationText_(text)
    .replace(/[。]+/g, '。')
    .replace(/[！!]+/g, '！')
    .replace(/[？?]+/g, '？')
    .replace(/([：:])\s*/g, '$1 ')
    .replace(/([;；])\s*/g, '$1 ');
  const sentences = [];
  let current = '';

  for (var index = 0; index < normalized.length; index += 1) {
    const char = normalized.charAt(index);
    current += char;
    if (char === '。' || char === '！' || char === '？') {
      const trimmed = current.trim();
      if (trimmed) sentences.push(trimmed);
      current = '';
    }
  }

  if (current.trim()) sentences.push(current.trim());
  return sentences;
}

function toSsmlRate_(rate) {
  return `${Math.round(Number(rate || 1) * 100)}%`;
}

function formatPitchForSsml_(pitch) {
  const value = Number(pitch || 0);
  if (!isFinite(value) || value === 0) return 'default';
  return `${value > 0 ? '+' : ''}${value}st`;
}

function stripSsml_(ssml) {
  return String(ssml || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeXml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeXmlAttribute_(value) {
  return escapeXml_(value);
}
