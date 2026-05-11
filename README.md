# Voice Shelf | 名言音声PWA

自分の名言集を、原文アファメーションとAI語りかけの2モードで聴けるPWAです。サイト上から名言を追加し、Google Sheets を保存先にできます。

## 使い方

1. `npm run start` を実行する。
2. `http://127.0.0.1:4173` をブラウザで開く。
3. まずはデモ名言が表示され、音声URLがない場合はブラウザの日本語読み上げで再生します。
4. フォームから名言を追加すると、その場で一覧に反映されます。
5. Google Sheets/GAS連携後は、追加内容を Sheets に送れるようになり、Drive に保存されたGoogle Text-to-SpeechのMP3も再生できます。

```bash
npm run start
```

`index.html` を直接開くこともできますが、PWAのService Worker確認にはローカルサーバーが必要です。

## Google Sheets

今回は次のシートを保存先にする前提です。

```text
https://docs.google.com/spreadsheets/d/1maNGIkVq8CslP5SwJtrDglcGqjJduXa3hRGM_KQadK8
```

`Quotes` シートを作り、1行目に次の列を作成します。シートが空なら GAS 側でも自動作成されます。

```text
id,text,tags,source,enabled,quoteAudioUrl,aiMessage,aiAudioUrl,generatedDate
```

`text` に名言本文、`tags` にカンマ区切りのタグ、`enabled` に `TRUE` を入れます。

## GAS

`gas/Code.gs` をGoogle Apps Scriptへ貼り付け、上のスプレッドシートにバインドするか、そのまま Apps Script プロジェクトとして作成してデプロイします。次の Script Properties を設定します。

```text
OPENAI_API_KEY
GOOGLE_TTS_API_KEY
LINE_CHANNEL_ACCESS_TOKEN
LINE_USER_ID
PWA_URL
```

`createDailyVoice` を時間主導トリガーで毎朝実行すると、AI語りかけ、原文MP3、AI MP3、LINE通知を生成します。`doPost` ではサイトからの名言追加も受け取ります。

## PWAからSheetsを読む

GASを Web アプリとして公開し、返ってくるURLをブラウザの DevTools で次のように保存します。

```js
localStorage.setItem("voiceShelfEndpoint", "https://script.google.com/macros/s/XXXXX/exec");
location.reload();
```

これでサイト内の「名言を追加」フォームから、Google Sheets への保存送信も行います。

## 注意

- LINE Notifyは終了済みなので、LINE Messaging APIを使います。
- APIキーはフロントエンドに置かず、GASのScript Propertiesに保存します。
- 本番ではGAS Webアプリのアクセス範囲、Driveファイル共有、LINEの送信先を必ず確認してください。
