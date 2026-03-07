const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const ElectronStore = require("electron-store");
const keytar = require("keytar");
const { GoogleGenAI } = require("@google/genai");
const puppeteer = require("puppeteer");

const APP_NAME = "Gemini ATS";
const API_SERVICE = "gemini-ats-api-key";
const API_ACCOUNT = "default-user";

const Store = ElectronStore.default || ElectronStore;
const store = new Store({
  name: "gemini-ats-store",
  defaults: {
    profile: {
      summary: "",
      interests: [],
      education: [],
      courses: [],
      certifications: [],
      experience: [],
      projects: [],
      skills: [],
      languages: [],
      links: []
    },
    jobDescription: "",
    jobAnalysis: null,
    generatedResume: null
  }
});

function extractJson(text) {
  if (!text) {
    throw new Error("Resposta vazia da IA.");
  }

  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    return JSON.parse(fencedMatch[1].trim());
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  }

  throw new Error("Não foi possível extrair JSON válido da resposta.");
}

function normalizeArray(arr) {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.filter((item) => String(item || "").trim().length > 0);
}

function toSafeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function resumeHtmlTemplate(resume) {
  const contact = normalizeArray(resume.contact || []);
  const skills = normalizeArray(resume.skills || []);
  const experience = Array.isArray(resume.experience) ? resume.experience : [];
  const education = Array.isArray(resume.education) ? resume.education : [];

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Curriculo ATS</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 36px; font-size: 12px; line-height: 1.45; }
    h1 { margin: 0; font-size: 26px; }
    h2 { font-size: 15px; margin: 18px 0 8px; border-bottom: 1px solid #d8d8d8; padding-bottom: 4px; }
    p { margin: 4px 0; }
    .muted { color: #444; }
    ul { margin: 6px 0 6px 18px; padding: 0; }
    li { margin: 3px 0; }
    .item { margin-bottom: 8px; }
    .label { font-weight: bold; }
  </style>
</head>
<body>
  <h1>${toSafeText(resume.name || "Nome não informado")}</h1>
  <p class="muted">${toSafeText(resume.title || "")}</p>
  <p>${contact.map(toSafeText).join(" | ")}</p>

  <h2>Resumo</h2>
  <p>${toSafeText(resume.summary || "")}</p>

  <h2>Experiência</h2>
  ${experience
    .map((item) => {
      const bullets = normalizeArray(item.bullets || []);
      return `<div class="item">
        <p><span class="label">${toSafeText(item.role || "")}</span> - ${toSafeText(item.company || "")}</p>
        <p class="muted">${toSafeText(item.period || "")}</p>
        <ul>${bullets.map((b) => `<li>${toSafeText(b)}</li>`).join("")}</ul>
      </div>`;
    })
    .join("")}

  <h2>Educação</h2>
  ${education
    .map(
      (item) => `<div class="item">
      <p><span class="label">${toSafeText(item.course || "")}</span> - ${toSafeText(item.institution || "")}</p>
      <p class="muted">${toSafeText(item.period || "")}</p>
    </div>`
    )
    .join("")}

  <h2>Skills</h2>
  <p>${skills.map(toSafeText).join(" | ")}</p>
</body>
</html>`;
}

async function askGeminiForJson({ apiKey, prompt }) {
  const ai = new GoogleGenAI({ apiKey });
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  const text = result.text || "";
  return extractJson(text);
}

async function analyzeJobWithAI(jobDescription) {
  const apiKey = await keytar.getPassword(API_SERVICE, API_ACCOUNT);
  if (!apiKey) {
    throw new Error("API Key não configurada. Salve sua chave em Configurações.");
  }

  const prompt = `
Extraia as informações da descrição da vaga e retorne APENAS JSON válido.

Campos obrigatórios:
- company: string
- responsibilities: string[]
- requirements: string[]
- keywords: string[]
- seniority: string
- tech_stack: string[]

Descrição da vaga:
${jobDescription}
`;

  const parsed = await askGeminiForJson({ apiKey, prompt });
  store.set("jobDescription", jobDescription);
  store.set("jobAnalysis", parsed);
  return parsed;
}

async function generateResumeWithAI() {
  const apiKey = await keytar.getPassword(API_SERVICE, API_ACCOUNT);
  if (!apiKey) {
    throw new Error("API Key não configurada. Salve sua chave em Configurações.");
  }

  const profile = store.get("profile");
  const jobAnalysis = store.get("jobAnalysis");

  if (!jobAnalysis) {
    throw new Error("Analise uma vaga antes de gerar o currículo.");
  }

  const prompt = `
Você é especialista em currículos ATS.
Com base no PERFIL e na VAGA abaixo, gere APENAS JSON válido.

Regras:
- use palavras-chave da vaga
- priorize experiências relevantes
- linguagem profissional
- sem elementos visuais
- estrutura clara e direta para ATS

Formato JSON obrigatório:
{
  "name": "string",
  "title": "string",
  "contact": ["string"],
  "summary": "string",
  "skills": ["string"],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "period": "string",
      "bullets": ["string"]
    }
  ],
  "education": [
    {
      "course": "string",
      "institution": "string",
      "period": "string"
    }
  ]
}

PERFIL:
${JSON.stringify(profile, null, 2)}

VAGA:
${JSON.stringify(jobAnalysis, null, 2)}
`;

  const parsed = await askGeminiForJson({ apiKey, prompt });
  store.set("generatedResume", parsed);
  return parsed;
}

async function generatePdfFromResume(resumeJson) {
  if (!resumeJson || typeof resumeJson !== "object") {
    throw new Error("Currículo inválido para gerar PDF.");
  }

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Salvar currículo ATS em PDF",
    defaultPath: "curriculo-ats.pdf",
    filters: [{ name: "PDF", extensions: ["pdf"] }]
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(resumeHtmlTemplate(resumeJson), { waitUntil: "networkidle0" });
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: false,
      margin: { top: "22mm", right: "16mm", bottom: "22mm", left: "16mm" }
    });
  } finally {
    await browser.close();
  }

  return { canceled: false, filePath };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 760,
    minHeight: 560,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
    return;
  }
  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

ipcMain.handle("settings:save-api-key", async (_event, apiKey) => {
  const value = String(apiKey || "").trim();
  if (!value) {
    throw new Error("API Key inválida.");
  }
  await keytar.setPassword(API_SERVICE, API_ACCOUNT, value);
  return { ok: true };
});

ipcMain.handle("settings:has-api-key", async () => {
  const apiKey = await keytar.getPassword(API_SERVICE, API_ACCOUNT);
  return { hasKey: Boolean(apiKey) };
});

ipcMain.handle("profile:get", () => store.get("profile"));
ipcMain.handle("profile:save", (_event, profile) => {
  store.set("profile", profile || {});
  return { ok: true };
});

ipcMain.handle("job:get-description", () => store.get("jobDescription"));
ipcMain.handle("job:set-description", (_event, text) => {
  store.set("jobDescription", String(text || ""));
  return { ok: true };
});
ipcMain.handle("job:get-analysis", () => store.get("jobAnalysis"));
ipcMain.handle("job:analyze", async (_event, description) => analyzeJobWithAI(String(description || "")));

ipcMain.handle("resume:get", () => store.get("generatedResume"));
ipcMain.handle("resume:generate", async () => generateResumeWithAI());
ipcMain.handle("resume:export-pdf", async (_event, resumeJson) => generatePdfFromResume(resumeJson));

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
