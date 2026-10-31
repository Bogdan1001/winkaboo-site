// Winkaboo's site, after the first paint. Everything here is an extra: without it every page reads the same, the
// phone shows a shot just caught, and the language menu is a plain list. Nothing is stored and nothing is sent.
//   the bar        a shadow once the page has scrolled
//   languages      the menu closes on Escape or a click elsewhere; a visitor whose browser prefers another of the
//                  site's languages is offered it, once per page view
//   the phone      on the first screen it plays three takes in a loop (pausable; still for reduced motion); further
//                  down, the step being read sets what the phone shows
//   the contents   on Terms and Privacy, the section being read is marked in the list beside it

const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
if (!reduced.matches) root.classList.add("is-motion");
reduced.addEventListener?.("change", () => root.classList.toggle("is-motion", !reduced.matches));

// ---------------------------------------------------------------- the bar
const bar = document.querySelector("[data-bar]");
if (bar) {
  const up = () => bar.classList.toggle("is-up", scrollY > 8);
  addEventListener("scroll", up, { passive: true });
  up();
}

// ---------------------------------------------------------------- languages
for (const menu of document.querySelectorAll("[data-langs]")) {
  document.addEventListener("click", (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.open) { menu.open = false; menu.querySelector("summary").focus(); }
  });
}

const offers = document.querySelector("template[data-suggest]");
if (offers) {
  const here = root.lang.toLowerCase();
  const links = [...offers.content.querySelectorAll("a[data-lang]")];
  const match = (want, code) => {
    const c = code.toLowerCase();
    return want === c || want.split("-")[0] === c.split("-")[0] && (c !== "zh-hans" || !/^zh-(hant|tw|hk|mo)/.test(want));
  };
  // the first of the reader's languages the site has: offered only if it is not this page's
  for (const want of (navigator.languages ?? [navigator.language]).map((l) => l.toLowerCase())) {
    if (match(want, here)) break;
    const link = links.find((a) => match(want, a.dataset.lang));
    if (!link) continue;
    const a = link.cloneNode(true);
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", offers.dataset.close);
    close.addEventListener("click", (e) => { e.preventDefault(); a.remove(); });
    a.append(close);
    setTimeout(() => document.body.append(a), 900);
    break;
  }
}

// ---------------------------------------------------------------- the phone
const screen = document.querySelector("[data-screen]");
if (screen) phone(screen);

function phone(screen) {
  const show = document.querySelector(".show");
  const stage = document.querySelector(".stage");
  const steps = [...document.querySelectorAll("[data-step]")];
  const toggle = document.querySelector("[data-toggle]");
  const shutterScore = screen.querySelector("[data-score]");
  const bigScore = screen.querySelector("[data-score-big]");
  const count = screen.querySelector("[data-count]");
  const caught = screen.querySelector("[data-caught]");
  const thumb = screen.querySelector(".thumb");
  const thumbImg = screen.querySelector("[data-thumb]");
  const printImg = screen.querySelector("[data-print]");
  const shutter = screen.querySelector(".shutter");

  // the pictures the phone shows later: the loop's other two takes once the page has loaded, the walk's (the viewer,
  // the reels, the selfie) once the walk comes near
  const wake = (sel) => screen.querySelectorAll(sel).forEach((img) => { img.loading = "eager"; });
  const loop = () => setTimeout(() => wake('.layer img[loading="lazy"], .winker, .toast img'), 300);
  if (document.readyState === "complete") loop();
  else addEventListener("load", loop, { once: true });
  const story = document.querySelector(".story");
  if (story) {
    const near = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      near.disconnect();
      wake('img[loading="lazy"]');
    }, { rootMargin: "0px 0px 300px 0px" });
    near.observe(story);
  }

  const SCORES = [88, 91, 86];
  let token = 0;        // bumping it cancels whatever sequence is running
  let n = 0;            // shots caught in this loop
  let paused = reduced.matches;
  let mode = "hero";    // or the name of the step being read
  let onScreen = true;
  let playing = false;  // the hero's loop is running

  const set = (s, { take, beat, score, prog } = {}) => {
    if (take !== undefined) screen.dataset.take = String(take);
    if (beat !== undefined) screen.dataset.beat = String(beat);
    if (score !== undefined) shutterScore.textContent = String(score);
    if (prog !== undefined) shutter.style.setProperty("--prog", String(prog));
    screen.dataset.s = s;
  };
  const counted = (k) => {
    n = k;
    count.textContent = String(k);
    caught.textContent = caught.dataset.caught.replace("{count}", String(k));
    thumb.classList.toggle("has", k > 0);
  };
  const layerImg = () => {
    const take = screen.dataset.s === "selfie" ? "selfie" : screen.dataset.take;
    return screen.querySelector(`.layer[data-take="${take}"] img`);
  };

  // the shot leaves the viewfinder and lands in the corner
  const fly = () => {
    const img = layerImg();
    const src = img.currentSrc || img.src;
    const done = () => { thumbImg.src = src; printImg.src = src; };
    if (!root.classList.contains("is-motion")) { done(); return; }
    const box = screen.getBoundingClientRect();
    const from = screen.querySelector(".vf").getBoundingClientRect();
    const to = thumb.getBoundingClientRect();
    const f = document.createElement("div");
    f.className = "fly";
    f.innerHTML = `<img src="${src}" alt="">`;
    const place = (r, radius) => Object.assign(f.style, { left: `${r.left - box.left}px`, top: `${r.top - box.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: radius });
    place(from, "0px");
    screen.append(f);
    requestAnimationFrame(() => requestAnimationFrame(() => place(to, "8px")));
    setTimeout(() => { done(); f.remove(); }, 680);
  };

  // a sequence: [state, options, how long it stays], each after the last, until something else starts
  const run = (seq, { loop = false, after } = {}) => {
    const mine = ++token;
    let i = 0;
    const next = () => {
      if (mine !== token) return;
      if (i >= seq.length) {
        if (after) after();
        if (loop) { i = 0; } else return;
      }
      const [s, opts = {}, ms = 0, fn] = seq[i++];
      set(s, opts);
      if (fn) fn();
      if (ms) setTimeout(next, ms);
      else next();
    };
    next();
  };
  const stop = () => { token++; playing = false; };

  const take = (k) => [
    ["tip", { take: k, beat: 0, score: 38 + k * 3, prog: 0.12 }, 1300],
    ["level", { score: 61, prog: 0.4 }, 1150],
    ["pose", { beat: 0, score: 70, prog: 0.56 }, 950],
    ["pose", { beat: 1, score: 78, prog: 0.72 }, 950],
    ["hold", { beat: 2, score: SCORES[k] - 2, prog: 1 }, 850],
    ["catch", { score: SCORES[k] }, 650, fly],
    ["caught", {}, 2300, () => { counted(k + 1); bigScore.textContent = String(SCORES[k]); }],
  ];
  const hero = () => {
    playing = true;
    counted(0);
    run([...take(0), ...take(1), ...take(2),
      ["caught", {}, 2600, () => screen.classList.add("is-reel-toast")],
      ["caught", {}, 0, () => screen.classList.remove("is-reel-toast")]], { after: () => { if (mode === "hero" && !paused && onScreen) setTimeout(hero, 400); } });
  };

  // what each step of the walk shows
  const STEP = {
    frame: () => run([["tip", { take: 0, beat: 0, score: 41, prog: 0.14 }, reduced.matches ? 0 : 900], ["level", { score: 62, prog: 0.42 }]]),
    pose: () => run([["pose", { take: 0, beat: 0, score: 70, prog: 0.56 }, 1300], ["pose", { beat: 1, score: 76, prog: 0.68 }, 1300], ["pose", { beat: 2, score: 82, prog: 0.8 }, 1500]], { loop: !reduced.matches }),
    moment: () => run([["hold", { take: 0, beat: 2, score: 86, prog: 1 }, reduced.matches ? 0 : 900], ["catch", { score: 88 }, reduced.matches ? 0 : 650, fly], ["caught", {}, 0, () => { counted(1); bigScore.textContent = "88"; }]]),
    best: () => { stop(); set("best"); },
    reel: () => { stop(); set("reel"); },
    selfie: () => run([["selfie", { beat: 0, prog: 0.4 }, 1200], ["selfie", { prog: 0.85 }]]),
  };

  const still = () => { stop(); screen.classList.remove("is-reel-toast"); set("caught", { take: 0, beat: 2, score: 88, prog: 1 }); counted(1); bigScore.textContent = "88"; thumbImg.src = printImg.src; };

  const enter = (next) => {
    if (next === mode) return;
    mode = next;
    show?.classList.toggle("in-story", mode !== "hero");
    show?.classList.toggle("is-live", mode !== "hero");
    steps.forEach((s) => s.classList.toggle("is-on", s.dataset.step === mode));
    screen.classList.remove("is-reel-toast");
    if (mode === "hero") { if (paused) still(); else hero(); }
    else { playing = false; STEP[mode](); }
  };

  // which step is being read: the last one whose top has passed the reading line (the middle of the window beside
  // the phone; on a phone, under the phone stuck at the top)
  const line = () => {
    const desk = matchMedia("(min-width: 960px)").matches;
    if (desk) return innerHeight * 0.55;
    const bottom = stage.getBoundingClientRect().bottom;
    return bottom + (innerHeight - bottom) * 0.45;
  };
  let ticking = false;
  const read = () => {
    ticking = false;
    const y = line();
    let current = "hero";
    for (const s of steps) if (s.getBoundingClientRect().top < y) current = s.dataset.step;
    enter(current);
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(read); } }, { passive: true });
  addEventListener("resize", () => requestAnimationFrame(read));

  // the loop rests while nobody can see it
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (mode !== "hero" || paused) return;
    if (!onScreen) stop(); else if (!playing) hero();
  }).observe(screen);
  document.addEventListener("visibilitychange", () => {
    if (mode !== "hero" || paused) return;
    if (document.hidden) stop(); else if (!playing) hero();
  });

  // pause and play: auto-playing movement longer than five seconds has to be stoppable (WCAG 2.2.2)
  if (toggle) {
    const label = toggle.querySelector("[data-toggle-label]");
    const paint = () => {
      toggle.toggleAttribute("data-paused", paused);
      label.textContent = paused ? toggle.dataset.play : toggle.dataset.pause;
    };
    toggle.hidden = false;
    paint();
    toggle.addEventListener("click", () => {
      paused = !paused;
      paint();
      if (mode !== "hero") return;
      if (paused) still(); else hero();
    });
  }

  mode = "";
  read();
}

// ---------------------------------------------------------------- the contents beside Terms and Privacy
const toc = document.querySelector(".toc");
if (toc && "IntersectionObserver" in window) {
  const links = new Map([...toc.querySelectorAll("a")].map((a) => [a.hash.slice(1), a]));
  const seen = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? seen.add(e.target.id) : seen.delete(e.target.id);
    const first = [...links.keys()].find((id) => seen.has(id));
    links.forEach((a, id) => a.classList.toggle("is-here", id === first));
  }, { rootMargin: "-80px 0px -55% 0px" });
  for (const id of links.keys()) { const s = document.getElementById(id); if (s) io.observe(s); }
}
