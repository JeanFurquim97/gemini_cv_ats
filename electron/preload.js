const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("atsApi", {
  saveApiKey: (apiKey) => ipcRenderer.invoke("settings:save-api-key", apiKey),
  hasApiKey: () => ipcRenderer.invoke("settings:has-api-key"),

  getProfile: () => ipcRenderer.invoke("profile:get"),
  saveProfile: (profile) => ipcRenderer.invoke("profile:save", profile),

  getJobDescription: () => ipcRenderer.invoke("job:get-description"),
  setJobDescription: (text) => ipcRenderer.invoke("job:set-description", text),
  getJobAnalysis: () => ipcRenderer.invoke("job:get-analysis"),
  analyzeJob: (description) => ipcRenderer.invoke("job:analyze", description),

  getGeneratedResume: () => ipcRenderer.invoke("resume:get"),
  generateResume: () => ipcRenderer.invoke("resume:generate"),
  exportResumePdf: (resumeJson) => ipcRenderer.invoke("resume:export-pdf", resumeJson)
});
