// Netlify runs this after every verified (not spam) form submission on the site.
// For the pilot form it emails the matching "thanks for signing up" reply from hello@ through Resend.
// Needs the environment variable RESEND_API_KEY (a send-only key for retunephysio.com.au), set in Netlify,
// never in git. Logs never include names or email addresses.
import { pilotReply } from "./pilot-reply.mjs";

export const handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body ?? "{}").payload ?? {};
  } catch {
    console.log("pilot-reply: unreadable event");
    return { statusCode: 200, body: "ignored" };
  }
  const reply = pilotReply(payload.form_name, payload.data);
  if (reply.skip) {
    console.log(`pilot-reply: skipped (${reply.skip})`);
    return { statusCode: 200, body: "skipped" };
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("pilot-reply: RESEND_API_KEY not set, nothing sent");
    return { statusCode: 200, body: "not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // The same submission never gets two replies, even if Netlify retries.
        "Idempotency-Key": `pilot-${payload.id ?? payload.number ?? reply.to}`,
      },
      body: JSON.stringify({
        from: "Adam at Retune <hello@retunephysio.com.au>",
        reply_to: "hello@retunephysio.com.au",
        to: [reply.to],
        subject: reply.subject,
        text: reply.text,
        html: reply.html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    console.log(`pilot-reply: ${reply.template} reply ${res.ok ? "sent" : `failed (${res.status})`}`);
  } catch (e) {
    console.log(`pilot-reply: send failed (${e?.name ?? "error"})`);
  }
  // Always 200: a failed reply must never block or repeat the form submission. Adam still gets Netlify's notification.
  return { statusCode: 200, body: "done" };
};
