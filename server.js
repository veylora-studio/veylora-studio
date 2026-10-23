require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, "data");
const MAX_BODY = "30kb";
app.disable("x-powered-by");
app.use(express.json({ limit: MAX_BODY }));
app.use(express.urlencoded({ extended: false, limit: MAX_BODY }));
app.use(express.static(path.join(__dirname), { extensions: ["html"] }));

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function cleanString(value, max = 1200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 180;
}
function appendRecord(filename, record) {
  const target = path.join(DATA_DIR, filename);
  let records = [];
  if (fs.existsSync(target)) {
    try { records = JSON.parse(fs.readFileSync(target, "utf8")); if (!Array.isArray(records)) records = []; }
    catch { records = []; }
  }
  records.push(record);
  fs.writeFileSync(target, JSON.stringify(records, null, 2), { mode: 0o600 });
}

app.post("/api/leads", (req, res) => {
  const name = cleanString(req.body.name, 100);
  const email = cleanString(req.body.email, 180);
  const service = cleanString(req.body.service, 180);
  const message = cleanString(req.body.message, 2000);
  if (name.length < 2 || !validEmail(email) || !service) {
    return res.status(400).json({ error: "Please provide your name, a valid email, and the service you need." });
  }
  appendRecord("leads.json", { id: cryptoId(), name, email, service, message, createdAt: new Date().toISOString() });
  res.status(201).json({ ok: true });
});

app.post("/api/appointments", (req, res) => {
  const name = cleanString(req.body.name, 100);
  const email = cleanString(req.body.email, 180);
  const date = cleanString(req.body.date, 10);
  const time = cleanString(req.body.time, 80);
  const notes = cleanString(req.body.notes, 1500);
  if (name.length < 2 || !validEmail(email) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) {
    return res.status(400).json({ error: "Please provide your name, valid email, preferred date, and time." });
  }
  appendRecord("appointments.json", { id: cryptoId(), name, email, date, time, notes, status: "pending_confirmation", createdAt: new Date().toISOString() });
  res.status(201).json({ ok: true, message: "Request saved; calendar availability is not automatically reserved." });
});

function cryptoId() {
  return require("crypto").randomBytes(12).toString("hex");
}

app.post("/api/chat", async (req, res) => {
  const message = cleanString(req.body.message, 1200);
  const incoming = Array.isArray(req.body.history) ? req.body.history.slice(-10) : [];
  if (!message) return res.status(400).json({ error: "Please enter a message." });
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "AI is not configured yet. Add OPENAI_API_KEY to your .env file, then restart the server." });
  }
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const history = incoming
    .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .map(m => ({ role: m.role, content: cleanString(m.content, 1200) }));
  try {
    const upstream = await fetch(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are the Driftline Studious website assistant. The agency offers 2D web design, immersive 3D web experiences, and AI automation. Explain services clearly, be warm and concise, and help visitors decide on a next step. Never invent client names, testimonials, pricing, project results, or calendar availability. You may suggest using the website enquiry form or the consultation request flow. You cannot actually reserve calendar slots; appointment requests require human confirmation. Do not ask for passwords, payment card details, or sensitive personal information." },
          ...history,
          { role: "user", content: message }
        ],
        temperature: 0.6,
        max_tokens: 450
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("AI provider returned status", upstream.status);
      return res.status(502).json({ error: "The AI service couldn't respond. Check your API key, model access, and billing settings." });
    }
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return res.status(502).json({ error: "The AI service returned an empty response. Please try again." });
    res.json({ reply });
  } catch (err) {
    console.error("AI request failed:", err.message);
    res.status(502).json({ error: "Couldn't reach the AI service. Please try again shortly." });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Request is too large." });
  console.error(err.message);
  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(PORT, () => {
  console.log(`Driftline Studious is running at http://localhost:${PORT}`);
  console.log(`AI chat: ${process.env.OPENAI_API_KEY ? "configured" : "demo only until OPENAI_API_KEY is set"}`);
});
