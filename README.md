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
PWA_URL
DAILY_QUOTE_COUNT
PUSH_WEBHOOK_URL
PUSH_WEBHOOK_SECRET
```

`createDailyVoice` を時間主導トリガーで毎朝実行すると、その日の名言セット選定、AI語りかけ生成、原文MP3、AI MP3、Android 向けの Push 通知までまとめて実行します。`doPost` ではサイトからの名言追加も受け取ります。

最初に Apps Script で試す順番はこれです。

1. `createDailyVoice()` を手動実行する
2. シートに `DailyVoices` タブが増えることを確認する
3. シートに `PushSubscriptions` タブができ、Android 端末で通知購読後に購読情報が入ることを確認する
4. `Quotes` タブの対象行に `quoteAudioUrl` / `aiMessage` / `aiAudioUrl` / `generatedDate` が入ることを確認する
5. `sendTestPush_()` を実行して、Android に通知が届くか確認する
6. 問題なければ `installDailyTrigger(7)` のように実行して毎朝トリガーを作る

補足:

- `DAILY_QUOTE_COUNT` は毎朝選ぶ名言数です。未設定なら `6`
- `doGet?action=today` でその日の生成済みデータを返します
- `DailyVoices` タブに日ごとの生成結果と通知状態が残ります

## Vercel 環境変数

Vercel には次の環境変数を設定します。

```text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
PUSH_WEBHOOK_SECRET
GAS_WEB_APP_URL
```

- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: Web Push 用の鍵
- `VAPID_SUBJECT`: 連絡先。例 `mailto:your@email.com`
- `PUSH_WEBHOOK_SECRET`: GAS と Vercel の共有シークレット
- `GAS_WEB_APP_URL`: デプロイ済み Apps Script の `/exec` URL

## PWAからSheetsを読む

今の GAS Web アプリ URL はこれです。

```text
https://script.google.com/macros/s/AKfycbybOvd5tQZAavAIrsY2xHQRZk9KCjzeSJSEi054KV8Sm34vbdV8VlYmMZJAs3LgDVMt/exec
```

アプリ本体には既定値として入れてあります。必要ならブラウザの DevTools で上書きもできます。

```js
localStorage.setItem("voiceShelfEndpoint", "https://script.google.com/macros/s/AKfycbybOvd5tQZAavAIrsY2xHQRZk9KCjzeSJSEi054KV8Sm34vbdV8VlYmMZJAs3LgDVMt/exec");
location.reload();
```

これでサイト内の「名言を追加」フォームから、Google Sheets への保存送信も行います。
Android では、ホーム画面に追加したあとに「通知をオンにする」ボタンから Push 通知を購読できます。

## 注意

- APIキーはフロントエンドに置かず、GASのScript Propertiesに保存します。
- AI語りかけ生成は Gemini Flash Preview を使う前提です。
- Android の Push 通知は、Chrome 系ブラウザでホーム画面追加した PWA で試すのが確実です。
- 本番ではGAS Webアプリのアクセス範囲、Driveファイル共有、Vercel の環境変数を必ず確認してください。
