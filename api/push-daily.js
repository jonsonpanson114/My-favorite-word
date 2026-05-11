import webpush from "web-push";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const sharedSecret = process.env.PUSH_WEBHOOK_SECRET || "";
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "";
  if (!sharedSecret || !publicKey || !privateKey || !subject) {
    response.status(500).json({ error: "Missing push environment variables" });
    return;
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  if (!body || body.secret !== sharedSecret) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const subscriptions = Array.isArray(body.subscriptions) ? body.subscriptions : [];
  if (!subscriptions.length) {
    response.status(200).json({ ok: true, sent: 0, failed: 0 });
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const notificationPayload = JSON.stringify({
    title: body.title || "Voice Shelf",
    body: body.body || "今日の音声が届きました。",
    url: body.url || "/",
    tag: body.tag || "voice-shelf-daily",
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, notificationPayload);
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error("push failed", error && error.statusCode, subscription && subscription.endpoint);
      }
    })
  );

  response.status(200).json({ ok: true, sent, failed });
}
