/* Lifelutions site + lead-capture chatbot
   The chatbot runs in two modes:
   1) DEMO MODE (default): a smart keyword responder — works instantly, no API key.
   2) LIVE MODE: set LLM_ENDPOINT below to your serverless function and it will
      call a real LLM (Claude/GPT). Falls back to demo mode automatically on error. */

const LLM_ENDPOINT = ""; // e.g. "/api/chat" once you deploy the serverless function

/* ---------- nav scroll ---------- */
const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 20));

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 3) * 0.08 + 's';
  io.observe(el);
});

/* ---------- chatbot ---------- */
const launcher = document.getElementById('chat-launcher');
const win = document.getElementById('chat-window');
const closeBtn = document.getElementById('chat-close');
const body = document.getElementById('chat-body');
const input = document.getElementById('chat-text');
const send = document.getElementById('chat-send');

let greeted = false;
launcher.addEventListener('click', () => {
  win.classList.toggle('open');
  if (win.classList.contains('open') && !greeted) {
    greeted = true;
    botSay("👋 Hey! I'm the Lifelutions assistant. I can tell you about our AI chatbots, websites, automations, pricing, and delivery times — or help you book a call. What's on your mind?", [
      "What do you build?", "How much does it cost?", "How fast?", "Book a call"
    ]);
  }
  if (win.classList.contains('open')) input.focus();
});
closeBtn.addEventListener('click', () => win.classList.remove('open'));

function addMsg(text, who) {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.innerHTML = text;
  body.appendChild(d);
  body.scrollTop = body.scrollHeight;
  return d;
}
function quickReplies(options) {
  if (!options || !options.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'chat-quick';
  options.forEach(o => {
    const b = document.createElement('button');
    b.textContent = o;
    b.onclick = () => { wrap.remove(); handleUser(o); };
    wrap.appendChild(b);
  });
  body.appendChild(wrap);
  body.scrollTop = body.scrollHeight;
}
function botSay(text, options) {
  const t = addMsg('<div class="typing"><span></span><span></span><span></span></div>', 'bot');
  setTimeout(() => {
    t.innerHTML = text;
    body.scrollTop = body.scrollHeight;
    quickReplies(options);
  }, 500 + Math.min(text.length * 8, 900));
}

/* DEMO-MODE brain: keyword intent matcher */
function demoReply(msg) {
  const m = msg.toLowerCase();
  const has = (...k) => k.some(w => m.includes(w));

  if (has('price', 'cost', 'how much', 'pricing', '$', 'budget'))
    return { text: "Everything is fixed-price, no surprises:<br>• <b>AI Chatbot</b> — from $497<br>• <b>Website in 48h</b> — from $697<br>• <b>Website + Chatbot bundle</b> — $997 (save ~$200)<br>• <b>Automation Sprint</b> — from $450<br>• <b>Quick-Win Audit</b> — $150 (credited toward any package)<br><br>Want me to set up a quick call to scope your project?", options: ["Book a call", "Tell me about chatbots", "What's the audit?"] };
  if (has('chatbot', 'chat bot', 'bot', 'ai assistant', 'support'))
    return { text: "The AI chatbot is trained on <i>your</i> business — your site, FAQs, and docs. It answers customer questions 24/7, captures leads, and can share booking links. Embeds on any site (WordPress, Shopify, Squarespace, custom). From $497, live in 2–3 days. This very chat is an example of what you'd get 😉", options: ["How much?", "Book a call", "What about websites?"] };
  if (has('website', 'site', 'web ', 'landing', 'web page'))
    return { text: "I build modern, fast, mobile-friendly websites in about <b>48 hours</b> — up to 5 pages, contact forms, maps, click-to-call, and basic SEO, with hosting set up for you. From $697, or bundle it with a chatbot for $997.", options: ["See a demo site", "How much?", "Book a call"] };
  if (has('automat', 'workflow', 'integrat', 'zapier', 'make', 'n8n', 'crm'))
    return { text: "Automation Sprints connect your tools and add AI in the middle — like lead → CRM → auto follow-up, invoicing & reminders, reporting dashboards, or inbox triage with AI drafting. From $450, delivered in 1–3 days.", options: ["How much?", "Book a call"] };
  if (has('how fast', 'how long', 'timeline', 'when', 'speed', 'deliver'))
    return { text: "Fast ⚡ — chatbots and automations usually ship in 2–3 days, websites in about 48 hours once I have your content. Rush options available if you're in a hurry.", options: ["Book a call", "How much?"] };
  if (has('audit', 'quick win', 'not sure', 'unsure', 'don\'t know'))
    return { text: "The $150 Quick-Win Audit is the easy way to start: a 45-min look at your workflow plus one same-day automation or chatbot prototype. If you upgrade to a bigger package, the $150 is fully credited. Low risk, real result.", options: ["Book a call", "See pricing"] };
  if (has('book', 'call', 'meeting', 'talk', 'schedule', 'contact', 'email', 'reach'))
    return { text: "Awesome — easiest is to drop your details in the form on this page, or email <a href='mailto:contact.lifelutions@gmail.com'>contact.lifelutions@gmail.com</a> and I'll reply within a few hours. What's the best email to reach you?", options: ["See pricing", "What do you build?"] };
  if (has('hi', 'hello', 'hey', 'yo ', 'sup'))
    return { text: "Hey! 👋 I can help with AI chatbots, websites, automations, pricing, or booking a call. What are you working on?", options: ["What do you build?", "How much?", "How fast?"] };
  if (has('who', 'you guys', 'about', 'experience', 'matthew'))
    return { text: "Lifelutions is a Toronto-based AI &amp; automation studio (that's Matthew 👋). I build AI agents, automations, and websites — bringing real engineering depth to small-business projects, with fixed prices and 2–3 day delivery.", options: ["What do you build?", "Book a call"] };

  return { text: "Great question! I can help with AI chatbots, websites, automations, pricing, delivery times, or booking a call. The best next step is usually a free 15-min call — want me to point you to the form?", options: ["Book a call", "See pricing", "What do you build?"] };
}

async function handleUser(text) {
  addMsg(text, 'user');
  // LIVE MODE: try real LLM, fall back to demo
  if (LLM_ENDPOINT) {
    const t = addMsg('<div class="typing"><span></span><span></span><span></span></div>', 'bot');
    try {
      const r = await fetch(LLM_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await r.json();
      t.innerHTML = data.reply || demoReply(text).text;
      body.scrollTop = body.scrollHeight;
      return;
    } catch (e) { t.remove(); }
  }
  const { text: reply, options } = demoReply(text);
  botSay(reply, options);
}

function submit() {
  const v = input.value.trim();
  if (!v) return;
  input.value = '';
  handleUser(v);
}
send.addEventListener('click', submit);
input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
