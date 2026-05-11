const SHEET_NAME = 'Quotes';
const DAILY_SHEET_NAME = 'DailyVoices';
const OUTPUT_FOLDER_NAME = 'Voice Shelf Audio';
const GEMINI_MODEL = 'gemini-3-flash-preview';
const GOOGLE_TTS_VOICE = 'ja-JP-Chirp3-HD-Achernar';
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

  if (action === 'testLine') {
    return jsonOutput_(sendTestLineMessage_());
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
  const quoteSsml = buildQuoteSsml_(dailyQuotes);
  const aiSsml = buildAiSsml_(aiMessage);

  const folder = getOutputFolder_();
  const quoteUrl = synthesizeToDrive_(quoteSsml, `quote-${today}.mp3`, folder);
  const aiUrl = synthesizeToDrive_(aiSsml, `ai-${today}.mp3`, folder);
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
  const lineResult = pushLineMessage_(dailyQuotes, dailyVoice);
  if (lineResult.ok) {
    markLineNotified_(today);
  }

  return {
    ok: true,
    date: today,
    dailyVoice: getDailyVoiceByDate_(today),
    quotesSelected: dailyQuotes.length,
    line: lineResult
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

function sendTestLineMessage_() {
  const today = formatDate_(new Date());
  const existing = getDailyVoiceByDate_(today);
  if (!existing) {
    return { ok: false, error: 'No daily voice exists for today' };
  }

  const quotes = getQuoteRows_().filter((quote) => existing.quoteIds.indexOf(quote.id) !== -1);
  const lineResult = pushLineMessage_(quotes, existing, true);
  return { ok: true, line: lineResult };
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
          text: 'あなたは穏やかな伴走者です。名言の原文を長く引用せず、今日の行動や考え方に変換して、自然な日本語で短く語りかけます。'
        }
      ]
    },
    contents: [
      {
        parts: [
          {
            text: `今日のテーマは「${theme}」です。次の名言集をもとに、60〜120秒で読めるAI語りかけ文を作ってください。\n${content}`
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

  const payload = {
    input: { ssml: ssml },
    voice: { languageCode: 'ja-JP', name: GOOGLE_TTS_VOICE },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 0.92, pitch: -1.2 }
  };

  const response = UrlFetchApp.fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const json = JSON.parse(response.getContentText());
  if (!json.audioContent) return '';

  const existingFiles = folder.getFilesByName(fileName);
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }

  const blob = Utilities.newBlob(Utilities.base64Decode(json.audioContent), 'audio/mpeg', fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return `https://drive.google.com/uc?export=download&id=${file.getId()}`;
}

function buildQuoteSsml_(quotes) {
  const lines = quotes.map((quote) => `${escapeXml_(quote.text)}<break time="900ms"/>`).join('');
  return `<speak>${lines}</speak>`;
}

function buildAiSsml_(message) {
  return `<speak>${escapeXml_(message)}<break time="600ms"/></speak>`;
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

function pushLineMessage_(quotes, dailyVoice, isTest) {
  const token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  const to = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  const appUrl = PropertiesService.getScriptProperties().getProperty('PWA_URL') || '';
  if (!token || !to) {
    return { ok: false, skipped: true, reason: 'Missing LINE settings' };
  }

  const preview = quotes.slice(0, 2).map((quote) => `・${quote.text}`).join('\n');
  const heading = isTest ? 'テスト通知です。' : '今日の声ができました。';
  const message = [
    heading,
    '',
    `テーマ: ${dailyVoice.theme}`,
    preview,
    '',
    `${truncate_(dailyVoice.aiMessage, 120)}`,
    appUrl
  ].join('\n');

  const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${token}` },
    payload: JSON.stringify({
      to: to,
      messages: [{ type: 'text', text: message }]
    }),
    muteHttpExceptions: true
  });

  return { ok: true, status: response.getResponseCode() };
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
  sheet.appendRow(['date', 'theme', 'quoteIds', 'aiMessage', 'quoteAudioUrl', 'aiAudioUrl', 'appUrl', 'status', 'lineNotifiedAt']);
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
  const rowIndex = values.slice(1).findIndex((row) => String(row[dateIndex]) === dailyVoice.date);
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
  const row = values.slice(1).find((currentRow) => String(currentRow[dateIndex]) === date);
  if (!row) return null;

  const item = {};
  headers.forEach((header, index) => {
    item[header] = row[index];
  });

  return {
    date: String(item.date || ''),
    theme: String(item.theme || ''),
    quoteIds: String(item.quoteIds || '').split(',').map((id) => id.trim()).filter(Boolean),
    aiMessage: String(item.aiMessage || ''),
    quoteAudioUrl: String(item.quoteAudioUrl || ''),
    aiAudioUrl: String(item.aiAudioUrl || ''),
    appUrl: String(item.appUrl || ''),
    status: String(item.status || ''),
    lineNotifiedAt: String(item.lineNotifiedAt || '')
  };
}

function markLineNotified_(date) {
  const sheet = getDailySheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const dateIndex = headers.indexOf('date');
  const notifiedIndex = headers.indexOf('lineNotifiedAt') + 1;
  const rowIndex = values.slice(1).findIndex((row) => String(row[dateIndex]) === date);
  if (rowIndex === -1 || !notifiedIndex) return;
  sheet.getRange(rowIndex + 2, notifiedIndex).setValue(new Date());
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

function truncate_(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function escapeXml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
