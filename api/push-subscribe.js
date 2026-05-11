export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const gasUrl = process.env.GAS_WEB_APP_URL || "";
  const sharedSecret = process.env.PUSH_WEBHOOK_SECRET || "";
  if (!gasUrl || !sharedSecret) {
    response.status(500).json({ error: "Missing GAS_WEB_APP_URL or PUSH_WEBHOOK_SECRET" });
    return;
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  const subscription = body && body.subscription;
  if (!subscription || !subscription.endpoint) {
    response.status(400).json({ error: "Missing subscription" });
    return;
  }

  const payload = new URLSearchParams({
    action: "subscribe",
    secret: sharedSecret,
    endpoint: subscription.endpoint,
    subscription: JSON.stringify(subscription),
    userAgent: String((body && body.userAgent) || ""),
  });

  const gasResponse = await fetch(gasUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: payload.toString(),
  });

  const text = await gasResponse.text();
  response.status(gasResponse.ok ? 200 : 502).send(text);
}
