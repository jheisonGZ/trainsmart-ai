import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { gsap } from "gsap";
import Swal from "sweetalert2";
import {
  Bone, Zap, Heart, AlertTriangle,
  ChevronRight, ChevronLeft, CheckCircle2, Circle,
  FileText, Shield, ArrowLeft, Footprints, Hand,
  ActivitySquare, Flame, Timer, MoveHorizontal,
  StretchHorizontal, HeartPulse, Droplets, Wind,
  TrendingDown, Layers, Ban, Package, Dumbbell,
  Gauge, PersonStanding,
} from "lucide-react";
import "./HealthHistory.css";

interface HealthData {
  injuries: string[];
  joint_problems: string[];
  conditions: string[];
  limitations: string[];
  notes: string;
  completed: boolean;
}

const sections = [
  {
    key: "injuries",
    icon: <Bone size={24} />,
    label: "Lesiones",
    color: "#ff4a2b",
    description: "¿Has tenido o tenés alguna lesión?",
    options: [
      { label: "Lesión de rodilla",      icon: <Footprints size={15} /> },
      { label: "Lesión de hombro",       icon: <MoveHorizontal size={15} /> },
      { label: "Lesión de espalda baja", icon: <Layers size={15} /> },
      { label: "Lesión de tobillo",      icon: <Footprints size={15} /> },
      { label: "Lesión de muñeca",       icon: <Hand size={15} /> },
      { label: "Lesión de cadera",       icon: <PersonStanding size={15} /> },
      { label: "Lesión de cuello",       icon: <StretchHorizontal size={15} /> },
      { label: "Fractura previa",        icon: <Bone size={15} /> },
      { label: "Ninguna",                icon: <CheckCircle2 size={15} /> },
    ],
  },
  {
    key: "joint_problems",
    icon: <Zap size={24} />,
    label: "Articulaciones",
    color: "#f59e0b",
    description: "¿Tenés problemas articulares?",
    options: [
      { label: "Artritis",                 icon: <Flame size={15} /> },
      { label: "Artrosis",                 icon: <ActivitySquare size={15} /> },
      { label: "Tendinitis",               icon: <Zap size={15} /> },
      { label: "Bursitis",                 icon: <Timer size={15} /> },
      { label: "Dolor crónico de rodilla", icon: <Footprints size={15} /> },
      { label: "Dolor crónico de hombro",  icon: <MoveHorizontal size={15} /> },
      { label: "Hiperlaxitud",             icon: <StretchHorizontal size={15} /> },
      { label: "Ninguno",                  icon: <CheckCircle2 size={15} /> },
    ],
  },
  {
    key: "conditions",
    icon: <Heart size={24} />,
    label: "Condiciones médicas",
    color: "#ec4899",
    description: "¿Tenés alguna condición médica?",
    options: [
      { label: "Hipertensión",        icon: <HeartPulse size={15} /> },
      { label: "Diabetes tipo 1",     icon: <Droplets size={15} /> },
      { label: "Diabetes tipo 2",     icon: <Droplets size={15} /> },
      { label: "Problemas cardíacos", icon: <Heart size={15} /> },
      { label: "Asma",                icon: <Wind size={15} /> },
      { label: "Osteoporosis",        icon: <Bone size={15} /> },
      { label: "Escoliosis",          icon: <TrendingDown size={15} /> },
      { label: "Hernia de disco",     icon: <Layers size={15} /> },
      { label: "Ninguna",             icon: <CheckCircle2 size={15} /> },
    ],
  },
  {
    key: "limitations",
    icon: <AlertTriangle size={24} />,
    label: "Limitaciones físicas",
    color: "#8b5cf6",
    description: "¿Qué movimientos o ejercicios debés evitar?",
    options: [
      { label: "No puedo correr",                          icon: <Ban size={15} /> },
      { label: "No puedo saltar",                          icon: <TrendingDown size={15} /> },
      { label: "No puedo cargar peso",                     icon: <Package size={15} /> },
      { label: "No puedo hacer sentadillas",               icon: <PersonStanding size={15} /> },
      { label: "No puedo hacer planchas",                  icon: <Dumbbell size={15} /> },
      { label: "No puedo hacer ejercicio de alto impacto", icon: <Gauge size={15} /> },
      { label: "Sin limitaciones",                         icon: <CheckCircle2 size={15} /> },
    ],
  },
];

const Alert = Swal.mixin({
  background: "#111",
  color: "#f0f0f0",
  confirmButtonColor: "#ff4a2b",
  cancelButtonColor: "#222",
  iconColor: "#ff4a2b",
  customClass: { popup: "swal-ts-popup", title: "swal-ts-title", confirmButton: "swal-ts-btn" },
});

export default function HealthHistory() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [step, setStep]     = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData]     = useState<HealthData>({
    injuries: [], joint_problems: [], conditions: [], limitations: [],
    notes: "", completed: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef      = useRef<HTMLDivElement>(null);
  const progressRef  = useRef<HTMLDivElement>(null);
  const headerRef    = useRef<HTMLElement>(null);
  const stepsRef     = useRef<HTMLDivElement>(null);

  // Animación de entrada
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(headerRef.current, { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 })
      .fromTo(stepsRef.current,  { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, "-=0.25")
      .fromTo(cardRef.current,   { y: 36,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, "-=0.2");
  }, []);

  // Cargar datos existentes
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "health_history", user.uid)).then(snap => {
      if (snap.exists()) setData(snap.data() as HealthData);
    });
  }, [user]);

  // Barra de progreso
  useEffect(() => {
    gsap.to(progressRef.current, {
      width: `${(step / sections.length) * 100}%`,
      duration: 0.5, ease: "power2.out",
    });
  }, [step]);

  // Animar opciones al entrar
  const animateOptions = () => {
    const opts = document.querySelectorAll(".hh-option");
    if (opts.length > 0) {
      gsap.fromTo(opts,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.28, stagger: 0.035, ease: "power2.out" }
      );
    }
  };

  const toggleOption = (key: keyof HealthData, val: string) => {
    setData(prev => {
      const arr = prev[key] as string[];
      const next = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
      return { ...prev, [key]: next };
    });
  };

  const animateStep = (dir: "next" | "prev", cb: () => void) => {
    const x = dir === "next" ? -50 : 50;
    gsap.to(cardRef.current, {
      x, opacity: 0, duration: 0.2, ease: "power2.in",
      onComplete: () => {
        cb();
        gsap.fromTo(cardRef.current,
          { x: -x, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.28, ease: "power2.out", onComplete: animateOptions }
        );
      },
    });
  };

  const next = () => {
    if (step < sections.length) {
      // Validar que seleccionó al menos una opción en el paso actual
      const key = sections[step]?.key as keyof HealthData;
      const selected = data[key] as string[];
      if (!selected || selected.length === 0) {
        Alert.fire({
          icon: "warning",
          title: "Seleccioná al menos una opción",
          text: `Indicá tu situación en "${sections[step].label}" para continuar.`,
          confirmButtonText: "Entendido",
        });
        return;
      }
      animateStep("next", () => setStep(s => s + 1));
    }
  };
  const prev = () => { if (step > 0) animateStep("prev", () => setStep(s => s - 1)); };

  const handleSave = async () => {
    if (!user) return;

    const confirm = await Alert.fire({
      icon: "question",
      title: "¿Guardar historial?",
      text: "La IA usará esta información para personalizar tu rutina.",
      showCancelButton: true,
      confirmButtonText: "Sí, guardar",
      cancelButtonText: "Revisar",
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    Alert.fire({ title: "Guardando...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      await setDoc(doc(db, "health_history", user.uid), {
        ...data, completed: true, updated_at: new Date().toISOString(),
      });
      await Alert.fire({
        icon: "success",
        title: "¡Historial guardado!",
        text: "Tu rutina será personalizada según tu historial de salud.",
        confirmButtonText: "Ir al dashboard",
        timer: 3500,
        timerProgressBar: true,
      });
      navigate("/dashboard");
    } catch {
      Alert.fire({
        icon: "error",
        title: "Error al guardar",
        text: "Verificá tu conexión e intentá de nuevo.",
        confirmButtonText: "Reintentar",
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
      <header className="hh-header" ref={headerRef}>
        <button className="hh-back" onClick={() => navigate("/home")}>
          <ArrowLeft size={15} /> <span>Dashboard</span>
        </button>
        <div className="hh-logo">Train<span>Smart</span> <em>AI</em></div>
        <div className="hh-header-badge">
          <Shield size={13} /> <span>Historial de salud</span>
        </div>
      </header>

      {/* Progreso */}
      <div className="hh-progress-wrap" ref={stepsRef}>
        <div className="hh-progress-track">
          <div className="hh-progress-bar" ref={progressRef} />
        </div>
        <div className="hh-steps-labels">
          {sections.map((s, i) => (
            <button
              key={s.key}
              className={`hh-step-dot${i === step ? " hh-step-dot--on" : ""}${i < step ? " hh-step-dot--done" : ""}`}
              onClick={() => {
                if (i > step) {
                  // Verificar que todos los pasos anteriores estén completos
                  for (let s = step; s < i; s++) {
                    const key = sections[s]?.key as keyof HealthData;
                    const selected = data[key] as string[];
                    if (!selected || selected.length === 0) {
                      Alert.fire({
                        icon: "warning",
                        title: "Completá los pasos anteriores",
                        text: `Primero indicá tu situación en "${sections[s].label}".`,
                        confirmButtonText: "Entendido",
                      });
                      return;
                    }
                  }
                }
                animateStep(i > step ? "next" : "prev", () => setStep(i));
              }}
            >
              {i < step ? <CheckCircle2 size={13} /> : s.icon}
              <span>{s.label}</span>
            </button>
          ))}
          <button
            className={`hh-step-dot${isLastStep ? " hh-step-dot--on" : ""}`}
            onClick={() => animateStep("next", () => setStep(sections.length))}
          >
            <FileText size={13} /> <span>Notas</span>
          </button>
        </div>
      </div>

      {/* Card */}
      <main className="hh-main">
        <div className="hh-card" ref={cardRef}>

          {!isLastStep ? (
            <>
              <div className="hh-card-icon" style={{ "--accent": currentSection.color } as React.CSSProperties}>
                {currentSection.icon}
              </div>
              <div className="hh-card-head">
                <h2 className="hh-card-title">{currentSection.label}</h2>
                <p className="hh-card-desc">{currentSection.description}</p>
                <p className="hh-card-hint"><Circle size={8} /> Podés seleccionar varias opciones</p>
              </div>

              <div className="hh-options">
                {currentSection.options.map(opt => {
                  const selected = (data[currentKey] as string[]).includes(opt.label);
                  return (
                    <button
                      key={opt.label}
                      className={`hh-option${selected ? " hh-option--on" : ""}`}
                      style={{ "--accent": currentSection.color } as React.CSSProperties}
                      onClick={() => toggleOption(currentKey, opt.label)}
                    >
                      <span className="hh-option-icon">{opt.icon}</span>
                      <span className="hh-option-label">{opt.label}</span>
                      <span className="hh-option-check">
                        {selected ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="hh-card-icon" style={{ "--accent": "#22c55e" } as React.CSSProperties}>
                <FileText size={24} />
              </div>
              <div className="hh-card-head">
                <h2 className="hh-card-title">Observaciones adicionales</h2>
                <p className="hh-card-desc">¿Hay algo más que la IA deba saber sobre tu salud?</p>
                <p className="hh-card-hint"><Circle size={8} /> Este campo es opcional</p>
              </div>

              <textarea
                className="hh-notes"
                placeholder="Ej: Tuve una operación de rodilla hace 2 años, puedo hacer ejercicio pero sin impacto fuerte..."
                value={data.notes}
                onChange={e => setData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
              />

              <div className="hh-summary">
                <p className="hh-summary-title"><Shield size={13} /> Resumen de tu historial</p>
                {sections.map(s => {
                  const vals = data[s.key as keyof HealthData] as string[];
                  return (
                    <div key={s.key} className="hh-summary-item">
                      <span className="hh-summary-icon" style={{ color: s.color }}>{s.icon}</span>
                      <div className="hh-summary-body">
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
            {step > 0
              ? <button className="hh-btn-prev" onClick={prev}><ChevronLeft size={16} /> Anterior</button>
              : <div />
            }
            {!isLastStep
              ? <button className="hh-btn-next" onClick={next}>Siguiente <ChevronRight size={16} /></button>
              : <button className="hh-btn-save" onClick={handleSave} disabled={saving}>
                  {saving
                    ? <><span className="hh-spin" /> Guardando...</>
                    : <><CheckCircle2 size={16} /> Guardar historial</>
                  }
                </button>
            }
          </div>

        </div>
      </main>
    </div>
  );
}