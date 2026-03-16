import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import Swal from "sweetalert2";
import {
  ActivitySquare,
  AlertTriangle,
  ArrowLeft,
  Ban,
  Bone,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Dumbbell,
  Edit3,
  FileText,
  Flame,
  Footprints,
  Gauge,
  Hand,
  Heart,
  HeartPulse,
  Layers,
  MoveHorizontal,
  Package,
  PersonStanding,
  Shield,
  StretchHorizontal,
  Timer,
  TrendingDown,
  Wind,
  Zap,
  Droplets,
} from "lucide-react";

import RequestStateCard from "../components/RequestStateCard";
import { useAuth } from "../context/AuthContext";
import { ApiClientError, api } from "../lib/api";
import type { HealthHistoryRecord } from "../types/api";
import "./HealthHistory.css";

interface HealthFormData {
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
    iconSm: <Bone size={18} />,
    label: "Lesiones",
    color: "#ff4a2b",
    description: "¿Has tenido o tienes alguna lesión?",
    options: [
      { label: "Lesión de rodilla", icon: <Footprints size={15} /> },
      { label: "Lesión de hombro", icon: <MoveHorizontal size={15} /> },
      { label: "Lesión de espalda baja", icon: <Layers size={15} /> },
      { label: "Lesión de tobillo", icon: <Footprints size={15} /> },
      { label: "Lesión de muñeca", icon: <Hand size={15} /> },
      { label: "Lesión de cadera", icon: <PersonStanding size={15} /> },
      { label: "Lesión de cuello", icon: <StretchHorizontal size={15} /> },
      { label: "Fractura previa", icon: <Bone size={15} /> },
      { label: "Ninguna", icon: <CheckCircle2 size={15} /> },
    ],
  },
  {
    key: "joint_problems",
    icon: <Zap size={24} />,
    iconSm: <Zap size={18} />,
    label: "Articulaciones",
    color: "#f59e0b",
    description: "¿Tienes problemas articulares?",
    options: [
      { label: "Artritis", icon: <Flame size={15} /> },
      { label: "Artrosis", icon: <ActivitySquare size={15} /> },
      { label: "Tendinitis", icon: <Zap size={15} /> },
      { label: "Bursitis", icon: <Timer size={15} /> },
      { label: "Dolor crónico de rodilla", icon: <Footprints size={15} /> },
      { label: "Dolor crónico de hombro", icon: <MoveHorizontal size={15} /> },
      { label: "Hiperlaxitud", icon: <StretchHorizontal size={15} /> },
      { label: "Ninguno", icon: <CheckCircle2 size={15} /> },
    ],
  },
  {
    key: "conditions",
    icon: <Heart size={24} />,
    iconSm: <Heart size={18} />,
    label: "Condiciones médicas",
    color: "#ec4899",
    description: "¿Tienes alguna condición médica relevante?",
    options: [
      { label: "Hipertensión", icon: <HeartPulse size={15} /> },
      { label: "Diabetes tipo 1", icon: <Droplets size={15} /> },
      { label: "Diabetes tipo 2", icon: <Droplets size={15} /> },
      { label: "Problemas cardíacos", icon: <Heart size={15} /> },
      { label: "Asma", icon: <Wind size={15} /> },
      { label: "Osteoporosis", icon: <Bone size={15} /> },
      { label: "Escoliosis", icon: <TrendingDown size={15} /> },
      { label: "Hernia de disco", icon: <Layers size={15} /> },
      { label: "Ninguna", icon: <CheckCircle2 size={15} /> },
    ],
  },
  {
    key: "limitations",
    icon: <AlertTriangle size={24} />,
    iconSm: <AlertTriangle size={18} />,
    label: "Limitaciones físicas",
    color: "#8b5cf6",
    description: "¿Qué movimientos o ejercicios deberían evitarse?",
    options: [
      { label: "No puedo correr", icon: <Ban size={15} /> },
      { label: "No puedo saltar", icon: <TrendingDown size={15} /> },
      { label: "No puedo cargar peso", icon: <Package size={15} /> },
      { label: "No puedo hacer sentadillas", icon: <PersonStanding size={15} /> },
      { label: "No puedo hacer planchas", icon: <Dumbbell size={15} /> },
      { label: "No puedo hacer ejercicio de alto impacto", icon: <Gauge size={15} /> },
      { label: "Sin limitaciones", icon: <CheckCircle2 size={15} /> },
    ],
  },
] as const;

const Alert = Swal.mixin({
  background: "#111",
  color: "#f0f0f0",
  confirmButtonColor: "#ff4a2b",
  cancelButtonColor: "#222",
  iconColor: "#ff4a2b",
  customClass: {
    popup: "swal-ts-popup",
    title: "swal-ts-title",
    confirmButton: "swal-ts-btn",
  },
});

function toFormData(record: HealthHistoryRecord | null): HealthFormData {
  return {
    injuries: record?.injuries ?? [],
    joint_problems: record?.joint_problems ?? [],
    conditions: record?.conditions ?? [],
    limitations: record?.limitations ?? [],
    notes: record?.notes ?? "",
    completed: record?.completed ?? false,
  };
}

function HealthSummary({
  data,
  onEdit,
}: {
  data: HealthHistoryRecord;
  onEdit: () => void;
}) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    timeline.fromTo(
      cardRef.current,
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55 },
    );

    const items = document.querySelectorAll(".hh-sum-item");

    if (items.length > 0) {
      timeline.fromTo(
        items,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.07, duration: 0.3 },
        "-=0.3",
      );
    }
  }, []);

  return (
    <div className="hh">
      <header className="hh-header">
        <button
          className="hh-back"
          onClick={() => navigate("/home", { replace: true })}
        >
          <ArrowLeft size={15} /> <span>Dashboard</span>
        </button>
        <div className="hh-logo">
          Train<span>Smart</span> <em>AI</em>
        </div>
        <div className="hh-header-badge">
          <CheckCircle2 size={13} /> <span>Historial completo</span>
        </div>
      </header>

      <main className="hh-sum-main">
        <div className="hh-sum-card" ref={cardRef}>
          <div className="hh-sum-hero">
            <div className="hh-sum-hero-icon">
              <Shield size={22} />
            </div>
            <div className="hh-sum-hero-info">
              <h2 className="hh-sum-title">Historial de salud</h2>
              <p className="hh-sum-subtitle">
                La IA usa esta información para personalizar tu rutina
              </p>
            </div>
            <button className="hh-sum-edit-btn" onClick={onEdit}>
              <Edit3 size={15} /> <span>Editar</span>
            </button>
          </div>

          <div className="hh-sum-sections">
            {sections.map((section) => {
              const values = data[section.key] ?? [];
              const empty = values.length === 0;

              return (
                <div key={section.key} className="hh-sum-item">
                  <div
                    className="hh-sum-item-icon"
                    style={{ "--accent": section.color } as React.CSSProperties}
                  >
                    {section.iconSm}
                  </div>
                  <div className="hh-sum-item-body">
                    <span className="hh-sum-item-label">{section.label}</span>
                    <div className="hh-sum-item-tags">
                      {empty ? (
                        <span className="hh-sum-tag hh-sum-tag--empty">
                          Sin registrar
                        </span>
                      ) : (
                        values.map((value) => (
                          <span
                            key={value}
                            className="hh-sum-tag"
                            style={{ "--accent": section.color } as React.CSSProperties}
                          >
                            {value}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {data.notes && (
              <div className="hh-sum-item">
                <div
                  className="hh-sum-item-icon"
                  style={{ "--accent": "#22c55e" } as React.CSSProperties}
                >
                  <FileText size={18} />
                </div>
                <div className="hh-sum-item-body">
                  <span className="hh-sum-item-label">Observaciones</span>
                  <p className="hh-sum-notes-text">{data.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function HealthForm({
  existing,
  onSaved,
  onCancel,
}: {
  existing: HealthHistoryRecord | null;
  onSaved: (data: HealthHistoryRecord) => void;
  onCancel?: () => void;
}) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const isEdit = Boolean(existing?.completed);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<HealthFormData>(toFormData(existing));
  const headerRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    timeline
      .fromTo(
        headerRef.current,
        { y: -24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
      )
      .fromTo(
        stepsRef.current,
        { y: -12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4 },
        "-=0.25",
      )
      .fromTo(
        cardRef.current,
        { y: 36, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55 },
        "-=0.2",
      );
  }, []);

  useEffect(() => {
    gsap.to(progressRef.current, {
      width: `${(step / sections.length) * 100}%`,
      duration: 0.5,
      ease: "power2.out",
    });
  }, [step]);

  const animateOptions = () => {
    const options = document.querySelectorAll(".hh-option");

    if (options.length > 0) {
      gsap.fromTo(
        options,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.28, stagger: 0.035, ease: "power2.out" },
      );
    }
  };

  const animateStep = (direction: "next" | "prev", callback: () => void) => {
    const translateX = direction === "next" ? -50 : 50;

    gsap.to(cardRef.current, {
      x: translateX,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        callback();
        gsap.fromTo(
          cardRef.current,
          { x: -translateX, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.28,
            ease: "power2.out",
            onComplete: animateOptions,
          },
        );
      },
    });
  };

  const toggleOption = (
    key: keyof Pick<
      HealthFormData,
      "injuries" | "joint_problems" | "conditions" | "limitations"
    >,
    value: string,
  ) => {
    setData((current) => {
      const currentValues = current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((entry) => entry !== value)
        : [...currentValues, value];

      return {
        ...current,
        [key]: nextValues,
      };
    });
  };

  const next = () => {
    const key = sections[step].key;
    const selected = data[key];

    if (!selected || selected.length === 0) {
      void Alert.fire({
        icon: "warning",
        title: "Selecciona al menos una opción",
        text: `Indica tu situación en "${sections[step].label}" para continuar.`,
      });
      return;
    }

    animateStep("next", () => setStep((current) => current + 1));
  };

  const previous = () => {
    if (step === 0) {
      return;
    }

    animateStep("prev", () => setStep((current) => current - 1));
  };

  const handleSave = async () => {
    if (saveInFlightRef.current) {
      return;
    }

    const confirmation = await Alert.fire({
      icon: "question",
      title: isEdit ? "¿Guardar cambios?" : "¿Guardar historial?",
      text: "La IA usará esta información para personalizar tu rutina.",
      showCancelButton: true,
      confirmButtonText: "Sí, guardar",
      cancelButtonText: "Revisar",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    saveInFlightRef.current = true;
    setSaving(true);

    try {
      Alert.fire({
        title: "Guardando...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const payload = {
        injuries: data.injuries,
        joint_problems: data.joint_problems,
        conditions: data.conditions,
        limitations: data.limitations,
        notes: data.notes || null,
      };

      const saved = existing?.user_id
        ? await api.put<HealthHistoryRecord>("/health-history/me", payload)
        : await api.post<HealthHistoryRecord>("/health-history/me", payload);

      Swal.close();

      await Alert.fire({
        icon: "success",
        title: isEdit ? "¡Historial actualizado!" : "¡Historial guardado!",
        text: isEdit
          ? "Tus cambios fueron guardados."
          : "Ahora tu rutina podrá contemplar estas restricciones.",
        timer: 2200,
        showConfirmButton: false,
      });

      onSaved(saved);

      if (!isEdit) {
        navigate("/home", { replace: true });
      }
    } catch (error) {
      Swal.close();
      await Alert.fire({
        icon: "error",
        title: "Error al guardar",
        text:
          error instanceof Error
            ? error.message
            : "No fue posible guardar tu historial.",
      });
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  };

  const currentSection = sections[step];
  const currentKey = currentSection?.key;
  const isLastStep = step === sections.length;

  return (
    <div className="hh">
      <header className="hh-header" ref={headerRef}>
        <button
          className="hh-back"
          onClick={() =>
            isEdit ? onCancel?.() : navigate("/home", { replace: true })
          }
        >
          <ArrowLeft size={15} /> <span>{isEdit ? "Cancelar" : "Dashboard"}</span>
        </button>
        <div className="hh-logo">
          Train<span>Smart</span> <em>AI</em>
        </div>
        <div className="hh-header-badge">
          <Shield size={13} /> <span>Historial de salud</span>
        </div>
      </header>

      <div className="hh-progress-wrap" ref={stepsRef}>
        <div className="hh-progress-track">
          <div className="hh-progress-bar" ref={progressRef} />
        </div>
        <div className="hh-steps-labels">
          {sections.map((section, index) => (
            <button
              key={section.key}
              className={`hh-step-dot${
                index === step ? " hh-step-dot--on" : ""
              }${index < step ? " hh-step-dot--done" : ""}`}
              onClick={() =>
                animateStep(index > step ? "next" : "prev", () => setStep(index))
              }
            >
              {index < step ? <CheckCircle2 size={13} /> : section.icon}
              <span>{section.label}</span>
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

      <main className="hh-main">
        <div className="hh-card" ref={cardRef}>
          {!isLastStep ? (
            <>
              <div
                className="hh-card-icon"
                style={{ "--accent": currentSection.color } as React.CSSProperties}
              >
                {currentSection.icon}
              </div>
              <div className="hh-card-head">
                <h2 className="hh-card-title">{currentSection.label}</h2>
                <p className="hh-card-desc">{currentSection.description}</p>
                <p className="hh-card-hint">
                  <Circle size={8} /> Puedes seleccionar varias opciones
                </p>
              </div>
              <div className="hh-options">
                {currentSection.options.map((option) => {
                  const selected = data[currentKey].includes(option.label);

                  return (
                    <button
                      key={option.label}
                      className={`hh-option${selected ? " hh-option--on" : ""}`}
                      style={{ "--accent": currentSection.color } as React.CSSProperties}
                      onClick={() => toggleOption(currentKey, option.label)}
                    >
                      <span className="hh-option-icon">{option.icon}</span>
                      <span className="hh-option-label">{option.label}</span>
                      <span className="hh-option-check">
                        {selected ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <Circle size={14} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div
                className="hh-card-icon"
                style={{ "--accent": "#22c55e" } as React.CSSProperties}
              >
                <FileText size={24} />
              </div>
              <div className="hh-card-head">
                <h2 className="hh-card-title">Observaciones adicionales</h2>
                <p className="hh-card-desc">
                  ¿Hay algo más que la IA deba saber sobre tu salud?
                </p>
                <p className="hh-card-hint">
                  <Circle size={8} /> Este campo es opcional
                </p>
              </div>
              <textarea
                className="hh-notes"
                placeholder="Ej: Tuve una operación de rodilla hace 2 años y debo evitar impacto alto..."
                value={data.notes}
                onChange={(event) =>
                  setData((current) => ({ ...current, notes: event.target.value }))
                }
                rows={4}
              />
              <div className="hh-summary">
                <p className="hh-summary-title">
                  <Shield size={13} /> Resumen de tu historial
                </p>
                {sections.map((section) => {
                  const values = data[section.key];

                  return (
                    <div key={section.key} className="hh-summary-item">
                      <span
                        className="hh-summary-icon"
                        style={{ color: section.color }}
                      >
                        {section.icon}
                      </span>
                      <div className="hh-summary-body">
                        <span className="hh-summary-label">{section.label}</span>
                        <span className="hh-summary-val">
                          {values.length === 0 ? "Sin seleccionar" : values.join(", ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="hh-nav">
            {step > 0 ? (
              <button className="hh-btn-prev" onClick={previous}>
                <ChevronLeft size={16} /> Anterior
              </button>
            ) : (
              <button
                className="hh-btn-prev"
                onClick={() => void signOut().then(() => navigate("/", { replace: true }))}
              >
                Salir
              </button>
            )}
            {!isLastStep ? (
              <button className="hh-btn-next" onClick={next}>
                Siguiente <ChevronRight size={16} />
              </button>
            ) : (
              <button className="hh-btn-save" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Guardando..." : <><CheckCircle2 size={16} /> {isEdit ? "Guardar cambios" : "Guardar historial"}</>}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function HealthHistory() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [healthData, setHealthData] = useState<HealthHistoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadHealthHistory() {
      setLoadError(null);
      setLoading(true);

      try {
        const data = await api.get<HealthHistoryRecord>("/health-history/me");

        if (active) {
          setHealthData(data);
        }
      } catch (error) {
        if (
          active &&
          error instanceof ApiClientError &&
          error.status === 404
        ) {
          setHealthData(null);
        } else if (active) {
          console.error("Failed to load health history", error);
          setLoadError(
            error instanceof ApiClientError && error.status === 401
              ? "Tu sesi\u00f3n operativa expir\u00f3 o dej\u00f3 de ser v\u00e1lida. Inicia sesi\u00f3n nuevamente."
              : error instanceof ApiClientError && error.status === 429
                ? "La API alcanz\u00f3 temporalmente su l\u00edmite de peticiones. Espera unos segundos y vuelve a intentar."
                : error instanceof Error
                  ? error.message
                  : "No fue posible cargar tu historial en este momento.",
          );
        } else {
          console.error("Failed to load health history", error);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadHealthHistory();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <div className="ts-loading">
        <span className="ts-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <RequestStateCard
        title="No pudimos cargar tu historial"
        description={loadError}
        primaryActionLabel="Reintentar"
        onPrimaryAction={() => setReloadKey((current) => current + 1)}
        secondaryActionLabel="Volver al inicio"
        onSecondaryAction={() => void signOut().then(() => navigate("/", { replace: true }))}
      />
    );
  }

  if (!healthData || !healthData.completed) {
    return (
      <HealthForm
        existing={healthData}
        onSaved={(saved) => {
          setHealthData(saved);
          setEditing(false);
        }}
      />
    );
  }

  if (editing) {
    return (
      <HealthForm
        existing={healthData}
        onSaved={(saved) => {
          setHealthData(saved);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return <HealthSummary data={healthData} onEdit={() => setEditing(true)} />;
}
