# Voice Shelf | 名言音声PWA

自分の名言集を、原文アファメーションとAI語りかけの2モードで聴けるPWAです。サイト上から名言を追加し、Google Sheets を保存先にできます。

## 使い方

1. `npm run start` を実行する。
2. `http://127.0.0.1:4173` をブラウザで開く。
3. まずはデモ名言が表示され、音声URLがない場合はブラウザの日本語読み上げで再生します。
4. フォームから名言を追加すると、その場で一覧に反映されます。
5. `音声ラボ` で声・速度・間を調整し、そのまま保存やサンプル比較ができます。
6. Google Sheets/GAS連携後は、追加内容を Sheets に送れるようになり、Drive に保存されたGoogle Text-to-SpeechのMP3も再生できます。

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

必要なら次の任意設定も使えます。

```text
GOOGLE_TTS_VOICE
GOOGLE_TTS_LANGUAGE_CODE
GOOGLE_TTS_RATE
GOOGLE_TTS_PITCH
GOOGLE_TTS_AUDIO_ENCODING
GOOGLE_TTS_USE_SSML
GOOGLE_TTS_PAUSE_SHORT_MS
GOOGLE_TTS_PAUSE_MEDIUM_MS
GOOGLE_TTS_PAUSE_LONG_MS
GOOGLE_TTS_ALIASES
GOOGLE_TTS_SAMPLE_TEXT
```

- `GOOGLE_TTS_VOICE`: 既定は `ja-JP-Chirp3-HD-Aoede`
- `GOOGLE_TTS_LANGUAGE_CODE`: 既定は `ja-JP`
- `GOOGLE_TTS_RATE`: 既定は `0.92`。少しゆっくり穏やかにしたいなら `0.88` 〜 `0.94`
- `GOOGLE_TTS_PITCH`: Wavenet/Neural2 系で有効。既定は `-1.0`
- `GOOGLE_TTS_AUDIO_ENCODING`: 既定は `MP3`
- `GOOGLE_TTS_USE_SSML`: `auto` / `true` / `false`
  - `auto`: Chirp 3 HD は `markup`、Wavenet/Neural2 は `SSML`
- `GOOGLE_TTS_PAUSE_SHORT_MS`: 既定 `220`
- `GOOGLE_TTS_PAUSE_MEDIUM_MS`: 既定 `360`
- `GOOGLE_TTS_PAUSE_LONG_MS`: 既定 `650`
- `GOOGLE_TTS_ALIASES`: JSON 形式の読み指定。例 `{"PWA":"ピー ダブリュー エー","UI":"ユーアイ"}`
- `GOOGLE_TTS_SAMPLE_TEXT`: 聴き比べ用のサンプル原稿

`createDailyVoice` を時間主導トリガーで毎朝実行すると、その日の名言セット選定、AI語りかけ生成、原文MP3、AI MP3、Android 向けの Push 通知までまとめて実行します。`doPost` ではサイトからの名言追加も受け取ります。

最初に Apps Script で試す順番はこれです。

1. `createDailyVoice()` を手動実行する
2. シートに `DailyVoices` タブが増えることを確認する
3. シートに `PushSubscriptions` タブができ、Android 端末で通知購読後に購読情報が入ることを確認する
4. `Quotes` タブの対象行に `quoteAudioUrl` / `aiMessage` / `aiAudioUrl` / `generatedDate` が入ることを確認する
5. `sendTestPush_()` を実行して、Android に通知が届くか確認する
6. 問題なければ `installDailyTrigger(7)` のように実行して毎朝トリガーを作る
7. 音声比較したいときは `createVoiceComparisonSamples()` を実行する

補足:

- `DAILY_QUOTE_COUNT` は毎朝選ぶ名言数です。未設定なら `6`
- `doGet?action=today` でその日の生成済みデータを返します
- `DailyVoices` タブに日ごとの生成結果と通知状態が残ります
- `doGet?action=createVoiceComparisonSamples` でも比較サンプルを生成できます

## 日本語音声の改善方針

今回の実装では、音声を次の方針で改善しています。

- 長い日本語文を短めの文に分割する
- 箇条書きや見出し記号を読み上げ向けに整形する
- URL や `AI` / `PWA` / `UI` などを読みやすい表現に寄せる
- `GOOGLE_TTS_ALIASES` で固有名詞や商品名の読みを `sub alias` に差し込めるようにする
- Chirp 3 HD は `markup` と `[pause]` / `[pause long]` を優先する
- Wavenet / Neural2 / Standard 系は `SSML` を使い、`<speak>` / `<p>` / `<s>` / `<break>` / `<sub>` を使う

## まず試したい設定

自然さの出方が違うので、まずは次の 2 パターンをおすすめします。

### 1. まずはリアル寄り

```text
GOOGLE_TTS_VOICE=ja-JP-Chirp3-HD-Aoede
GOOGLE_TTS_RATE=0.9
GOOGLE_TTS_USE_SSML=auto
GOOGLE_TTS_PAUSE_SHORT_MS=220
GOOGLE_TTS_PAUSE_LONG_MS=700
```

### 2. 制御しやすさ重視

```text
GOOGLE_TTS_VOICE=ja-JP-Wavenet-A
GOOGLE_TTS_RATE=0.94
GOOGLE_TTS_PITCH=-1.5
GOOGLE_TTS_USE_SSML=true
GOOGLE_TTS_PAUSE_SHORT_MS=240
GOOGLE_TTS_PAUSE_LONG_MS=760
```

Chirp 3 HD の方が生っぽく聞こえることがありますが、文面によっては Wavenet の方が整って聞こえることがあります。`createVoiceComparisonSamples()` で同じ原稿を聴き比べるのがいちばん早いです。

## サイト上でできること

公開サイトの `音声ラボ` から次を操作できます。

- 現在の TTS 設定の読み込み
- Voice / rate / pitch / pause の変更
- 読み指定 JSON とサンプル原稿の編集
- 設定保存
- 比較用サンプル音声の生成と聞き比べ

最初の API キー設定だけ終えたら、普段の調整は Apps Script の Script Properties を直接開かなくても進められます。

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
