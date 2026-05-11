const SHEET_NAME = 'Quotes';
const DAILY_SHEET_NAME = 'DailyVoices';
const SUBSCRIPTION_SHEET_NAME = 'PushSubscriptions';
const OUTPUT_FOLDER_NAME = 'Voice Shelf Audio';
const GEMINI_MODEL = 'gemini-3-flash-preview';
const DEFAULT_GOOGLE_TTS_VOICE = 'ja-JP-Chirp3-HD-Achernar';
const DEFAULT_GOOGLE_TTS_RATE = 0.92;
const DEFAULT_SPREADSHEET_ID = '1maNGIkVq8CslP5SwJtrDglcGqjJduXa3hRGM_KQadK8';
const DEFAULT_DAILY_QUOTE_COUNT = 6;

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || '');
  if (action === 'today') {
    return jsonOutput_(getTodayVoice_());
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

  if (action === 'testPush') {
    return jsonOutput_(sendTestPush_());
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
  const quoteNarration = buildQuoteNarrationSsml_(dailyQuotes);
  const aiNarration = buildAiNarrationSsml_(aiMessage, theme);

  const folder = getOutputFolder_();
  const quoteUrl = synthesizeToDrive_(quoteNarration, `quote-${today}.mp3`, folder);
  const aiUrl = synthesizeToDrive_(aiNarration, `ai-${today}.mp3`, folder);
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

function synthesizeToDrive_(ssml, fileName, folder) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_TTS_API_KEY');
  if (!apiKey) return '';
  const voiceName =
    PropertiesService.getScriptProperties().getProperty('GOOGLE_TTS_VOICE') || DEFAULT_GOOGLE_TTS_VOICE;
  const speakingRate = getTtsSpeakingRate_();

  const payload = {
    input: { ssml: ssml },
    voice: { languageCode: 'ja-JP', name: voiceName },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: speakingRate
    }
  };

  const response = UrlFetchApp.fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const json = JSON.parse(response.getContentText());
  if (!json.audioContent) {
    Logger.log(JSON.stringify({ ttsError: json.error || 'No audioContent', fileName: fileName }));
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

function buildQuoteNarrationSsml_(quotes) {
  const sections = quotes.map((quote) => {
    const sentences = splitIntoSpeechSentences_(quote.text);
    if (!sentences.length) return '';
    const body = sentences
      .map((sentence) => `<s>${escapeXml_(sentence)}</s>`)
      .join('<break time="650ms"/>');
    return `<p><prosody rate="92%">${body}</prosody></p>`;
  }).filter(Boolean);

  return `<speak>${sections.join('<break time="1200ms"/>')}</speak>`;
}

function buildAiNarrationSsml_(message, theme) {
  const normalized = normalizeNarrationText_(message);
  const sentences = splitIntoSpeechSentences_(normalized);
  const intro = [
    `<p><s>おはようございます。</s><break time="450ms"/><s>今日のテーマは、${escapeXml_(theme)}です。</s></p>`
  ];
  const body = sentences.map((sentence) => `<s>${escapeXml_(sentence)}</s>`).join('<break time="500ms"/>');
  const outro = '<p><break time="650ms"/><s>では、今日も無理なく、ひとつずつ進めていきましょう。</s></p>';
  return `<speak>${intro.join('')}<break time="900ms"/><p><prosody rate="94%">${body}</prosody></p>${outro}</speak>`;
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
  const folders = DriveApp.getFoldersByName(OUTPUT_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(OUTPUT_FOLDER_NAME);
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

function getTtsSpeakingRate_() {
  const raw = PropertiesService.getScriptProperties().getProperty('GOOGLE_TTS_RATE');
  const value = Number(raw || DEFAULT_GOOGLE_TTS_RATE);
  if (!isFinite(value)) return DEFAULT_GOOGLE_TTS_RATE;
  return Math.max(0.8, Math.min(1.1, value));
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
    .replace(/[？?]+/g, '？');

  return normalized
    .split(/(?<=[。！？])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function escapeXml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
