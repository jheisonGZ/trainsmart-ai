import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { gsap } from "gsap";
import Swal from "sweetalert2";
import {
  Bone, Heart, Zap, AlertTriangle, ChevronRight,
  ChevronLeft, CheckCircle2, Circle, FileText, Shield,
} from "lucide-react";
import "./HealthHistory.css";

/* ── Tipos ───────────────────────────────────────────────── */
interface HealthData {
  injuries: string[];
  joint_problems: string[];
  conditions: string[];
  limitations: string[];
  notes: string;
  completed: boolean;
}

/* ── Datos de cada sección ───────────────────────────────── */
const sections = [
  {
    key: "injuries",
    icon: <Bone size={22} />,
    label: "Lesiones",
    color: "#ff4a2b",
    description: "¿Has tenido o tenés alguna lesión?",
    options: [
      "Lesión de rodilla", "Lesión de hombro", "Lesión de espalda baja",
      "Lesión de tobillo", "Lesión de muñeca", "Lesión de cadera",
      "Lesión de cuello", "Fractura previa", "Ninguna",
    ],
  },
  {
    key: "joint_problems",
    icon: <Zap size={22} />,
    label: "Articulaciones",
    color: "#f59e0b",
    description: "¿Tenés problemas articulares?",
    options: [
      "Artritis", "Artrosis", "Tendinitis", "Bursitis",
      "Dolor crónico de rodilla", "Dolor crónico de hombro",
      "Hiperlaxitud", "Ninguno",
    ],
  },
  {
    key: "conditions",
    icon: <Heart size={22} />,
    label: "Condiciones médicas",
    color: "#ec4899",
    description: "¿Tenés alguna condición médica?",
    options: [
      "Hipertensión", "Diabetes tipo 1", "Diabetes tipo 2",
      "Problemas cardíacos", "Asma", "Osteoporosis",
      "Escoliosis", "Hernia de disco", "Ninguna",
    ],
  },
  {
    key: "limitations",
    icon: <AlertTriangle size={22} />,
    label: "Limitaciones físicas",
    color: "#8b5cf6",
    description: "¿Qué movimientos o ejercicios debés evitar?",
    options: [
      "No puedo correr", "No puedo saltar", "No puedo cargar peso",
      "No puedo hacer sentadillas", "No puedo hacer planchas",
      "No puedo hacer ejercicio de alto impacto", "Sin limitaciones",
    ],
  },
];

/* ── Componente ──────────────────────────────────────────── */
export default function HealthHistory() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [data, setData]       = useState<HealthData>({
    injuries: [], joint_problems: [], conditions: [], limitations: [], notes: "", completed: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef      = useRef<HTMLDivElement>(null);
  const progressRef  = useRef<HTMLDivElement>(null);

  // Entrada inicial
  useEffect(() => {
    gsap.fromTo(containerRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );
  }, []);

  // Cargar datos existentes
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "health_history", user.uid)).then(snap => {
      if (snap.exists()) setData(snap.data() as HealthData);
    });
  }, [user]);

  // Animar barra de progreso
  useEffect(() => {
    gsap.to(progressRef.current, {
      width: `${((step) / (sections.length)) * 100}%`,
      duration: 0.5, ease: "power2.out",
    });
  }, [step]);

  const toggleOption = (key: keyof HealthData, val: string) => {
    setData(prev => {
      const arr = prev[key] as string[];
      const next = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
      return { ...prev, [key]: next };
    });
  };

  const animateStep = (dir: "next" | "prev", cb: () => void) => {
    const x = dir === "next" ? -40 : 40;
    gsap.to(cardRef.current, {
      x, opacity: 0, duration: 0.22, ease: "power2.in",
      onComplete: () => {
        cb();
        gsap.fromTo(cardRef.current,
          { x: -x, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.28, ease: "power2.out" }
        );
      },
    });
  };

  const next = () => {
    if (step < sections.length) animateStep("next", () => setStep(s => s + 1));
  };
  const prev = () => {
    if (step > 0) animateStep("prev", () => setStep(s => s - 1));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "health_history", user.uid), {
        ...data, completed: true,
        updated_at: new Date().toISOString(),
      });
      await Swal.fire({
        icon: "success",
        title: "¡Historial guardado!",
        text: "La IA usará esta información para personalizar tu rutina.",
        background: "#111",
        color: "#f0f0f0",
        confirmButtonColor: "#ff4a2b",
        confirmButtonText: "Ver mi dashboard",
        iconColor: "#ff4a2b",
      });
      navigate("/dashboard"); // ✅ pasa por RootRedirect → todo completo → manda a /home
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: "Intentá de nuevo.",
        background: "#111",
        color: "#f0f0f0",
        confirmButtonColor: "#ff4a2b",
        iconColor: "#ff4a2b",
      });
    } finally {
      setSaving(false);
    }
  };

  const currentSection = sections[step];
  const currentKey     = currentSection?.key as keyof HealthData;
  const isLastStep     = step === sections.length;

  return (
    <div className="hh" ref={containerRef}>
      {/* Header */}
      <header className="hh-header">
        <button className="hh-back" onClick={() => navigate("/home")}>
          <ChevronLeft size={16} /> Dashboard
        </button>
        <div className="hh-logo">Train<span>Smart</span> <em>AI</em></div>
        <div className="hh-header-badge">
          <Shield size={13} /> Historial de salud
        </div>
      </header>

      {/* Progreso */}
      <div className="hh-progress-wrap">
        <div className="hh-progress-track">
          <div className="hh-progress-bar" ref={progressRef} />
        </div>
        <div className="hh-steps-labels">
          {sections.map((s, i) => (
            <button
              key={s.key}
              className={`hh-step-dot${i === step ? " hh-step-dot--on" : ""}${i < step ? " hh-step-dot--done" : ""}`}
              onClick={() => animateStep(i > step ? "next" : "prev", () => setStep(i))}
            >
              {i < step ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              <span>{s.label}</span>
            </button>
          ))}
          <button
            className={`hh-step-dot${isLastStep ? " hh-step-dot--on" : ""}`}
            onClick={() => animateStep("next", () => setStep(sections.length))}
          >
            <FileText size={14} />
            <span>Notas</span>
          </button>
        </div>
      </div>

      {/* Card principal */}
      <main className="hh-main">
        <div className="hh-card" ref={cardRef}>
          {!isLastStep ? (
            <>
              <div className="hh-card-icon" style={{ "--accent": currentSection.color } as React.CSSProperties}>
                {currentSection.icon}
              </div>
              <h2 className="hh-card-title">{currentSection.label}</h2>
              <p className="hh-card-desc">{currentSection.description}</p>
              <p className="hh-card-hint">Podés seleccionar varias opciones</p>

              <div className="hh-options">
                {currentSection.options.map(opt => {
                  const selected = (data[currentKey] as string[]).includes(opt);
                  return (
                    <button
                      key={opt}
                      className={`hh-option${selected ? " hh-option--on" : ""}`}
                      style={{ "--accent": currentSection.color } as React.CSSProperties}
                      onClick={() => toggleOption(currentKey, opt)}
                    >
                      <span className="hh-option-check">
                        {selected ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="hh-card-icon" style={{ "--accent": "#22c55e" } as React.CSSProperties}>
                <FileText size={22} />
              </div>
              <h2 className="hh-card-title">Observaciones adicionales</h2>
              <p className="hh-card-desc">¿Hay algo más que la IA deba saber sobre tu salud?</p>
              <p className="hh-card-hint">Este campo es opcional</p>
              <textarea
                className="hh-notes"
                placeholder="Ej: Tuve una operación de rodilla hace 2 años, puedo hacer ejercicio pero sin impacto fuerte..."
                value={data.notes}
                onChange={e => setData(prev => ({ ...prev, notes: e.target.value }))}
                rows={5}
              />

              {/* Resumen */}
              <div className="hh-summary">
                {sections.map(s => {
                  const vals = data[s.key as keyof HealthData] as string[];
                  return (
                    <div key={s.key} className="hh-summary-item">
                      <span className="hh-summary-icon" style={{ color: s.color }}>{s.icon}</span>
                      <div>
                        <span className="hh-summary-label">{s.label}</span>
                        <span className="hh-summary-val">
                          {vals.length === 0 ? "Sin seleccionar" : vals.join(", ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Navegación */}
          <div className="hh-nav">
            {step > 0 && (
              <button className="hh-btn-prev" onClick={prev}>
                <ChevronLeft size={16} /> Anterior
              </button>
            )}
            {!isLastStep ? (
              <button className="hh-btn-next" onClick={next}>
                Siguiente <ChevronRight size={16} />
              </button>
            ) : (
              <button className="hh-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar historial"} {!saving && <CheckCircle2 size={16} />}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}