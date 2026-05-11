# Voice Shelf | 名言音声PWA

自分の名言集を、原文アファメーションとAI語りかけの2モードで聴くPWAです。

## 使い方

1. `npm run start` を実行する。
2. `http://127.0.0.1:4173` をブラウザで開く。
3. まずはデモ名言が表示され、音声URLがない場合はブラウザの日本語読み上げで再生します。
4. Google Sheets/GAS連携後は、Driveに保存されたGoogle Text-to-SpeechのMP3を再生します。

```bash
npm run start
```

`index.html` を直接開くこともできますが、PWAのService Worker確認にはローカルサーバーが必要です。

## Google Sheets

`Quotes` シートを作り、1行目に次の列を作成します。

```text
id,text,tags,source,enabled,quoteAudioUrl,aiMessage,aiAudioUrl,generatedDate
```

`text` に名言本文、`tags` にカンマ区切りのタグ、`enabled` に `TRUE` を入れます。

## GAS

`gas/Code.gs` をGoogle Apps Scriptへ貼り付け、次のScript Propertiesを設定します。

```text
OPENAI_API_KEY
GOOGLE_TTS_API_KEY
LINE_CHANNEL_ACCESS_TOKEN
LINE_USER_ID
PWA_URL
```

`createDailyVoice` を時間主導トリガーで毎朝実行すると、AI語りかけ、原文MP3、AI MP3、LINE通知を生成します。

## PWAからSheetsを読む

GASをWebアプリとして公開し、返ってくるURLをブラウザのDevToolsで次のように保存します。

```js
localStorage.setItem("voiceShelfEndpoint", "https://script.google.com/macros/s/XXXXX/exec");
location.reload();
```

## 注意

- LINE Notifyは終了済みなので、LINE Messaging APIを使います。
- APIキーはフロントエンドに置かず、GASのScript Propertiesに保存します。
- 本番ではGAS Webアプリのアクセス範囲、Driveファイル共有、LINEの送信先を必ず確認してください。
