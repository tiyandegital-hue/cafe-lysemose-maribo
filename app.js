/* Café Lysemose — site logic.
   Business details live in ONE swappable constant (SITE) below.
   The same name / address / phone / email strings appear in the HTML
   of every page; change them here first, then mirror in the HTML. */
const SITE = {
  name: "Café Lysemose",
  address: "Vestre Landevej 16, 4930 Maribo",
  phone: "+45 54 78 02 14",
  email: "heidi@cafelysemose.dk",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Vestre+Landevej+16%2C+4930+Maribo%2C+Denmark"
};

document.addEventListener("DOMContentLoaded", () => {
  /* Mobile nav */
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => links.classList.remove("open")));
  }

  /* Fade-rise on scroll (rest state is visible if JS/IO fails: .reveal only hides via JS-added class) */
  document.querySelectorAll(".reveal").forEach(el => el.classList.add("pre"));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  initForms();
  initChat();
});

/* ---------- Forms: validate + real success state ---------- */
function initForms() {
  document.querySelectorAll("form[data-validate]").forEach(form => {
    form.addEventListener("submit", ev => {
      ev.preventDefault();
      let valid = true;
      form.querySelectorAll("input, select, textarea").forEach(input => {
        const field = input.closest(".field");
        if (!field) return;
        field.classList.remove("invalid");
        const val = (input.value || "").trim();
        let ok = true;
        if (input.hasAttribute("data-required")) ok = val.length > 0;
        if (ok && val && input.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);
        if (ok && val && input.dataset.format === "date-dk") ok = isValidDkDate(val);
        if (!ok) { field.classList.add("invalid"); valid = false; }
      });
      if (!valid) {
        const firstBad = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
        if (firstBad) firstBad.focus();
        return;
      }
      const success = form.parentElement.querySelector(".form-success") || document.getElementById(form.dataset.success);
      form.style.display = "none";
      if (success) { success.classList.add("show"); success.setAttribute("tabindex", "-1"); success.focus(); }
    });
    /* Clear the error as soon as the visitor fixes the field */
    form.querySelectorAll("input, select, textarea").forEach(input => {
      input.addEventListener("input", () => input.closest(".field")?.classList.remove("invalid"));
      input.addEventListener("change", () => input.closest(".field")?.classList.remove("invalid"));
    });
  });
}
function isValidDkDate(v) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return false;
  const d = +m[1], mo = +m[2], y = +m[3];
  if (y < 2026 || y > 2035 || mo < 1 || mo > 12 || d < 1) return false;
  return d <= new Date(y, mo, 0).getDate();
}

/* ---------- Booking-assistent chat (demo, front-end only) ---------- */
function initChat() {
  const chat = document.getElementById("chat-log");
  if (!chat) return;
  const restartBtn = document.getElementById("chat-restart");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let busy = false;
  let state = {};

  function scrollDown() { chat.scrollTop = chat.scrollHeight; }
  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function addMsg(text, who, extraCls) {
    const m = el("div", "msg " + who + (extraCls ? " " + extraCls : ""));
    m.textContent = text;
    chat.appendChild(m); scrollDown();
    return m;
  }
  function addConfirm(title, body, meta) {
    const m = el("div", "msg assistant confirm");
    const b = el("b", null, title); m.appendChild(b);
    m.appendChild(document.createTextNode(body));
    if (meta) { const d = el("div", "order-meta", meta); m.appendChild(d); }
    chat.appendChild(m); scrollDown();
  }
  async function typing() {
    const t = el("div", "typing");
    t.innerHTML = "<i></i><i></i><i></i>";
    chat.appendChild(t); scrollDown();
    await sleep(750);
    t.remove();
  }
  async function assistant(text) {
    await typing();
    addMsg(text, "assistant");
    await sleep(250);
  }
  function chips(list) {
    /* list: [{label, primary?, onPick}] — one click, then chips lock */
    const row = el("div", "chips");
    list.forEach(c => {
      const b = el("button", "chip" + (c.primary ? " primary" : ""), "");
      b.type = "button"; b.textContent = c.label;
      b.addEventListener("click", async () => {
        if (busy) return;
        busy = true;
        row.querySelectorAll(".chip").forEach(x => { x.disabled = true; x.style.opacity = ".55"; });
        addMsg(c.label, "guest");
        await sleep(300);
        busy = false;
        await c.onPick();
      });
      row.appendChild(b);
    });
    chat.appendChild(row); scrollDown();
  }
  function startChoices() {
    chips([
      { label: "Book bord i caféen", primary: true, onPick: bordDate },
      { label: "Book selskab", primary: true, onPick: selskabDate },
      { label: "Se åbningstider", onPick: showHours }
    ]);
  }
  function dateChips(onPick) {
    chips([
      { label: "Lørdag 14. juni", primary: true, onPick: () => onPick("Lørdag 14. juni") },
      { label: "Lørdag 21. juni", onPick: () => onPick("Lørdag 21. juni") },
      { label: "En anden dag", onPick: otherDay }
    ]);
  }
  async function otherDay() {
    await assistant("Skriv til Heidi på " + SITE.email + " eller ring " + SITE.phone + " med jeres ønskede dato — så finder vi en tid, der passer.");
    startChoices();
  }
  /* --- Bord flow --- */
  async function bordDate() {
    state = { type: "bord" };
    await assistant("Dejligt! Hvilken dag tænker I på?");
    dateChips(bordTime);
  }
  async function bordTime(date) {
    state.date = date;
    await assistant("Hvilket tidspunkt passer jer?");
    chips([
      { label: "Kl. 12.00", primary: true, onPick: () => bordGuests("Kl. 12.00") },
      { label: "Kl. 13.00", onPick: () => bordGuests("Kl. 13.00") },
      { label: "Kl. 14.00", onPick: () => bordGuests("Kl. 14.00") }
    ]);
  }
  async function bordGuests(time) {
    state.time = time;
    await assistant("Hvor mange bliver I?");
    chips([
      { label: "2 gæster", primary: true, onPick: () => bordConfirm("2 gæster") },
      { label: "4 gæster", onPick: () => bordConfirm("4 gæster") },
      { label: "6 gæster", onPick: () => bordConfirm("6 gæster") },
      { label: "Flere end 6", onPick: () => bordConfirm("flere end 6 gæster") }
    ]);
  }
  async function bordConfirm(guests) {
    await assistant("Skal jeg sende en bekræftelse og en påmindelse dagen før?");
    chips([
      { label: "Ja, tak", primary: true, onPick: () => bordDone(guests, true) },
      { label: "Kun bekræftelse", onPick: () => bordDone(guests, false) }
    ]);
  }
  async function bordDone(guests, reminder) {
    await typing();
    addConfirm(
      "Så er I booket! ✅",
      "Bord til " + guests + " den " + state.date + " kl. " + state.time.replace("Kl. ", "") +
      " er reserveret. Bekræftelse er sendt til din mail" + (reminder ? ", og jeg minder dig dagen før" : "") +
      ". Vi glæder os til at se jer i Lysemose.",
      "Bord i caféen · " + state.date + " · " + state.time
    );
    await sleep(400);
    chips([{ label: "Book et selskab i stedet", onPick: selskabDate }, { label: "Se åbningstider", onPick: showHours }]);
  }
  /* --- Selskab flow --- */
  async function selskabDate() {
    state = { type: "selskab" };
    await assistant("Dejligt! Hvilken dato tænker I på?");
    dateChips(selskabGuests);
  }
  async function selskabGuests(date) {
    state.date = date;
    await assistant("Hvor mange gæster bliver I?");
    chips([
      { label: "20 gæster", onPick: () => selskabOffer("20 gæster") },
      { label: "40 gæster", onPick: () => selskabOffer("40 gæster") },
      { label: "60 gæster", primary: true, onPick: () => selskabOffer("60 gæster") },
      { label: "80 gæster", onPick: () => selskabOffer("80 gæster") }
    ]);
  }
  async function selskabOffer(guests) {
    state.guests = guests;
    await assistant("Perfekt — Store Sal er ledig den dag! Skal jeg sende en bekræftelse og en påmindelse dagen før?");
    chips([
      { label: "Ja, tak", primary: true, onPick: () => selskabDone(true) },
      { label: "Kun bekræftelse", onPick: () => selskabDone(false) }
    ]);
  }
  async function selskabDone(reminder) {
    await typing();
    addConfirm(
      "Så er I booket! ✅",
      "Store Sal den " + state.date + " til " + state.guests +
      " er reserveret. Bekræftelse er sendt til din mail" + (reminder ? ", og jeg minder dig dagen før" : "") +
      ". Vi glæder os til at se jer i Lysemose.",
      "Selskab i Store Sal · " + state.date + " · " + state.guests
    );
    await sleep(400);
    chips([{ label: "Book bord i caféen", onPick: bordDate }, { label: "Se åbningstider", onPick: showHours }]);
  }
  /* --- Åbningstider flow --- */
  async function showHours() {
    await assistant("Caféen holder primært åbent i sommersæsonen samt udvalgte weekender og højtider resten af året. Åbningstider: sommer — se opslag ved døren, eller spørg Heidi på " + SITE.email + ".");
    await sleep(200);
    chips([
      { label: "Book bord i caféen", primary: true, onPick: bordDate },
      { label: "Book selskab", primary: true, onPick: selskabDate }
    ]);
  }
  /* --- Boot / restart --- */
  async function boot() {
    chat.innerHTML = "";
    state = {};
    busy = false;
    await assistant("Hej! Jeg er Lysemoses booking-assistent. Skal jeg hjælpe dig med at booke bord eller selskab?");
    startChoices();
  }
  if (restartBtn) restartBtn.addEventListener("click", () => { if (!busy) boot(); });
  boot();
}
