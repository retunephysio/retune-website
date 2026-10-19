/* Retune motion layer: GSAP + ScrollTrigger.
 *
 * Rules this file follows:
 *  - Animate opacity and transform only (plus SVG stroke offsets), so everything composites on the GPU.
 *  - One feel: power2.out, 24 px of travel, small staggers. No bounce, no overshoot, no parallax.
 *  - The HTML and CSS already describe a complete page. This file only animates *towards* that page,
 *    hands each element back to CSS when done (.is-in + clearProps), and switches itself off on any error.
 *
 * Sections:
 *   1. Helpers
 *   2. Wordmark "retune" (the three bars slide level)
 *   3. Hero intro
 *   4. Phone demo (pinned and scrubbed on desktop, plays once on phones)
 *   5. Scroll reveals
 *   6. Timeline draws itself
 *   7. Six-week grid and counters
 *   8. Physio summary assembles
 *   9. Nav state, copy feedback, cue-builder text swap
 *  10. Wiring (gsap.matchMedia)
 */
(() => {
  'use strict';

  const root = document.documentElement;
  if (!root.classList.contains('motion')) return;                 // boot.js decided: no animation
  if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('motion'); return; }

  root.classList.add('motion-ready');
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power2.out', duration: 0.8 });
  ScrollTrigger.config({ ignoreMobileResize: true });             // phone address bar must not re-trigger layout

  /* ---------- 1. Helpers ---------- */
  const TRAVEL = 24;                                              // px every element moves, so all motion matches
  const DESKTOP_DEMO = '(prefers-reduced-motion: no-preference) and (min-width: 861px)';
  const PHONE_DEMO = '(prefers-reduced-motion: no-preference) and (max-width: 860px)';
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /** Hand elements back to plain CSS once their animation has finished. */
  const settle = (els) => {
    const list = gsap.utils.toArray(els);
    list.forEach((el) => el.classList.add('is-in'));
    gsap.set(list, { clearProps: 'transform,opacity,willChange' });
  };

  /**
   * Count a number up (or down) to the value already written in the element, keeping any prefix or suffix:
   * "100%", "24 sessions", "2.0". Starts from data-from, or 0. Always finishes on the exact original text.
   */
  const countTo = (el, { delay = 0, duration = 1.2, trigger, start = 'top 88%' } = {}) => {
    const finalText = el.textContent;
    const m = finalText.match(/^(\D*?)(\d+(?:\.\d+)?)([\s\S]*)$/);
    if (!m) return;
    const [, pre, num, post] = m;
    const decimals = (num.split('.')[1] || '').length;
    const from = el.dataset.from !== undefined ? parseFloat(el.dataset.from) : 0;
    const state = { v: from };
    gsap.to(state, {
      v: parseFloat(num), duration, delay, ease: 'power2.out',
      onStart: () => { el.textContent = pre + from.toFixed(decimals) + post; },
      onUpdate: () => { el.textContent = pre + state.v.toFixed(decimals) + post; },
      onComplete: () => { el.textContent = finalText; },
      onInterrupt: () => { el.textContent = finalText; },
      scrollTrigger: { trigger: trigger || el, start, once: true }
    });
  };

  /* ---------- 2. Wordmark: the three bars start out of line and slide level ---------- */
  const OFFSETS = [-38, 30, -18];                                 // % of bar width; about 4-5 px at header size
  const retune = (wordmark, vars = {}) => {
    const bars = $$('.bars i', wordmark);
    if (bars.length !== 3) return;
    gsap.from(bars, {
      xPercent: (i) => OFFSETS[i], opacity: 0.35,
      duration: 1.3, stagger: 0.1, ease: 'power2.out', clearProps: 'transform,opacity', ...vars
    });
  };

  /* ---------- 3. Hero intro ---------- */
  const heroIntro = () => {
    const copy = $$('.hero-copy > *');
    const phone = $('.hero .phone');
    const dots = $$('.hero .dot');
    const tick = $('.hero .pcard.done .circ path');
    const settled = copy.concat(phone ? [phone] : []);
    gsap.set(settled, { y: TRAVEL });

    const tl = gsap.timeline({
      onComplete: () => {
        settle(settled);
        gsap.set(dots, { clearProps: 'transform,opacity' });
        if (tick) gsap.set(tick, { clearProps: 'strokeDasharray,strokeDashoffset' });
      }
    });
    tl.to(copy, { opacity: 1, y: 0, duration: 0.8, stagger: 0.09 }, 0);
    if (phone) tl.to(phone, { opacity: 1, y: 0, duration: 1 }, 0.2);
    if (dots.length) tl.from(dots, { scale: 0.6, opacity: 0, duration: 0.5, stagger: 0.05 }, 0.7);
    if (tick && tick.getTotalLength) {
      const len = tick.getTotalLength();
      gsap.set(tick, { strokeDasharray: len, strokeDashoffset: len });
      tl.to(tick, { strokeDashoffset: 0, duration: 0.45 }, 1.1);
    }
  };

  /* ---------- 4. Phone demo: "short version" tapped, it still counts, the week fills in ---------- */
  const buildDemo = (vars) => {
    const card = $('#demo-card');
    if (!card) return () => {};
    const shortBtn = $('.acts .s', card);
    const acts = $('.acts', card);
    const doneNote = $('.acts-done', card);
    const fill = $('.circ-fill', card);
    const svg = $('.circ svg', card);
    const tick = $('.circ path', card);
    const dotFill = $('.hero .dot-fill');
    const msgA = $('.hero .wk-a');
    const msgB = $('.hero .wk-b');
    const len = tick.getTotalLength();

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' }, ...vars });
    tl.to(shortBtn, { scale: 0.95, duration: 0.25 })
      .to(shortBtn, { scale: 1, duration: 0.3 })
      .to(acts, { autoAlpha: 0, y: -6, duration: 0.4 }, '>-0.05')
      .fromTo(doneNote, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45 }, '<0.1')
      .to(fill, { scale: 1, duration: 0.4 }, '<')
      .set(svg, { opacity: 1 }, '<0.15')
      .fromTo(tick, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.4 }, '<')
      .to(dotFill, { scale: 1, duration: 0.45 }, '+=0.15')
      .to(msgA, { autoAlpha: 0, y: -6, duration: 0.35 }, '+=0.05')
      .fromTo(msgB, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.4 }, '<0.1')
      .to({}, { duration: 0.4 });                                  // a short hold at the end of the pin

    /* Colour changes go through classes, so they follow light/dark mode instead of baking in a colour. */
    const sync = () => {
      const p = tl.progress();
      shortBtn.classList.toggle('is-pressed', p > 0.02 && p < 0.3);
      card.classList.toggle('demo-done', p > 0.32);
      const swapped = p > 0.8;
      msgA.setAttribute('aria-hidden', String(swapped));
      msgB.setAttribute('aria-hidden', String(!swapped));
    };
    tl.eventCallback('onUpdate', sync);

    return () => {                                                 // undo class changes when matchMedia reverts
      shortBtn.classList.remove('is-pressed');
      card.classList.remove('demo-done');
      msgA.removeAttribute('aria-hidden');
      msgB.setAttribute('aria-hidden', 'true');
    };
  };

  const playDemoOnce = () => {
    /* If the card is already on screen at load, wait for the hero intro to finish first. */
    const card = $('#demo-card');
    const onScreenAtLoad = card && card.getBoundingClientRect().top < window.innerHeight * 0.75;
    return buildDemo({
      delay: onScreenAtLoad ? 1.6 : 0.3,
      scrollTrigger: { trigger: '#demo-card', start: 'top 75%', once: true }
    });
  };

  const pinnedDemo = () => {
    const hero = $('.hero');
    const header = $('header.top');
    const headH = header ? header.offsetHeight : 0;
    /* Only pin when the whole hero fits on screen; otherwise pinning would hide part of it. */
    if (!hero || hero.offsetHeight + headH > window.innerHeight) return playDemoOnce();
    return buildDemo({
      scrollTrigger: {
        trigger: hero,
        start: () => `top top+=${headH}`,
        end: '+=700',
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
  };

  /* ---------- 5. Scroll reveals ---------- */
  const scrollReveals = () => {
    const targets = gsap.utils.toArray('[data-reveal], [data-stagger] > *');
    gsap.set(targets, { y: TRAVEL });
    ScrollTrigger.batch(targets, {
      start: 'top 88%',
      once: true,
      interval: 0.1,
      batchMax: 6,
      onEnter: (batch) => gsap.to(batch, {
        opacity: 1, y: 0, duration: 0.8, stagger: 0.08, onComplete: () => settle(batch)
      })
    });

    const proofItems = $$('.proof li');
    if (proofItems.length) {
      gsap.from(proofItems, {
        opacity: 0, y: 12, duration: 0.6, stagger: 0.12, delay: 0.25, clearProps: 'transform,opacity',
        scrollTrigger: { trigger: '.proof', start: 'top 82%', once: true }
      });
    }
  };

  /* ---------- 6. Timeline: the line draws down the page; each stage's dot pops in as it arrives ---------- */
  const timelineDraw = () => {
    const tl = $('.timeline');
    if (!tl) return;
    const fill = $('.tl-fill', tl);
    const items = $$(':scope > div', tl);
    const drop = $('.drop', tl);
    const back = $('.re', tl);

    /* Colour stops sit on the dots: sage in the clinic, terracotta for the gap, deep sage with Retune. */
    const DOT_CENTRE = 23;                                         // 17 px dot offset + half of the 12 px dot
    const setStops = () => {
      if (drop) tl.style.setProperty('--p1', `${drop.offsetTop + DOT_CENTRE}px`);
      if (back) tl.style.setProperty('--p2', `${back.offsetTop + DOT_CENTRE}px`);
    };
    setStops();
    ScrollTrigger.addEventListener('refreshInit', setStops);

    if (fill) {
      gsap.to(fill, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: tl, start: 'top 75%', end: 'bottom 60%', scrub: 0.6 }
      });
    }
    items.forEach((item) => {
      gsap.fromTo(item, { opacity: 0, y: 16 }, {
        opacity: 1, y: 0, duration: 0.7,
        onStart: () => item.classList.add('dot-in'),
        onComplete: () => settle(item),
        scrollTrigger: { trigger: item, start: 'top 72%', once: true }
      });
    });
    return () => ScrollTrigger.removeEventListener('refreshInit', setStops);
  };

  /* ---------- 7. Six-week grid and Progress counters ---------- */
  const evidence = () => {
    const weeks = $('.weeks');
    if (weeks) {
      const done = $$('.wk .c.on', weeks);
      const missed = $$('.wk .c.miss', weeks);
      const note = $('.weeks-note', weeks);
      const tl = gsap.timeline({ scrollTrigger: { trigger: weeks, start: 'top 85%', once: true } });
      tl.from(done, { scale: 0, duration: 0.35, stagger: 0.035, clearProps: 'transform' })
        .from(missed, { scale: 0, opacity: 0, duration: 0.45, clearProps: 'transform,opacity' }, '>-0.1')
        .from(note, { opacity: 0, y: 8, duration: 0.5, clearProps: 'transform,opacity' }, '<');
    }
    $$('.proof [data-count]').forEach((el) => countTo(el, { trigger: '.proof', start: 'top 82%', delay: 0.4 }));
  };

  /* ---------- 8. Physio summary: lines arrive in order, bars rise, numbers count ---------- */
  const summaryAssemble = () => {
    const card = $('.summary');
    if (!card) return;
    const st = { trigger: card, start: 'top 85%', once: true };
    gsap.from($$(':scope > *', card), {
      opacity: 0, y: 10, duration: 0.6, stagger: 0.09, delay: 0.2, clearProps: 'transform,opacity', scrollTrigger: st
    });
    const bars = $$('.sess .bars i', card);
    if (bars.length) {
      gsap.from(bars, {
        scaleY: 0, transformOrigin: '50% 100%', duration: 0.7, stagger: 0.08, delay: 0.6,
        clearProps: 'transform,transformOrigin', scrollTrigger: { ...st }
      });
    }
    $$('[data-count]', card).forEach((el) => countTo(el, { trigger: card, start: 'top 85%', delay: 0.55 }));
  };

  /* ---------- 9. Small things ---------- */
  const navState = () => {
    ['#how', '#physios'].forEach((id) => {
      const link = $(`header.top nav a[href="${id}"]`);
      const section = $(id);
      if (!link || !section) return;
      ScrollTrigger.create({
        trigger: section, start: 'top 55%', end: 'bottom 55%',
        toggleClass: { targets: link, className: 'is-active' }
      });
    });
  };

  const copyFeedback = () => {
    const out = document.getElementById('copied');
    if (!out || !window.MutationObserver) return () => {};
    const mo = new MutationObserver(() => {
      if (!out.textContent) return;
      gsap.killTweensOf(out);
      gsap.set(out, { clearProps: 'transform,opacity' });
      gsap.from(out, { opacity: 0, y: 6, duration: 0.35, clearProps: 'transform,opacity' });
    });
    mo.observe(out, { childList: true, characterData: true, subtree: true });
    return () => mo.disconnect();
  };

  /** Used by main.js for the cue builder: the old words ease out, the new ones ease in. */
  const swapText = (el, text) => {
    gsap.killTweensOf(el);
    gsap.timeline()
      .to(el, { opacity: 0, y: -6, duration: 0.16, ease: 'power1.in' })
      .add(() => { el.textContent = text; })
      .fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, clearProps: 'transform,opacity' });
  };

  /* ---------- 10. Wiring ---------- */
  const mm = gsap.matchMedia();
  const fail = (err) => {
    if (window.console) console.error('Retune motion disabled:', err);   // never leave content hidden
    root.classList.remove('motion');
    delete window.RetuneMotion;
    mm.revert();
  };
  const guarded = (fn) => () => {
    try { return fn(); } catch (err) { fail(err); return undefined; }
  };

  /* The pinned hero must be created before the triggers below it, so their positions include the pin spacing. */
  mm.add(DESKTOP_DEMO, guarded(pinnedDemo));
  mm.add(PHONE_DEMO, guarded(playDemoOnce));

  mm.add('(prefers-reduced-motion: no-preference)', guarded(() => {
    const header = $('header.top .wordmark[data-retune]');
    if (header) retune(header, { delay: 0.35 });
    const footer = $('footer .wordmark[data-retune]');
    if (footer) retune(footer, { scrollTrigger: { trigger: footer, start: 'top 95%', once: true } });

    heroIntro();
    scrollReveals();
    const stopTimeline = timelineDraw();
    evidence();
    summaryAssemble();
    navState();
    const stopCopy = copyFeedback();
    window.RetuneMotion = { swapText };

    ScrollTrigger.sort();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());

    return () => {                                                 // reduced motion switched on mid-visit
      stopCopy();
      if (stopTimeline) stopTimeline();
      delete window.RetuneMotion;
      root.classList.remove('motion');
    };
  }));
})();
