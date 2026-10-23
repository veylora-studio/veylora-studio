const $ = (s) => document.querySelector(s);
const year = $("#year");
year.textContent = new Date().getFullYear();

const menuToggle = $("#menuToggle");
const mainNav = $("#mainNav");
menuToggle.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});
mainNav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));

async function postJSON(path, data) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}

$("#leadForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const status = $("#leadStatus");
  button.disabled = true;
  button.textContent = "Sending…";
  status.textContent = "";
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    await postJSON("/api/leads", data);
    status.textContent = "Thanks — your enquiry has been received.";
    form.reset();
  } catch (err) {
    status.textContent = err.message.includes("Failed to fetch")
      ? "The form backend isn't connected in this preview. Run the website using the included server instructions to enable submissions."
      : err.message;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Send project enquiry <span>↗</span>';
  }
});

const launcher = $("#chatLauncher");
const panel = $("#chatPanel");
function setChatOpen(open) {
  panel.hidden = !open;
  launcher.setAttribute("aria-expanded", String(open));
  if (open) $("#chatInput").focus();
}
launcher.addEventListener("click", () => setChatOpen(panel.hidden));
$("#chatClose").addEventListener("click", () => setChatOpen(false));

const messages = $("#chatMessages");
const chatForm = $("#chatForm");
const chatInput = $("#chatInput");
const chatMode = $("#chatMode");
let history = [];
let leadDraft = {};
let awaitingLead = "";
let awaitingBooking = false;
let bookingDraft = {};

function addMessage(text, who = "assistant") {
  const node = document.createElement("div");
  node.className = `message ${who}`;
  node.textContent = text;
  messages.appendChild(node);
  messages.scrollTop = messages.scrollHeight;
  return node;
}
function removeQuickReplies() {
  messages.querySelector(".quick-replies")?.remove();
}
function addQuickReplies(items) {
  removeQuickReplies();
  const wrap = document.createElement("div");
  wrap.className = "quick-replies";
  items.forEach(item => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = item.label;
    b.addEventListener("click", () => sendUserMessage(item.prompt));
    wrap.appendChild(b);
  });
  messages.appendChild(wrap);
}
function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

function startLeadCapture() {
  leadDraft = {};
  awaitingLead = "name";
  addMessage("Great — let's start with a few details. What's your name?");
}
function startBooking() {
  bookingDraft = {};
  awaitingBooking = true;
  addMessage("Let's request a consultation. What name should we put on the request?");
}
async function saveLead(data) {
  return postJSON("/api/leads", data);
}
async function handleLeadAnswer(text) {
  if (awaitingLead === "name") {
    leadDraft.name = text.slice(0, 100); awaitingLead = "email";
    addMessage("Thanks! What's the best email address to reach you?");
  } else if (awaitingLead === "email") {
    if (!isEmail(text)) { addMessage("That email doesn't look quite right. Please enter an address like name@example.com."); return; }
    leadDraft.email = text; awaitingLead = "service";
    addMessage("Which service are you interested in: 2D web design, 3D web experience, AI automation, or a combination?");
  } else if (awaitingLead === "service") {
    leadDraft.service = text.slice(0, 180); awaitingLead = "message";
    addMessage("Anything else we should know about your project? Type a short brief, or say “skip”.");
  } else {
    leadDraft.message = /^skip$/i.test(text) ? "" : text.slice(0, 1200);
    awaitingLead = "";
    try {
      await saveLead(leadDraft);
      addMessage("Your project enquiry has been sent. The Veylora team can follow up using the email you provided.");
    } catch (e) {
      addMessage(e.message.includes("Failed to fetch")
        ? "Your details are collected in this demo flow, but the submission backend isn't connected here. Run the included server to save enquiries."
        : `I couldn't submit that just now: ${e.message}`);
    }
    addQuickReplies([{label:"Request a consultation",prompt:"I want to request a consultation."},{label:"Ask a question",prompt:"What services do you offer?"}]);
  }
}
async function handleBookingAnswer(text) {
  if (!bookingDraft.name) {
    bookingDraft.name = text.slice(0, 100);
    addMessage("What's your email address?");
  } else if (!bookingDraft.email) {
    if (!isEmail(text)) { addMessage("Please enter a valid email address."); return; }
    bookingDraft.email = text;
    addMessage("What date would you prefer? Please use YYYY-MM-DD, for example 2026-11-05.");
  } else if (!bookingDraft.date) {
    const date = new Date(`${text}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(date.getTime())) { addMessage("Please use YYYY-MM-DD, for example 2026-11-05."); return; }
    bookingDraft.date = text;
    addMessage("What time suits you best: morning, afternoon, or evening?");
  } else if (!bookingDraft.time) {
    bookingDraft.time = text.slice(0, 80);
    addMessage("What would you like to discuss? You can type a short note or “skip”.");
  } else {
    bookingDraft.notes = /^skip$/i.test(text) ? "" : text.slice(0, 1200);
    awaitingBooking = false;
    try {
      await postJSON("/api/appointments", bookingDraft);
      addMessage("Your appointment request has been submitted. This is a request, not a confirmed calendar booking; the team will contact you to confirm availability.");
    } catch (e) {
      addMessage(e.message.includes("Failed to fetch")
        ? "I've collected the request in this demo, but appointment submissions need the included backend running. No calendar slot has been reserved."
        : `I couldn't submit that just now: ${e.message}`);
    }
    addQuickReplies([{label:"Start a project",prompt:"I want to start a project."},{label:"Services",prompt:"What services do you offer?"}]);
  }
}
function demoReply(text) {
  const t = text.toLowerCase();
  if (t.includes("service") || t.includes("offer") || t.includes("what do you do")) {
    addMessage("We focus on three areas:\n\n• 2D web design — landing pages, business websites, and UI/UX.\n• 3D web experiences — purposeful interactive product and brand experiences.\n• AI automation — customer support, lead qualification, workflow integrations, and appointment requests.\n\nWant to tell me which one fits your goals?");
    addQuickReplies([{label:"2D / 3D website",prompt:"I'm interested in a website."},{label:"AI automation",prompt:"I'm interested in AI automation."},{label:"Both",prompt:"I want a website and AI automation."}]);
  } else if (t.includes("project") || t.includes("website") || t.includes("interested") || t.includes("start")) {
    addMessage("Let's get a few details so the team can understand what you need.");
    startLeadCapture();
  } else if (t.includes("consult") || t.includes("appointment") || t.includes("book") || t.includes("meeting")) {
    startBooking();
  } else if (t.includes("price") || t.includes("cost") || t.includes("budget")) {
    addMessage("Project pricing depends on scope, features, integrations, and timeline. Share a short brief and your preferred service, and the team can discuss a suitable quote.");
    addQuickReplies([{label:"Share project details",prompt:"I want to start a project."},{label:"Request a consultation",prompt:"I want to request a consultation."}]);
  } else if (t.includes("human") || t.includes("person") || t.includes("team") || t.includes("contact")) {
    addMessage("I can pass a project enquiry to the Veylora team. Start with your name and email, and tell us what you need.");
    startLeadCapture();
  } else {
    addMessage("I can help with our web design services, AI automation, project enquiries, and consultation requests. Try asking “What services do you offer?” or tell me what you'd like to build.");
    addQuickReplies([{label:"Services",prompt:"What services do you offer?"},{label:"Start a project",prompt:"I want to start a project."},{label:"Consultation",prompt:"I want to request a consultation."}]);
  }
}
async function sendUserMessage(raw) {
  const text = String(raw || "").trim();
  if (!text) return;
  removeQuickReplies();
  addMessage(text, "user");
  chatInput.value = "";
  if (awaitingLead) { await handleLeadAnswer(text); return; }
  if (awaitingBooking) { await handleBookingAnswer(text); return; }

  if (chatMode.value === "ai") {
    const loading = addMessage("Thinking…");
    try {
      const result = await postJSON("/api/chat", {
        message: text,
        history: history.slice(-10)
      });
      loading.textContent = result.reply;
      history.push({role:"user",content:text},{role:"assistant",content:result.reply});
      if (/\b(book|appointment|consultation|meeting)\b/i.test(text)) {
        addQuickReplies([{label:"Request a consultation",prompt:"I want to request a consultation."}]);
      } else if (/\b(project|website|automation|quote|pricing|price)\b/i.test(text)) {
        addQuickReplies([{label:"Share project details",prompt:"I want to start a project."},{label:"Request a consultation",prompt:"I want to request a consultation."}]);
      }
    } catch (e) {
      loading.textContent = e.message.includes("Failed to fetch")
        ? "The AI backend isn't running in this preview. Start the included Node server and configure your AI API key, or switch to Quick demo."
        : e.message;
    }
    messages.scrollTop = messages.scrollHeight;
  } else {
    demoReply(text);
  }
}
chatForm.addEventListener("submit", event => {
  event.preventDefault();
  sendUserMessage(chatInput.value);
});
messages.addEventListener("click", event => {
  const button = event.target.closest("button[data-prompt]");
  if (button) sendUserMessage(button.dataset.prompt);
});

const bookingDialog = $("#bookingDialog");
function openBookingDialog() {
  if (typeof bookingDialog.showModal === "function") bookingDialog.showModal();
  else bookingDialog.setAttribute("open", "");
}
$("#bookingClose").addEventListener("click", () => bookingDialog.close());
$("#bookingForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $("#bookingStatus");
  const button = form.querySelector("button[type=submit]");
  const data = Object.fromEntries(new FormData(form).entries());
  button.disabled = true;
  status.textContent = "";
  try {
    await postJSON("/api/appointments", data);
    status.textContent = "Appointment request sent. The team will contact you to confirm availability.";
    form.reset();
  } catch (e) {
    status.textContent = e.message.includes("Failed to fetch")
      ? "The appointment backend isn't connected in this preview. Run the included server to enable requests."
      : e.message;
  } finally {
    button.disabled = false;
  }
});
