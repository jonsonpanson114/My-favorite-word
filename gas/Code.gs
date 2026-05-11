const SHEET_NAME = 'Quotes';
const OUTPUT_FOLDER_NAME = 'Voice Shelf Audio';
const OPENAI_MODEL = 'gpt-4.1-mini';
const GOOGLE_TTS_VOICE = 'ja-JP-Chirp3-HD-Achernar';
const DEFAULT_SPREADSHEET_ID = '1maNGIkVq8CslP5SwJtrDglcGqjJduXa3hRGM_KQadK8';

function doGet() {
  const rows = getQuoteRows_();
  return ContentService.createTextOutput(JSON.stringify({ quotes: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const action = String((e && e.parameter && e.parameter.action) || '');
  if (action === 'addQuote') {
    const result = appendQuote_((e && e.parameter) || {});
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Unsupported action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createDailyVoice() {
  const sheet = getSheet_();
  const rows = getQuoteRows_().filter((row) => row.enabled);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const dailyQuotes = rows.slice(0, 8);

  const aiMessage = generateAiMessage_(dailyQuotes);
  const quoteSsml = buildQuoteSsml_(dailyQuotes);
  const aiSsml = buildAiSsml_(aiMessage);

  const folder = getOutputFolder_();
  const quoteUrl = synthesizeToDrive_(quoteSsml, `quote-${today}.mp3`, folder);
  const aiUrl = synthesizeToDrive_(aiSsml, `ai-${today}.mp3`, folder);

  writeDailyResult_(sheet, dailyQuotes, today, aiMessage, quoteUrl, aiUrl);
  pushLineMessage_(dailyQuotes, aiMessage);
}

function getQuoteRows_() {
  const sheet = getSheet_();
  ensureHeaders_(sheet);
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

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;
  return spreadsheet.insertSheet(SHEET_NAME);
}

function generateAiMessage_(quotes) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) {
    return '今日は、集めた言葉を行動に変える日です。完璧な一歩ではなく、今できる一歩を選んでください。';
  }

  const content = quotes.map((quote) => `- ${quote.text}`).join('\n');
  const payload = {
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'あなたは穏やかな伴走者です。名言の原文を長く引用せず、今日の行動や考え方に変換して、自然な日本語で短く語りかけます。'
      },
      {
        role: 'user',
        content: `次の名言集をもとに、60〜120秒で読めるAI語りかけ文を作ってください。\n${content}`
      }
    ],
    temperature: 0.7
  };

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${apiKey}` },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const json = JSON.parse(response.getContentText());
  return json.choices?.[0]?.message?.content?.trim() || '';
}

function synthesizeToDrive_(ssml, fileName, folder) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_TTS_API_KEY');
  if (!apiKey) return '';

  const payload = {
    input: { ssml },
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

function writeDailyResult_(sheet, quotes, today, aiMessage, quoteUrl, aiUrl) {
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
    if (generatedDateCol) sheet.getRange(rowNumber, generatedDateCol).setValue(today);
    if (aiMessageCol) sheet.getRange(rowNumber, aiMessageCol).setValue(aiMessage);
    if (quoteAudioCol) sheet.getRange(rowNumber, quoteAudioCol).setValue(quoteUrl);
    if (aiAudioCol) sheet.getRange(rowNumber, aiAudioCol).setValue(aiUrl);
  });
}

function pushLineMessage_(quotes, aiMessage) {
  const token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  const to = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  const appUrl = PropertiesService.getScriptProperties().getProperty('PWA_URL') || '';
  if (!token || !to) return;

  const preview = quotes.slice(0, 2).map((quote) => `・${quote.text}`).join('\n');
  const message = `今日の声ができました。\n\n${preview}\n\n${aiMessage.slice(0, 120)}...\n${appUrl}`;

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${token}` },
    payload: JSON.stringify({
      to,
      messages: [{ type: 'text', text: message }]
    }),
    muteHttpExceptions: true
  });
}

function getOutputFolder_() {
  const folders = DriveApp.getFoldersByName(OUTPUT_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(OUTPUT_FOLDER_NAME);
}

function escapeXml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function appendQuote_(params) {
  const sheet = getSheet_();
  ensureHeaders_(sheet);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
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

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(['id', 'text', 'tags', 'source', 'enabled', 'quoteAudioUrl', 'aiMessage', 'aiAudioUrl', 'generatedDate']);
}
