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
GEMINI_API_KEY
GOOGLE_TTS_API_KEY
LINE_CHANNEL_ACCESS_TOKEN
LINE_USER_ID
PWA_URL
DAILY_QUOTE_COUNT
```

`createDailyVoice` を時間主導トリガーで毎朝実行すると、その日の名言セット選定、AI語りかけ生成、原文MP3、AI MP3、LINE通知までまとめて実行します。`doPost` ではサイトからの名言追加も受け取ります。

最初に Apps Script で試す順番はこれです。

1. `createDailyVoice()` を手動実行する
2. シートに `DailyVoices` タブが増えることを確認する
3. `Quotes` タブの対象行に `quoteAudioUrl` / `aiMessage` / `aiAudioUrl` / `generatedDate` が入ることを確認する
4. `sendTestLineMessage_()` を実行して、LINE 通知が届くか確認する
5. 問題なければ `installDailyTrigger(7)` のように実行して毎朝トリガーを作る

補足:

- `DAILY_QUOTE_COUNT` は毎朝選ぶ名言数です。未設定なら `6`
- `doGet?action=today` でその日の生成済みデータを返します
- `DailyVoices` タブに日ごとの生成結果と通知状態が残ります

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
- AI語りかけ生成は Gemini Flash Preview を使う前提です。
- 本番ではGAS Webアプリのアクセス範囲、Driveファイル共有、LINEの送信先を必ず確認してください。
