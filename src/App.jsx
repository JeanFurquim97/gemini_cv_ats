import { useEffect, useMemo, useState } from "react";

const defaultProfile = {
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  interests: [""],
  education: [{ course: "", institution: "", period: "" }],
  courses: [""],
  certifications: [""],
  experience: [{ company: "", role: "", period: "", responsibilities: [""], technologies: [""] }],
  projects: [{ name: "", description: "", technologies: [""] }],
  skills: [""],
  languages: [""],
  links: [""]
};

function ensureArray(values, fallback = [""]) {
  return Array.isArray(values) && values.length > 0 ? values : fallback;
}

function sanitizeProfile(profile) {
  if (!profile || typeof profile !== "object") {
    return defaultProfile;
  }

  return {
    ...defaultProfile,
    ...profile,
    interests: ensureArray(profile.interests),
    courses: ensureArray(profile.courses),
    certifications: ensureArray(profile.certifications),
    skills: ensureArray(profile.skills),
    languages: ensureArray(profile.languages),
    links: ensureArray(profile.links),
    education: ensureArray(profile.education, [{ course: "", institution: "", period: "" }]),
    experience: ensureArray(profile.experience, [
      { company: "", role: "", period: "", responsibilities: [""], technologies: [""] }
    ]).map((item) => ({
      company: item.company || "",
      role: item.role || "",
      period: item.period || "",
      responsibilities: ensureArray(item.responsibilities),
      technologies: ensureArray(item.technologies)
    })),
    projects: ensureArray(profile.projects, [{ name: "", description: "", technologies: [""] }]).map((item) => ({
      name: item.name || "",
      description: item.description || "",
      technologies: ensureArray(item.technologies)
    }))
  };
}

function ListInput({ label, values, onChange, placeholder }) {
  const setAt = (index, value) => {
    const updated = [...values];
    updated[index] = value;
    onChange(updated);
  };

  const add = () => onChange([...values, ""]);
  const remove = (index) => onChange(values.filter((_, i) => i !== index));

  return (
    <div className="field-group">
      <label>{label}</label>
      {values.map((value, index) => (
        <div key={`${label}-${index}`} className="inline-row">
          <input value={value} placeholder={placeholder} onChange={(e) => setAt(index, e.target.value)} />
          <button type="button" className="btn tiny danger" onClick={() => remove(index)} disabled={values.length === 1}>
            Remover
          </button>
        </div>
      ))}
      <button type="button" className="btn tiny" onClick={add}>
        + Adicionar
      </button>
    </div>
  );
}

function App() {
  const stepsBase = [
    { id: 1, label: "API Key" },
    { id: 2, label: "Perfil" },
    { id: 3, label: "Vaga" },
    { id: 4, label: "Resultado" }
  ];

  const [currentStep, setCurrentStep] = useState(1);
  const [theme, setTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem("ats-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [profile, setProfile] = useState(defaultProfile);
  const [jobDescription, setJobDescription] = useState("");
  const [jobAnalysis, setJobAnalysis] = useState(null);
  const [generatedResume, setGeneratedResume] = useState(null);
  const [loading, setLoading] = useState({
    savingKey: false,
    savingProfile: false,
    analyzingJob: false,
    generatingResume: false,
    exportingPdf: false
  });
  const [alert, setAlert] = useState({ type: "info", text: "Pronto." });

  useEffect(() => {
    const load = async () => {
      const [profileData, description, analysis, resume, keyStatus] = await Promise.all([
        window.atsApi.getProfile(),
        window.atsApi.getJobDescription(),
        window.atsApi.getJobAnalysis(),
        window.atsApi.getGeneratedResume(),
        window.atsApi.hasApiKey()
      ]);
      setProfile(sanitizeProfile(profileData));
      setJobDescription(description || "");
      setJobAnalysis(analysis || null);
      setGeneratedResume(resume || null);
      setHasKey(Boolean(keyStatus?.hasKey));
    };
    load().catch((err) => setAlert({ type: "error", text: err.message }));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("ats-theme", theme);
  }, [theme]);

  const contactPreview = useMemo(
    () => [profile.email, profile.phone, profile.location, ...profile.links].filter((v) => String(v || "").trim()),
    [profile]
  );

  const profileReady = useMemo(() => {
    return Boolean(profile.name?.trim() && (profile.email?.trim() || profile.phone?.trim()) && profile.summary?.trim());
  }, [profile]);

  const steps = stepsBase.map((step) => ({
    ...step,
    done:
      (step.id === 1 && hasKey) ||
      (step.id === 2 && profileReady) ||
      (step.id === 3 && Boolean(jobAnalysis)) ||
      (step.id === 4 && Boolean(generatedResume))
  }));

  const generationProgress = useMemo(
    () => [
      { label: "Vaga analisada", done: Boolean(jobAnalysis) },
      { label: "Competencias extraidas", done: Boolean(jobAnalysis?.tech_stack?.length) },
      { label: "Curriculo otimizado", done: Boolean(generatedResume) }
    ],
    [jobAnalysis, generatedResume]
  );

  const setActionLoading = (key, value) =>
    setLoading((prev) => ({
      ...prev,
      [key]: value
    }));

  const saveApiKey = async () => {
    setActionLoading("savingKey", true);
    try {
      await window.atsApi.saveApiKey(apiKey);
      setApiKey("");
      setHasKey(true);
      setAlert({ type: "success", text: "API Key salva com sucesso." });
      setCurrentStep(2);
    } catch (err) {
      setAlert({ type: "error", text: err.message });
    } finally {
      setActionLoading("savingKey", false);
    }
  };

  const saveProfile = async () => {
    setActionLoading("savingProfile", true);
    try {
      await window.atsApi.saveProfile(profile);
      setAlert({ type: "success", text: "Perfil salvo localmente." });
    } catch (err) {
      setAlert({ type: "error", text: err.message });
    } finally {
      setActionLoading("savingProfile", false);
    }
  };

  const analyzeJob = async () => {
    if (!jobDescription.trim()) {
      setAlert({ type: "error", text: "Cole uma descricao de vaga." });
      return;
    }

    setActionLoading("analyzingJob", true);
    try {
      await window.atsApi.setJobDescription(jobDescription);
      const parsed = await window.atsApi.analyzeJob(jobDescription);
      setJobAnalysis(parsed);
      setAlert({ type: "success", text: "Vaga analisada com sucesso." });
      setCurrentStep(4);
    } catch (err) {
      setAlert({ type: "error", text: err.message });
    } finally {
      setActionLoading("analyzingJob", false);
    }
  };

  const generateResume = async () => {
    if (!profileReady) {
      setAlert({
        type: "error",
        text: "Complete nome, contato (email ou telefone) e resumo no perfil antes de gerar o curriculo."
      });
      return;
    }
    setActionLoading("generatingResume", true);
    try {
      await window.atsApi.saveProfile(profile);
      const parsed = await window.atsApi.generateResume();
      setGeneratedResume(parsed);
      setAlert({ type: "success", text: "Curriculo ATS gerado." });
    } catch (err) {
      setAlert({ type: "error", text: err.message });
    } finally {
      setActionLoading("generatingResume", false);
    }
  };

  const exportPdf = async () => {
    if (!generatedResume) {
      setAlert({ type: "error", text: "Gere um curriculo antes de exportar PDF." });
      return;
    }
    setActionLoading("exportingPdf", true);
    try {
      const result = await window.atsApi.exportResumePdf(generatedResume);
      if (result?.canceled) {
        setAlert({ type: "info", text: "Exportacao cancelada." });
      } else {
        setAlert({ type: "success", text: `PDF salvo em: ${result.filePath}` });
      }
    } catch (err) {
      setAlert({ type: "error", text: err.message });
    } finally {
      setActionLoading("exportingPdf", false);
    }
  };

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="page">
      <header className="topbar panel">
        <div>
          <h1>Gemini ATS Resume Builder</h1>
          <p className="subtitle">Gerador de curriculos otimizados para ATS com IA</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn theme-toggle" onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? "Modo claro" : "Modo escuro"}
          </button>
          <div className={`status ${hasKey ? "ok" : ""}`}>{hasKey ? "API Key configurada" : "API Key pendente"}</div>
        </div>
      </header>

      <section className="panel stepper" aria-label="Progresso">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            className={`step ${step.done ? "done" : ""} ${currentStep === step.id ? "active" : ""}`}
            onClick={() => setCurrentStep(step.id)}
          >
            <span className="step-number">{step.id}</span>
            <span className="step-label">{step.label}</span>
          </button>
        ))}
        <div className="step-mobile">{currentStep}/4</div>
      </section>

      <section className={`alert ${alert.type}`}>{alert.text}</section>

      <main className="main-container">
        <section className="panel content-card">
          {currentStep === 1 && (
            <div className="step-content">
              <h2>Step 1 - API Key</h2>
              <p className="hint">Configure sua chave para habilitar analise da vaga e geracao do curriculo.</p>
              <div className="field-group">
                <label>Gemini API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  placeholder="Cole sua Gemini API Key"
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <p className="hint">A chave e armazenada com seguranca via keytar no sistema operacional.</p>
              <div className="actions-row">
                <button
                  type="button"
                  className="btn primary"
                  disabled={loading.savingKey || !apiKey.trim()}
                  onClick={saveApiKey}
                >
                  {loading.savingKey ? "Salvando..." : "Salvar chave"}
                </button>
                <button type="button" className="btn" onClick={goNext}>
                  Proximo
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="step-content">
              <h2>Step 2 - Perfil</h2>
              <div className="field-group">
                <label>Nome</label>
                <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="field-group">
                <label>Titulo profissional</label>
                <input value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
              </div>
              <div className="field-group">
                <label>Email</label>
                <input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div className="field-group">
                <label>Telefone</label>
                <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              <div className="field-group">
                <label>Localizacao</label>
                <input value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} />
              </div>
              <div className="field-group">
                <label>Resumo profissional</label>
                <textarea value={profile.summary} onChange={(e) => setProfile({ ...profile, summary: e.target.value })} />
              </div>

              <details className="advanced">
                <summary>Campos avancados</summary>
                <div className="section">
                  <ListInput
                    label="Interesses"
                    values={profile.interests}
                    onChange={(interests) => setProfile({ ...profile, interests })}
                    placeholder="Ex.: IA aplicada a backend"
                  />
                  <ListInput
                    label="Cursos"
                    values={profile.courses}
                    onChange={(courses) => setProfile({ ...profile, courses })}
                    placeholder="Ex.: Docker para Devs"
                  />
                  <ListInput
                    label="Certificacoes"
                    values={profile.certifications}
                    onChange={(certifications) => setProfile({ ...profile, certifications })}
                    placeholder="Ex.: AWS Cloud Practitioner"
                  />
                  <ListInput
                    label="Skills tecnicas"
                    values={profile.skills}
                    onChange={(skills) => setProfile({ ...profile, skills })}
                    placeholder="Ex.: Python"
                  />
                  <ListInput
                    label="Idiomas"
                    values={profile.languages}
                    onChange={(languages) => setProfile({ ...profile, languages })}
                    placeholder="Ex.: Ingles avancado"
                  />
                  <ListInput
                    label="Links (GitHub/LinkedIn)"
                    values={profile.links}
                    onChange={(links) => setProfile({ ...profile, links })}
                    placeholder="https://linkedin.com/in/..."
                  />

                  <div className="field-group">
                    <label>Educacao</label>
                    {profile.education.map((ed, i) => (
                      <div className="card" key={`edu-${i}`}>
                        <input
                          placeholder="Curso"
                          value={ed.course}
                          onChange={(e) => {
                            const education = [...profile.education];
                            education[i] = { ...education[i], course: e.target.value };
                            setProfile({ ...profile, education });
                          }}
                        />
                        <input
                          placeholder="Instituicao"
                          value={ed.institution}
                          onChange={(e) => {
                            const education = [...profile.education];
                            education[i] = { ...education[i], institution: e.target.value };
                            setProfile({ ...profile, education });
                          }}
                        />
                        <input
                          placeholder="Periodo"
                          value={ed.period}
                          onChange={(e) => {
                            const education = [...profile.education];
                            education[i] = { ...education[i], period: e.target.value };
                            setProfile({ ...profile, education });
                          }}
                        />
                        <button
                          type="button"
                          className="btn tiny danger"
                          disabled={profile.education.length === 1}
                          onClick={() => {
                            const education = profile.education.filter((_, idx) => idx !== i);
                            setProfile({ ...profile, education });
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn tiny"
                      onClick={() =>
                        setProfile({
                          ...profile,
                          education: [...profile.education, { course: "", institution: "", period: "" }]
                        })
                      }
                    >
                      + Educacao
                    </button>
                  </div>

                  <div className="field-group">
                    <label>Experiencia profissional</label>
                    {profile.experience.map((exp, i) => (
                      <div className="card" key={`exp-${i}`}>
                        <input
                          placeholder="Empresa"
                          value={exp.company}
                          onChange={(e) => {
                            const experience = [...profile.experience];
                            experience[i] = { ...experience[i], company: e.target.value };
                            setProfile({ ...profile, experience });
                          }}
                        />
                        <input
                          placeholder="Cargo"
                          value={exp.role}
                          onChange={(e) => {
                            const experience = [...profile.experience];
                            experience[i] = { ...experience[i], role: e.target.value };
                            setProfile({ ...profile, experience });
                          }}
                        />
                        <input
                          placeholder="Periodo"
                          value={exp.period}
                          onChange={(e) => {
                            const experience = [...profile.experience];
                            experience[i] = { ...experience[i], period: e.target.value };
                            setProfile({ ...profile, experience });
                          }}
                        />

                        <ListInput
                          label="Responsabilidades"
                          values={exp.responsibilities}
                          onChange={(responsibilities) => {
                            const experience = [...profile.experience];
                            experience[i] = { ...experience[i], responsibilities };
                            setProfile({ ...profile, experience });
                          }}
                          placeholder="Ex.: Desenvolvimento de APIs"
                        />
                        <ListInput
                          label="Tecnologias usadas"
                          values={exp.technologies}
                          onChange={(technologies) => {
                            const experience = [...profile.experience];
                            experience[i] = { ...experience[i], technologies };
                            setProfile({ ...profile, experience });
                          }}
                          placeholder="Ex.: Docker"
                        />

                        <button
                          type="button"
                          className="btn tiny danger"
                          disabled={profile.experience.length === 1}
                          onClick={() => {
                            const experience = profile.experience.filter((_, idx) => idx !== i);
                            setProfile({ ...profile, experience });
                          }}
                        >
                          Remover experiencia
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn tiny"
                      onClick={() =>
                        setProfile({
                          ...profile,
                          experience: [
                            ...profile.experience,
                            { company: "", role: "", period: "", responsibilities: [""], technologies: [""] }
                          ]
                        })
                      }
                    >
                      + Experiencia
                    </button>
                  </div>

                  <div className="field-group">
                    <label>Projetos</label>
                    {profile.projects.map((project, i) => (
                      <div className="card" key={`proj-${i}`}>
                        <input
                          placeholder="Nome do projeto"
                          value={project.name}
                          onChange={(e) => {
                            const projects = [...profile.projects];
                            projects[i] = { ...projects[i], name: e.target.value };
                            setProfile({ ...profile, projects });
                          }}
                        />
                        <textarea
                          placeholder="Descricao"
                          value={project.description}
                          onChange={(e) => {
                            const projects = [...profile.projects];
                            projects[i] = { ...projects[i], description: e.target.value };
                            setProfile({ ...profile, projects });
                          }}
                        />
                        <ListInput
                          label="Tecnologias do projeto"
                          values={project.technologies}
                          onChange={(technologies) => {
                            const projects = [...profile.projects];
                            projects[i] = { ...projects[i], technologies };
                            setProfile({ ...profile, projects });
                          }}
                          placeholder="Ex.: React"
                        />
                        <button
                          type="button"
                          className="btn tiny danger"
                          disabled={profile.projects.length === 1}
                          onClick={() => {
                            const projects = profile.projects.filter((_, idx) => idx !== i);
                            setProfile({ ...profile, projects });
                          }}
                        >
                          Remover projeto
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn tiny"
                      onClick={() =>
                        setProfile({
                          ...profile,
                          projects: [...profile.projects, { name: "", description: "", technologies: [""] }]
                        })
                      }
                    >
                      + Projeto
                    </button>
                  </div>
                </div>
              </details>

              <div className="actions-row">
                <button type="button" className="btn" onClick={goBack}>
                  Voltar
                </button>
                <button type="button" className="btn primary" disabled={loading.savingProfile} onClick={saveProfile}>
                  {loading.savingProfile ? "Salvando perfil..." : "Salvar perfil"}
                </button>
                <button type="button" className="btn" onClick={goNext}>
                  Proximo
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="step-content">
              <h2>Step 3 - Vaga</h2>
              <div className="field-group">
                <label>Descricao da vaga</label>
                <textarea
                  className="big-textarea"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Cole aqui o texto da vaga..."
                />
              </div>
              <div className="actions-row">
                <button type="button" className="btn" onClick={goBack}>
                  Voltar
                </button>
                <button
                  type="button"
                  className="btn primary"
                  disabled={loading.analyzingJob || !hasKey}
                  onClick={analyzeJob}
                >
                  {loading.analyzingJob ? "Analisando..." : "Analisar vaga"}
                </button>
                <button type="button" className="btn" onClick={goNext}>
                  Proximo
                </button>
              </div>
              {jobAnalysis && (
                <div className="result-cards">
                  <div className="result-card">
                    <strong>Empresa</strong>
                    <span>{jobAnalysis.company || "Nao identificada"}</span>
                  </div>
                  <div className="result-card">
                    <strong>Senioridade</strong>
                    <span>{jobAnalysis.seniority || "Nao identificada"}</span>
                  </div>
                  <div className="result-card">
                    <strong>Stack</strong>
                    <span>{Array.isArray(jobAnalysis.tech_stack) ? jobAnalysis.tech_stack.join(", ") : "-"}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="step-content">
              <h2>Step 4 - Resultado</h2>
              <p className="hint">
                Contato sugerido para o curriculo: {contactPreview.join(" | ") || "preencha email/telefone/links"}
              </p>
              <div className="actions-row">
                <button type="button" className="btn" onClick={goBack}>
                  Voltar
                </button>
                <button
                  type="button"
                  className="btn primary"
                  disabled={loading.generatingResume || !hasKey}
                  onClick={generateResume}
                >
                  {loading.generatingResume ? "Gerando curriculo..." : "Gerar curriculo"}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={loading.exportingPdf || !generatedResume}
                  onClick={exportPdf}
                >
                  {loading.exportingPdf ? "Exportando PDF..." : "Exportar PDF"}
                </button>
              </div>

              {(loading.analyzingJob || loading.generatingResume) && (
                <div className="progress-box">
                  <p>Gerando curriculo...</p>
                </div>
              )}

              <div className="progress-list">
                {generationProgress.map((item) => (
                  <div key={item.label} className={`progress-item ${item.done ? "done" : ""}`}>
                    {item.done ? "OK" : "..."} {item.label}
                  </div>
                ))}
              </div>

              {generatedResume ? (
                <div className="result-cards">
                  <div className="result-card">
                    <strong>Nome</strong>
                    <span>{generatedResume.name || "-"}</span>
                  </div>
                  <div className="result-card">
                    <strong>Titulo</strong>
                    <span>{generatedResume.title || "-"}</span>
                  </div>
                  <div className="result-card">
                    <strong>Skills</strong>
                    <span>{Array.isArray(generatedResume.skills) ? generatedResume.skills.join(", ") : "-"}</span>
                  </div>
                </div>
              ) : (
                <p className="hint">Nenhum curriculo gerado ainda.</p>
              )}

              <details className="advanced">
                <summary>Avancado</summary>
                <div className="section">
                  <h3>JSON da vaga</h3>
                  <pre>{JSON.stringify(jobAnalysis, null, 2)}</pre>
                  <h3>JSON do curriculo</h3>
                  <pre>{JSON.stringify(generatedResume, null, 2)}</pre>
                </div>
              </details>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
