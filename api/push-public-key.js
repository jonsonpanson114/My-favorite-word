export default function handler(request, response) {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  if (!publicKey) {
    response.status(500).json({ error: "Missing VAPID_PUBLIC_KEY" });
    return;
  }

  response.status(200).json({ publicKey });
}
