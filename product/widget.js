/*! Lifelutions Chat Widget v1.0
 * Embeddable AI assistant for small-business websites.
 * Usage on a client site (one tag):
 *   <script>window.LIFELUTIONS_CONFIG={ ...client config... }</script>
 *   <script src="https://YOURHOST/widget.js" defer></script>
 * Or load a hosted config:
 *   <script src="https://YOURHOST/widget.js" data-config="https://YOURHOST/configs/h2-nails.json" defer></script>
 *
 * Modes:
 *   - If config.endpoint is set -> calls the AI backend (worker.js) for real LLM replies.
 *   - Otherwise -> answers locally from config.kb (services, hours, location, FAQs, booking). Always free, no infra.
 *   - On backend error -> automatically falls back to local mode.
 */
(function () {
  "use strict";
  if (window.__lifelutionsChatLoaded) return;
  window.__lifelutionsChatLoaded = true;

  /* ---------- load config (inline global or data-config URL) ---------- */
  function boot(cfg) {
    if (!cfg || !cfg.name) { console.warn("[Lifelutions] missing config"); return; }
    cfg.brandColor = cfg.brandColor || "#7c5cff";
    cfg.accent = cfg.accent || "#19d3c5";
    cfg.greeting = cfg.greeting || ("Hi! 👋 I'm the " + cfg.name + " assistant. Ask me about services, prices, hours, or booking.");
    cfg.kb = cfg.kb || {};
    init(cfg);
  }
  var script = document.currentScript;
  var configUrl = script && script.getAttribute("data-config");
  if (window.LIFELUTIONS_CONFIG) {
    boot(window.LIFELUTIONS_CONFIG);
  } else if (configUrl) {
    fetch(configUrl).then(function (r) { return r.json(); }).then(boot).catch(function (e) { console.warn("[Lifelutions] config load failed", e); });
  } else {
    console.warn("[Lifelutions] no config found (set window.LIFELUTIONS_CONFIG or data-config).");
  }

  /* ---------- widget ---------- */
  function init(cfg) {
    var history = [];
    var openedOnce = false;

    var css = "\n#llf-btn{position:fixed;bottom:22px;right:22px;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg," + cfg.brandColor + "," + cfg.accent + ");display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2147483000;box-shadow:0 8px 28px rgba(0,0,0,.28);transition:transform .2s;border:none}\n#llf-btn:hover{transform:scale(1.08)}#llf-btn svg{width:28px;height:28px;fill:#fff}\n#llf-win{position:fixed;bottom:94px;right:22px;width:372px;max-width:calc(100vw - 28px);height:540px;max-height:calc(100vh - 130px);background:#fff;border-radius:18px;z-index:2147483000;display:none;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.32);font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}\n#llf-win.llf-open{display:flex;animation:llfpop .22s ease}@keyframes llfpop{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}\n.llf-head{background:linear-gradient(135deg," + cfg.brandColor + "," + cfg.accent + ");color:#fff;padding:15px 18px;display:flex;justify-content:space-between;align-items:center}\n.llf-head b{font-size:15px;display:block}.llf-head span{font-size:12px;opacity:.9}.llf-x{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1}\n.llf-body{flex:1;overflow-y:auto;padding:16px;background:#f7f8fb;display:flex;flex-direction:column;gap:10px}\n.llf-msg{max-width:84%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}\n.llf-bot{background:#fff;border:1px solid #e7e9f0;align-self:flex-start;border-bottom-left-radius:4px;color:#1c2230}\n.llf-user{background:" + cfg.brandColor + ";color:#fff;align-self:flex-end;border-bottom-right-radius:4px}\n.llf-msg a{color:" + cfg.brandColor + ";font-weight:600}\n.llf-q{display:flex;flex-wrap:wrap;gap:7px;margin-top:2px}\n.llf-q button{background:#fff;border:1px solid " + cfg.brandColor + ";color:" + cfg.brandColor + ";border-radius:999px;padding:7px 12px;font-size:12.5px;cursor:pointer}\n.llf-q button:hover{background:" + cfg.brandColor + ";color:#fff}\n.llf-in{display:flex;gap:8px;padding:12px;border-top:1px solid #eceef3;background:#fff}\n.llf-in input{flex:1;border:1px solid #d8dbe6;border-radius:999px;padding:10px 15px;font-size:14px;outline:none}\n.llf-in input:focus{border-color:" + cfg.brandColor + "}\n.llf-in button{background:linear-gradient(135deg," + cfg.brandColor + "," + cfg.accent + ");border:none;color:#fff;width:42px;border-radius:50%;cursor:pointer;font-size:16px;flex-shrink:0}\n.llf-typing{display:flex;gap:4px;padding:12px 14px}.llf-typing i{width:7px;height:7px;border-radius:50%;background:#b9bfce;display:inline-block;animation:llfb 1.2s infinite}.llf-typing i:nth-child(2){animation-delay:.2s}.llf-typing i:nth-child(3){animation-delay:.4s}@keyframes llfb{0%,60%,100%{opacity:.3}30%{opacity:1}}\n.llf-credit{text-align:center;font-size:10.5px;color:#aeb3c2;padding:6px}.llf-credit a{color:#aeb3c2;text-decoration:none}\n";
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

    var btn = document.createElement("button");
    btn.id = "llf-btn"; btn.setAttribute("aria-label", "Open chat");
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.3 1.1 4.4 2.9 5.9L4 21l4.3-2c1.1.3 2.4.5 3.7.5 5.5 0 10-3.8 10-8.5S17.5 3 12 3z"/></svg>';
    document.body.appendChild(btn);

    var win = document.createElement("div");
    win.id = "llf-win";
    win.innerHTML =
      '<div class="llf-head"><div><b>' + esc(cfg.name) + '</b><span>● Online — replies instantly</span></div><button class="llf-x" aria-label="Close">✕</button></div>' +
      '<div class="llf-body" id="llf-body"></div>' +
      '<div class="llf-in"><input id="llf-text" type="text" placeholder="Type your message..." autocomplete="off"/><button id="llf-send" aria-label="Send">➤</button></div>' +
      '<div class="llf-credit">⚡ AI assistant by <a href="https://redminto.github.io/lifelutions/" target="_blank" rel="noopener">Lifelutions</a></div>';
    document.body.appendChild(win);

    var body = win.querySelector("#llf-body");
    var input = win.querySelector("#llf-text");

    btn.onclick = function () {
      win.classList.toggle("llf-open");
      if (win.classList.contains("llf-open")) {
        input.focus();
        if (!openedOnce) { openedOnce = true; botSay(cfg.greeting, defaultChips()); }
      }
    };
    win.querySelector(".llf-x").onclick = function () { win.classList.remove("llf-open"); };
    win.querySelector("#llf-send").onclick = send;
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });

    function esc(s){return String(s).replace(/[&<>]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}
    function add(html, who) { var d = document.createElement("div"); d.className = "llf-msg " + who; d.innerHTML = html; body.appendChild(d); body.scrollTop = body.scrollHeight; return d; }
    function chips(opts) { if (!opts || !opts.length) return; var w = document.createElement("div"); w.className = "llf-q"; opts.forEach(function (o) { var b = document.createElement("button"); b.textContent = o; b.onclick = function () { w.remove(); handle(o); }; w.appendChild(b); }); body.appendChild(w); body.scrollTop = body.scrollHeight; }
    function botSay(html, opts) { var t = add('<div class="llf-typing"><i></i><i></i><i></i></div>', "llf-bot"); setTimeout(function () { t.innerHTML = html; body.scrollTop = body.scrollHeight; chips(opts); }, 450 + Math.min(html.length * 6, 800)); }
    function defaultChips(){ var c=[]; if((cfg.kb.services||[]).length) c.push("Services & prices"); if(cfg.kb.hours) c.push("Hours"); if(cfg.bookingUrl) c.push("Book an appointment"); c.push("Where are you?"); return c; }

    function send() { var v = input.value.trim(); if (!v) return; input.value = ""; handle(v); }

    function handle(text) {
      add(esc(text), "llf-user");
      history.push({ role: "user", content: text });
      if (cfg.endpoint) {
        var t = add('<div class="llf-typing"><i></i><i></i><i></i></div>', "llf-bot");
        fetch(cfg.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: cfg.clientId, message: text, history: history.slice(-10) }) })
          .then(function (r) { return r.json(); })
          .then(function (d) { var reply = (d && d.reply) ? d.reply : localReply(text).text; t.innerHTML = linkify(reply); history.push({ role: "assistant", content: reply }); body.scrollTop = body.scrollHeight; })
          .catch(function () { t.remove(); var r = localReply(text); botSay(linkify(r.text), r.chips); });
      } else {
        var r = localReply(text); history.push({ role: "assistant", content: r.text }); botSay(linkify(r.text), r.chips);
      }
    }

    function linkify(s){ return String(s).replace(/(https?:\/\/[^\s)]+)(?![^<]*>)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }

    /* ----- local knowledge-base responder (used when no endpoint / on error) ----- */
    function localReply(msg) {
      var m = msg.toLowerCase();
      var has = function () { for (var i = 0; i < arguments.length; i++) if (m.indexOf(arguments[i]) > -1) return true; return false; };
      var kb = cfg.kb;
      if (has("book", "appointment", "reserve", "schedule", "availability", "available")) {
        if (cfg.bookingUrl) return { text: "You can book here: " + cfg.bookingUrl + (cfg.phone ? "\nOr call us at " + cfg.phone + "." : ""), chips: ["Services & prices", "Hours"] };
        if (cfg.phone) return { text: "Give us a call to book: " + cfg.phone + ". Want our hours?", chips: ["Hours", "Services & prices"] };
      }
      if (has("price", "cost", "how much", "service", "menu", "rate") && (kb.services || []).length) {
        var lines = kb.services.map(function (s) { return "• " + s.name + (s.price ? " — " + s.price : "") + (s.desc ? " (" + s.desc + ")" : ""); }).join("\n");
        return { text: "Here's what we offer:\n" + lines + (cfg.bookingUrl ? "\n\nWant to book?" : ""), chips: cfg.bookingUrl ? ["Book an appointment", "Hours"] : ["Hours", "Where are you?"] };
      }
      if (has("hour", "open", "close", "today", "when") && kb.hours) return { text: "Our hours: " + kb.hours, chips: cfg.bookingUrl ? ["Book an appointment"] : ["Services & prices"] };
      if (has("where", "location", "address", "parking", "find you") && kb.location) return { text: "We're at " + kb.location + ".", chips: ["Hours", "Book an appointment"] };
      if (has("phone", "call", "contact", "number") && cfg.phone) return { text: "You can reach us at " + cfg.phone + ".", chips: ["Book an appointment", "Hours"] };
      var faqs = kb.faqs || [];
      for (var i = 0; i < faqs.length; i++) { var keys = faqs[i].q || []; for (var j = 0; j < keys.length; j++) if (m.indexOf(String(keys[j]).toLowerCase()) > -1) return { text: faqs[i].a, chips: defaultChips() }; }
      if (has("hi", "hello", "hey")) return { text: cfg.greeting, chips: defaultChips() };
      return { text: "Good question! I can help with services & prices, hours, location, or booking. For anything else" + (cfg.phone ? ", call us at " + cfg.phone : "") + " and we'll help you out.", chips: defaultChips() };
    }
  }
})();
