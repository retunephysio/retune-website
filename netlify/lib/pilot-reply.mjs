// The two "thanks for signing up" emails for the pilot form, kept apart from the sending code so they can be tested.
// Wording approved by Adam as Gmail templates 1 (Android) and 2 (iPhone), 13 Nov 2026. No health details, ever.

const PRIVACY = "https://retunephysio.com.au/privacy/";
const SIGN_OFF = ["Thanks again,", "Adam", "Retune Physio", "hello@retunephysio.com.au"];

/** Tidy one form value: trim, single line, length-capped. Empty string if missing. */
export function clean(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
export function isEmail(value) {
  return EMAIL.test(value) && value.length <= 120;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

/**
 * The reply for one pilot form submission, or a reason to send nothing.
 * Sends nothing for other forms, a missing or odd email, a missing 18+ tick or an unknown phone.
 */
export function pilotReply(formName, data) {
  if (formName !== "pilot") return { skip: "not the pilot form" };
  const d = data ?? {};
  const email = clean(d.email, 120).toLowerCase();
  if (!isEmail(email)) return { skip: "no valid email" };
  if (clean(d.adult, 10) !== "yes") return { skip: "18+ not ticked" };
  const phone = clean(d.phone, 20);
  if (phone !== "Android" && phone !== "iPhone") return { skip: "unknown phone" };

  const name = clean(d["first-name"], 40) || "there";
  const play = clean(d["play-email"], 120).toLowerCase();
  const playLine = isEmail(play) ? ` (${play})` : "";

  const paras =
    phone === "Android"
      ? {
          subject: "Thanks for signing up to the Retune pilot",
          blocks: [
            [`Hi ${name},`],
            ["Thanks for signing up to try Retune. You're on the list."],
            ["Here's what the pilot involves, so you can decide if it's for you:"],
            [
              "- It runs for about 6 weeks and it's free.",
              "- Retune helps you keep up the exercises your physio gave you (or a habit like walking). You type in your plan, it reminds you on the days you pick, and you tick sessions off. It never changes what your physio prescribed.",
              "- All I ask is that you use it and tell me what's confusing, annoying or missing. Honest is more helpful than nice.",
              "- Twice during the pilot, the app asks four quick questions about how automatic your exercise feels. You choose whether those answers can be included in combined, de-identified results.",
            ],
            [
              `What happens next: I'll send you an invite in the next few weeks with a link to install Retune from Google Play. It will go to the Gmail address you gave on the form${playLine}, so please use that account on your phone.`,
            ],
            ["Joining is up to you. If you change your mind, just reply and I'll take you off the list."],
            [`How your details are handled: ${PRIVACY}`],
            SIGN_OFF,
          ],
        }
      : {
          subject: "Thanks for signing up to Retune",
          blocks: [
            [`Hi ${name},`],
            ["Thanks for signing up to try Retune."],
            ["This first pilot is on Android phones only, so I can't include you this time. I'll keep you on the list and let you know when there's an iPhone version."],
            ["If you have an Android phone you could use instead, reply with the Gmail address you use on it and I'll add you to this round."],
            ["If you'd rather come off the list, just reply and let me know."],
            [`How your details are handled: ${PRIVACY}`],
            SIGN_OFF,
          ],
        };

  const text = paras.blocks.map((b) => b.join("\n")).join("\n\n");
  const html =
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:22px;color:#2b2b2b">' +
    paras.blocks
      .map(
        (b) =>
          "<p>" +
          b
            .map((line) => escapeHtml(line).replace(escapeHtml(PRIVACY), `<a href="${PRIVACY}">${PRIVACY}</a>`))
            .join("<br>") +
          "</p>",
      )
      .join("") +
    "</div>";
  return { to: email, subject: paras.subject, text, html, template: phone === "Android" ? "android" : "iphone" };
}
