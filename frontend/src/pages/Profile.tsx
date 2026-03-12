import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import "./Profile.css";

const Alert = Swal.mixin({
  background: "#111",
  color: "#f5f5f5",
  confirmButtonColor: "#ff4a2b",
  customClass: { popup: "swal-ts-popup", title: "swal-ts-title", confirmButton: "swal-ts-btn" },
});

const steps = ["Datos personales", "Condición física", "Objetivos"];

function calcIMC(weight: number, heightCm: number): number {
  const h = heightCm / 100;
  return parseFloat((weight / (h * h)).toFixed(1));
}

function imcCategory(imc: number) {
  if (imc < 18.5) return { label: "Bajo peso", color: "#60a5fa" };
  if (imc < 25)   return { label: "Normal", color: "#32c878" };
  if (imc < 30)   return { label: "Sobrepeso", color: "#f0c040" };
  return              { label: "Obesidad", color: "#ff4a2b" };
}

export default function Profile() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0 — datos personales
  const [name, setName]         = useState(user?.displayName ?? "");
  const [birthdate, setBirthdate] = useState("");
  const [sex, setSex]           = useState("");

  // Step 1 — condición física
  const [weight, setWeight]     = useState("");
  const [height, setHeight]     = useState("");
  const [experience, setExperience] = useState("");

  // Step 2 — objetivos
  const [goal, setGoal]         = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [timePerSession, setTimePerSession] = useState("");

  // IMC calculado en tiempo real
  const imc = weight && height ? calcIMC(Number(weight), Number(height)) : null;
  const imcCat = imc ? imcCategory(imc) : null;

  // Edad calculada
  const age = birthdate
    ? Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const validateStep = () => {
    if (step === 0) {
      if (!name.trim()) { Alert.fire({ icon: "warning", title: "Falta tu nombre", text: "Por favor ingresa tu nombre completo." }); return false; }
      if (!birthdate)   { Alert.fire({ icon: "warning", title: "Falta tu fecha de nacimiento" }); return false; }
      if (!sex)         { Alert.fire({ icon: "warning", title: "Selecciona tu sexo" }); return false; }
    }
    if (step === 1) {
      if (!weight || Number(weight) < 30 || Number(weight) > 300) { Alert.fire({ icon: "warning", title: "Peso inválido", text: "Ingresa un peso entre 30 y 300 kg." }); return false; }
      if (!height || Number(height) < 100 || Number(height) > 250) { Alert.fire({ icon: "warning", title: "Altura inválida", text: "Ingresa una altura entre 100 y 250 cm." }); return false; }
      if (!experience) { Alert.fire({ icon: "warning", title: "Selecciona tu nivel de experiencia" }); return false; }
    }
    if (step === 2) {
      if (!goal)          { Alert.fire({ icon: "warning", title: "Selecciona tu objetivo" }); return false; }
      if (!daysPerWeek)   { Alert.fire({ icon: "warning", title: "Selecciona los días por semana" }); return false; }
      if (!timePerSession){ Alert.fire({ icon: "warning", title: "Selecciona el tiempo por sesión" }); return false; }
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  const handleSave = async () => {
    if (!validateStep()) return;
    if (!user) { Alert.fire({ icon: "error", title: "No hay sesión activa" }); return; }

    setSaving(true);
    try {
      const profileData = {
        uid: user.uid,
        name: name.trim(),
        email: user.email,
        birthdate,
        age,
        sex,
        weight_kg: Number(weight),
        height_cm: Number(height),
        imc,
        imc_category: imcCat?.label,
        experience_level: experience,
        goal,
        days_per_week: Number(daysPerWeek),
        time_per_session: timePerSession,
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await setDoc(doc(db, "profiles", user.uid), profileData);

      await Alert.fire({
        icon: "success",
        title: "¡Perfil guardado!",
        text: "Ahora generaremos tu rutina personalizada.",
        timer: 2000,
        showConfirmButton: false,
      });

      navigate("/home");
    } catch (err) {
      console.error(err);
      Alert.fire({ icon: "error", title: "Error al guardar", text: "Intenta de nuevo." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf">
      {/* Header */}
      <header className="pf-header">
        <div className="pf-logo">Train<span>Smart</span> <em>AI</em></div>
        <div className="pf-user">
          <span>{user?.email}</span>
          <button className="pf-logout" onClick={() => { auth.signOut(); navigate("/"); }}>Salir</button>
        </div>
      </header>

      <main className="pf-main">
        {/* Stepper */}
        <div className="pf-stepper">
          {steps.map((s, i) => (
            <div key={i} className={`pf-step${i === step ? " pf-step--active" : i < step ? " pf-step--done" : ""}`}>
              <div className="pf-step-num">{i < step ? "✓" : i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
          <div className="pf-step-bar">
            <div className="pf-step-fill" style={{ width: `${(step / (steps.length - 1)) * 100}%` }} />
          </div>
        </div>

        <div className="pf-card">
          {/* ── STEP 0: Datos personales ─────────────────────────── */}
          {step === 0 && (
            <div className="pf-section">
              <h2 className="pf-title">Datos personales</h2>
              <p className="pf-sub">Necesitamos conocerte para personalizar tu experiencia.</p>

              <div className="pf-grid">
                <div className="pf-field pf-field--full">
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    placeholder="Juan García"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div className="pf-field">
                  <label>Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={birthdate}
                    onChange={e => setBirthdate(e.target.value)}
                    max={new Date(Date.now() - 16 * 365.25 * 24 * 3600 * 1000).toISOString().split("T")[0]}
                  />
                  {age !== null && <span className="pf-hint">{age} años</span>}
                </div>

                <div className="pf-field">
                  <label>Sexo</label>
                  <div className="pf-opts">
                    {[["male", "Masculino", "♂"], ["female", "Femenino", "♀"], ["other", "Otro", "⚧"]].map(([v, l, icon]) => (
                      <button
                        key={v}
                        type="button"
                        className={`pf-opt${sex === v ? " pf-opt--on" : ""}`}
                        onClick={() => setSex(v)}
                      >
                        <span className="pf-opt-icon">{icon}</span>
                        <span>{l}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 1: Condición física ──────────────────────────── */}
          {step === 1 && (
            <div className="pf-section">
              <h2 className="pf-title">Condición física</h2>
              <p className="pf-sub">Esta información calcula tu IMC y adapta la intensidad de tu rutina.</p>

              <div className="pf-grid">
                <div className="pf-field">
                  <label>Peso (kg)</label>
                  <input
                    type="number"
                    placeholder="70"
                    min={30} max={300}
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                  />
                </div>

                <div className="pf-field">
                  <label>Altura (cm)</label>
                  <input
                    type="number"
                    placeholder="170"
                    min={100} max={250}
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                  />
                </div>

                {/* IMC en tiempo real */}
                {imc !== null && imcCat && (
                  <div className="pf-field pf-field--full">
                    <div className="pf-imc">
                      <div className="pf-imc-value" style={{ color: imcCat.color }}>{imc}</div>
                      <div className="pf-imc-info">
                        <span className="pf-imc-label">Índice de Masa Corporal</span>
                        <span className="pf-imc-cat" style={{ color: imcCat.color }}>{imcCat.label}</span>
                      </div>
                    </div>
                    <div className="pf-imc-bar">
                      <div className="pf-imc-seg" style={{ background: "#60a5fa" }} />
                      <div className="pf-imc-seg" style={{ background: "#32c878" }} />
                      <div className="pf-imc-seg" style={{ background: "#f0c040" }} />
                      <div className="pf-imc-seg" style={{ background: "#ff4a2b" }} />
                      <div
                        className="pf-imc-marker"
                        style={{ left: `${Math.min(Math.max((imc - 15) / 25 * 100, 0), 100)}%` }}
                      />
                    </div>
                    <div className="pf-imc-scale">
                      <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
                    </div>
                  </div>
                )}

                <div className="pf-field pf-field--full">
                  <label>Nivel de experiencia</label>
                  <div className="pf-opts">
                    {[
                      ["beginner", "Principiante", "0–6 meses"],
                      ["returning", "Regresando", "Pausa larga"],
                      ["intermediate", "Intermedio", "6+ meses"],
                    ].map(([v, l, sub]) => (
                      <button
                        key={v}
                        type="button"
                        className={`pf-opt pf-opt--tall${experience === v ? " pf-opt--on" : ""}`}
                        onClick={() => setExperience(v)}
                      >
                        <span className="pf-opt-title">{l}</span>
                        <span className="pf-opt-sub">{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Objetivos ─────────────────────────────────── */}
          {step === 2 && (
            <div className="pf-section">
              <h2 className="pf-title">Tus objetivos</h2>
              <p className="pf-sub">La IA usará esto para generar una rutina personalizada y segura.</p>

              <div className="pf-grid">
                <div className="pf-field pf-field--full">
                  <label>Objetivo principal</label>
                  <div className="pf-opts pf-opts--2">
                    {[
                      ["lose_fat",       "Perder grasa",    "🔥"],
                      ["gain_muscle",    "Ganar músculo",   "💪"],
                      ["general_fitness","Estar activo",    "⚡"],
                      ["strength",       "Ganar fuerza",    "🏋️"],
                    ].map(([v, l, icon]) => (
                      <button
                        key={v}
                        type="button"
                        className={`pf-opt pf-opt--tall${goal === v ? " pf-opt--on" : ""}`}
                        onClick={() => setGoal(v)}
                      >
                        <span className="pf-opt-icon">{icon}</span>
                        <span className="pf-opt-title">{l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pf-field">
                  <label>Días por semana</label>
                  <div className="pf-days">
                    {[2, 3, 4, 5, 6].map(d => (
                      <button
                        key={d}
                        type="button"
                        className={`pf-day${daysPerWeek === String(d) ? " pf-day--on" : ""}`}
                        onClick={() => setDaysPerWeek(String(d))}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pf-field">
                  <label>Tiempo por sesión</label>
                  <select value={timePerSession} onChange={e => setTimePerSession(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">60 minutos</option>
                    <option value="75">75 minutos</option>
                    <option value="90">90 minutos</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Navegación */}
          <div className="pf-nav">
            {step > 0 && (
              <button className="pf-btn pf-btn--sec" onClick={back} disabled={saving}>
                ← Atrás
              </button>
            )}
            {step < steps.length - 1 ? (
              <button className="pf-btn" onClick={next}>
                Continuar →
              </button>
            ) : (
              <button className="pf-btn" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="ts-spin" /> Guardando...</> : "Guardar perfil ✓"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}