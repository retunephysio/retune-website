import { test } from "node:test";
import assert from "node:assert/strict";
import { pilotReply } from "./pilot-reply.mjs";

const base = { "first-name": "Sam", email: " Sam@Example.com ", phone: "Android", "play-email": "sam.p@gmail.com", adult: "yes" };

test("Android sign-up gets template 1 with the Play email", () => {
  const r = pilotReply("pilot", base);
  assert.equal(r.template, "android");
  assert.equal(r.to, "sam@example.com");
  assert.match(r.text, /^Hi Sam,/);
  assert.match(r.text, /\(sam\.p@gmail\.com\)/);
  assert.match(r.html, /<a href="https:\/\/retunephysio\.com\.au\/privacy\/">/);
});

test("iPhone sign-up gets template 2", () => {
  const r = pilotReply("pilot", { ...base, phone: "iPhone", "play-email": "" });
  assert.equal(r.template, "iphone");
  assert.match(r.text, /Android phones only/);
});

test("sends nothing when it shouldn't", () => {
  assert.ok(pilotReply("other", base).skip);
  assert.ok(pilotReply("pilot", { ...base, email: "not-an-email" }).skip);
  assert.ok(pilotReply("pilot", { ...base, adult: "" }).skip);
  assert.ok(pilotReply("pilot", { ...base, phone: "Nokia" }).skip);
  assert.ok(pilotReply("pilot", null).skip);
});

test("a name can't inject HTML or extra lines", () => {
  const r = pilotReply("pilot", { ...base, "first-name": "<b>Eve</b>\nBcc: x@y.z" });
  assert.doesNotMatch(r.html, /<b>Eve/);
  assert.match(r.html, /&lt;b&gt;Eve/);
  assert.doesNotMatch(r.text.split("\n")[0], /Bcc.*\n/);
  assert.equal(r.text.split("\n")[0], "Hi <b>Eve</b> Bcc: x@y.z,");
});

test("missing name says 'there'; odd Play email is left out", () => {
  const r = pilotReply("pilot", { ...base, "first-name": "  ", "play-email": "nope" });
  assert.match(r.text, /^Hi there,/);
  assert.match(r.text, /gave on the form, so/);
});
