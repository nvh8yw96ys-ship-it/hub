// ============================================================================
//  Hub: one home page for Calendar, Fuel, Grade Ledger and reminders.
//  Fuel (/fuel/) and Grade Ledger (/grades/) run on this same site and each
//  publish a small summary to localStorage ("hub.fuel", "hub.grades"); the hub
//  only reads those. Nothing here is sent anywhere.
// ============================================================================
(() => {
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const pct = (v, g) => (g > 0 ? Math.max(0, Math.min(100, (v / g) * 100)) : 0);
const ago = (t) => { const m = Math.round((Date.now() - new Date(t)) / 6e4); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" }); };

// ---------- settings (this device only) ----------
const KEY = "hub.v1";
const S = Object.assign({ calView: "AGENDA", extraCals: "" }, read(KEY) || {});
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

// ---------- Google Calendar (shared calendars; colors match the Navy-and-ice scheme) ----------
const CALS = [
  ["29ea515c06a58f227ab03ffdd6c340eb2569994a113aa4b217183e0778b6c5a9@group.calendar.google.com", "#01579B"], // Courses
  ["67ab765bd97e27412f7750ddf384f2cb177136108feef8602f523c1e14c83507@group.calendar.google.com", "#202124"], // Exams & Deadlines
  ["2786d8607b70bd413305b877bde518b451215338239ea303babd9fc0d4a5c271@group.calendar.google.com", "#0288D1"], // Office Hours
  ["848f707d854f8e0c6f2f605f8edf186610bb71fa3fbb9ad155127058b4321d5c@group.calendar.google.com", "#3F51B5"], // Professional
  ["c005a92d7c461e827fb8c0313f844cc1ded96b939849795f1d7502cae04ece23@group.calendar.google.com", "#90CAF9"], // ACE
  ["bu0lk6irtbuk2bkoct485lskac@group.calendar.google.com", "#B0BEC5"],                                      // ACE Official Overview
  ["682e45f73a5289e6fe596504413aeffad65e1cc13738c34d789b415bc5ee9fdf@group.calendar.google.com", "#616161"], // Important Reminders
  ["27hmftl804akj8udsf8ee0niet7gutcs@import.calendar.google.com", "#78909C"],                               // Canvas
];
function calUrl() {
  const p = new URLSearchParams({ ctz: "America/Chicago", mode: S.calView, wkst: "1", bgcolor: "#ffffff", showTitle: "0", showPrint: "0", showTabs: "0", showCalendars: "0", showTz: "0", showNav: "1", showDate: "1" });
  const extra = S.extraCals.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean).map((id) => [id, "#5F6B7A"]);
  [...extra, ...CALS].forEach(([id, col]) => { p.append("src", id); p.append("color", col); });
  return "https://calendar.google.com/calendar/embed?" + p.toString();
}
function renderCal() {
  $$("#calView button").forEach((b) => b.classList.toggle("on", b.dataset.m === S.calView));
  const url = calUrl(), f = $("#calFrame");
  if (f.getAttribute("src") !== url) f.setAttribute("src", url);
}
$("#calView").addEventListener("click", (e) => { const b = e.target.closest("button[data-m]"); if (!b) return; S.calView = b.dataset.m; save(); renderCal(); });

// ---------- header ----------
const LAUNCH = [
  ["Calendar", "https://calendar.google.com/", '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', true],
  ["Tasks", "https://tasks.google.com/", '<path d="M5 12.5 9.5 17 19 7.5"/>', true],
  ["Fuel", "../fuel/", '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>'],
  ["Grades", "../grades/", '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M9 7.5h6M9 11h4"/>'],
  ["Canvas", "https://canvas.tamu.edu/", '<path d="M3 21h18M5 21V9.5L12 4l7 5.5V21M9.5 21v-5h5v5"/>', true],
];
$("#launch").innerHTML = LAUNCH.map(([l, h, ic, ext]) => `<a class="chip" href="${h}"${ext ? ' target="_blank" rel="noopener"' : ""}><svg class="i" viewBox="0 0 24 24">${ic}</svg>${l}</a>`).join("");
function tick() {
  const d = new Date(), h = d.getHours();
  $("#greet").textContent = h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  $("#date").textContent = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  $("#clock").textContent = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// ---------- Fuel card ----------
function renderFuel() {
  const f = read("hub.fuel"), el = $("#fuel");
  if (!f) { el.innerHTML = `<div class="empty"><p>No Fuel data on this device yet. Open Fuel once here and today's plan will show up.</p><a class="btn" href="../fuel/">Open Fuel</a></div>`; return; }
  const today = f.date === iso(new Date()), e = today ? f.eaten : [0, 0, 0], g = f.goals || {};
  const rows = [["Calories", e[0], g.kcal, "kcal"], ["Protein", e[1], g.protein, "g"], ["Carbs", e[2], g.carbs, "g"]];
  const w = f.weight || {}, wp = pct((w.latest ?? 0) - (w.start ?? 0), (w.goal ?? 0) - (w.start ?? 0));
  el.innerHTML = rows.map(([l, v, goal, u], i) => `<div class="metric"><div class="row"><span class="lbl">${l}</span><span class="val">${Math.round(v).toLocaleString()} <span>/ ${Number(goal || 0).toLocaleString()} ${u}</span></span></div><div class="bar${i ? " navy" : ""}"><i data-w="${pct(v, goal)}"></i></div></div>`).join("")
    + `<div class="stats">
        <div class="stat"><div class="k">Meals</div><div class="v">${today ? f.meals.done : 0}<small> / ${today ? f.meals.all : "—"}</small></div></div>
        <div class="stat"><div class="k">Creatine</div><div class="v">${today ? f.creatine.got : 0}<small> / ${today ? f.creatine.target : "—"}</small></div></div>
        <div class="stat"><div class="k">Weight</div><div class="v">${w.latest ?? "—"}<small> / ${w.goal ?? "—"} lb</small></div></div>
      </div>
      <div class="bar" style="margin-top:10px" title="${Math.round(wp)}% of the way to goal weight"><i data-w="${wp}"></i></div>`
    + (today && f.next ? `<div class="next"><svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>Next: <b>${esc(f.next.name)}</b> at ${esc(f.next.time)}</span></div>` : "")
    + `<div class="stamp">${esc(f.week || "")}${f.week ? " · " : ""}Updated ${ago(f.updated)}${today ? "" : " · nothing logged today yet"}</div>`;
}

// ---------- Grades card ----------
function renderGrades() {
  const g = read("hub.grades"), el = $("#grades");
  if (!g) { el.innerHTML = `<div class="empty"><p>No grades on this device yet. Open Grade Ledger here (or import your scores in its Settings) and they'll show up.</p><a class="btn" href="../grades/">Open Grade Ledger</a></div>`; return; }
  const n = (v, d = 1) => (v == null || !isFinite(v) ? null : (+v).toFixed(d));
  el.innerHTML = `<div class="gpa"><span class="n">${n(g.gpa, 2) ?? "—"}</span><span class="s">GPA so far${n(g.gpaProj, 2) ? ` · what-if ${n(g.gpaProj, 2)}` : ""}</span></div>`
    + g.courses.map((c) => `<a class="course" href="../grades/" title="${esc(c.name)}">
        <span class="code">${esc(c.code)}</span>
        <div class="bar${c.grade != null && c.grade >= 90 ? " navy" : ""}"><i data-w="${c.grade ?? 0}"></i></div>
        <span class="pct${c.grade == null ? " none" : ""}">${c.grade == null ? "—" : n(c.grade) + "%"}</span>
        <span class="lt ${c.grade == null ? "" : esc(c.letter)}">${c.grade == null ? "–" : esc(c.letter)}</span></a>`).join("")
    + `<div class="stamp">${esc(g.term)} · Updated ${ago(g.updated)}</div>`;
}

function hydrate() { requestAnimationFrame(() => setTimeout(() => $$("[data-w]").forEach((el) => (el.style.width = el.dataset.w + "%")), 30)); }
function renderCards() { renderFuel(); renderGrades(); hydrate(); }

// ---------- keep summaries fresh: quietly load the two apps so they re-publish ----------
let lastSync = 0;
function sync() {
  if (!location.protocol.startsWith("http")) return;
  lastSync = Date.now();
  [["#syncFuel", "../fuel/"], ["#syncGrades", "../grades/"]].forEach(([sel, url]) => {
    const f = $(sel); f.onload = () => setTimeout(renderCards, 150); f.src = url + "?hub=" + lastSync;
  });
}
window.addEventListener("storage", (e) => { if (e.key === "hub.fuel" || e.key === "hub.grades") renderCards(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "visible") return; tick(); renderCards(); if (Date.now() - lastSync > 5 * 60e3) sync(); });

// ---------- settings modal ----------
const modal = $("#modal");
$("#openSettings").addEventListener("click", () => { $("#extraCals").value = S.extraCals; modal.classList.add("on"); });
modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest("[data-close]")) modal.classList.remove("on"); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.classList.remove("on"); });
$("#saveSettings").addEventListener("click", () => { S.extraCals = $("#extraCals").value.trim(); save(); modal.classList.remove("on"); renderCal(); });

// ---------- start ----------
tick(); setInterval(tick, 15e3);
renderCal(); renderCards(); sync();
})();
