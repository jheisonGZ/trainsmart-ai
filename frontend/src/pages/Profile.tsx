import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import Swal from "sweetalert2";
import {
  Activity,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  Edit3,
  Flame,
  LockKeyhole,
  Ruler,
  Target,
  TrendingUp,
  User,
  Weight,
  Zap,
} from "lucide-react";

import RequestStateCard from "../components/RequestStateCard";
import { useAuth } from "../context/AuthContext";
import { ApiClientError, api } from "../lib/api";
import type { Goal, ProfileRecord } from "../types/api";
import "./Profile.css";

const Alert = Swal.mixin({
  background: "#111",
  color: "#f5f5f5",
  confirmButtonColor: "#ff4a2b",
  cancelButtonColor: "#222",
  iconColor: "#ff4a2b",
  customClass: {
    popup: "swal-ts-popup",
    title: "swal-ts-title",
    confirmButton: "swal-ts-btn",
  },
});

const steps = ["Datos personales", "Condición física", "Objetivos"];

const sexLabel: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
  prefer_not_say: "Prefiero no decirlo",
};

const experienceLabel: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

const goalLabel: Record<Goal, { label: string; icon: React.ReactNode }> = {
  lose_fat: { label: "Perder grasa", icon: <Flame size={16} /> },
  gain_muscle: { label: "Ganar músculo", icon: <Dumbbell size={16} /> },
  general_fitness: { label: "Estar activo", icon: <Activity size={16} /> },
  strength: { label: "Ganar fuerza", icon: <TrendingUp size={16} /> },
  mobility: { label: "Movilidad", icon: <Target size={16} /> },
};

const bmiCategoryLabel: Record<string, { label: string; color: string }> = {
  underweight: { label: "Bajo peso", color: "#60a5fa" },
  normal: { label: "Normal", color: "#32c878" },
  overweight: { label: "Sobrepeso", color: "#f0c040" },
  obese: { label: "Obesidad", color: "#ff4a2b" },
};

function calcBmi(weight: number, heightCm: number) {
  const meters = heightCm / 100;
  return Number((weight / (meters * meters)).toFixed(1));
}

function getAgeFromBirthDate(birthDate: string) {
  return Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000),
  );
}

function getBmiPresentation(profile: ProfileRecord) {
  if (!profile.bmi || !profile.bmi_category) {
    return { label: "Sin calcular", color: "#f0f0f0" };
  }

  return bmiCategoryLabel[profile.bmi_category] ?? {
    label: profile.bmi_category,
    color: "#f0f0f0",
  };
}

function ProfileSummary({
  profile,
  onEdit,
  onConfirm,
  confirming,
}: {
  profile: ProfileRecord;
  onEdit: () => void;
  onConfirm: () => Promise<void>;
  confirming: boolean;
}) {
  const navigate = useNavigate();
  const { firebaseUser, supabaseUser, signOut } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const bmiState = getBmiPresentation(profile);
  const firstName =
    profile.name?.split(" ")[0] ??
    firebaseUser?.displayName?.split(" ")[0] ??
    "Usuario";

  useEffect(() => {
    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    timeline.fromTo(
      cardRef.current,
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55 },
    );

    const items = document.querySelectorAll(".pf-sum-item");

    if (items.length > 0) {
      timeline.fromTo(
        items,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.06, duration: 0.3 },
        "-=0.3",
      );
    }
  }, []);

  return (
    <div className="pf">
      <header className="pf-header">
        <button
          className="pf-back"
          onClick={() => navigate("/home", { replace: true })}
        >
          <ArrowLeft size={15} /> <span>Dashboard</span>
        </button>
        <div className="pf-logo">
          Train<span>Smart</span> <em>AI</em>
        </div>
        <div
          className="pf-header-badge"
          style={
            profile.profile_confirmed
              ? undefined
              : {
                  background: "rgba(255,192,56,0.1)",
                  borderColor: "rgba(255,192,56,0.25)",
                  color: "#f0c040",
                }
          }
        >
          {profile.profile_confirmed ? <CheckCircle2 size={13} /> : <LockKeyhole size={13} />}
          <span>
            {profile.profile_confirmed
              ? "Perfil confirmado"
              : "Falta confirmar perfil"}
          </span>
        </div>
      </header>

      <main className="pf-sum-main">
        <div className="pf-sum-card" ref={cardRef}>
          <div className="pf-sum-hero">
            <div className="pf-sum-avatar">
              {firebaseUser?.photoURL || profile.avatar_url ? (
                <img
                  src={firebaseUser?.photoURL ?? profile.avatar_url ?? ""}
                  alt={firstName}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{firstName[0]?.toUpperCase() ?? "U"}</span>
              )}
            </div>
            <div className="pf-sum-hero-info">
              <h2 className="pf-sum-name">{profile.name ?? supabaseUser?.email}</h2>
            </div>
            <button className="pf-sum-edit-btn" onClick={onEdit}>
              <Edit3 size={15} /> <span>Editar</span>
            </button>
          </div>

          <div className="pf-sum-imc">
            <div className="pf-sum-imc-left">
              <span className="pf-sum-imc-val" style={{ color: bmiState.color }}>
                {profile.bmi ?? "--"}
              </span>
              <span className="pf-sum-imc-tag">IMC</span>
            </div>
            <div className="pf-sum-imc-right">
              <span className="pf-sum-imc-cat" style={{ color: bmiState.color }}>
                {bmiState.label}
              </span>
              <div className="pf-imc-bar">
                <div className="pf-imc-seg" style={{ background: "#60a5fa" }} />
                <div className="pf-imc-seg" style={{ background: "#32c878" }} />
                <div className="pf-imc-seg" style={{ background: "#f0c040" }} />
                <div className="pf-imc-seg" style={{ background: "#ff4a2b" }} />
                <div
                  className="pf-imc-marker"
                  style={{
                    left: `${Math.min(
                      Math.max((((profile.bmi ?? 15) - 15) / 25) * 100, 0),
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pf-sum-grid">
            {[
              {
                icon: <Calendar size={16} />,
                label: "Edad",
                value: `${profile.age ?? "--"} años`,
              },
              {
                icon: <User size={16} />,
                label: "Sexo",
                value: sexLabel[profile.sex ?? ""] ?? "Sin definir",
              },
              {
                icon: <Weight size={16} />,
                label: "Peso",
                value: `${profile.weight_kg ?? "--"} kg`,
              },
              {
                icon: <Ruler size={16} />,
                label: "Altura",
                value: `${profile.height_cm ?? "--"} cm`,
              },
              {
                icon: <Zap size={16} />,
                label: "Experiencia",
                value:
                  experienceLabel[profile.experience_level ?? ""] ?? "Sin definir",
              },
              {
                icon: goalLabel[profile.goal ?? "general_fitness"]?.icon ?? (
                  <Target size={16} />
                ),
                label: "Objetivo",
                value: profile.goal
                  ? goalLabel[profile.goal].label
                  : "Sin definir",
              },
              {
                icon: <Calendar size={16} />,
                label: "Días/semana",
                value: `${profile.days_per_week ?? "--"} días`,
              },
              {
                icon: <Clock size={16} />,
                label: "Tiempo/sesión",
                value: `${profile.time_per_session ?? "--"} min`,
              },
            ].map((item) => (
              <div key={item.label} className="pf-sum-item">
                <span className="pf-sum-item-icon">{item.icon}</span>
                <div>
                  <span className="pf-sum-item-label">{item.label}</span>
                  <span className="pf-sum-item-val">{item.value}</span>
                </div>
              </div>
            ))}
          </div>

          {!profile.profile_confirmed && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="pf-btn" onClick={() => void onConfirm()} disabled={confirming}>
                {confirming ? "Confirmando..." : "Confirmar perfil para generar rutina"}
              </button>
              <button
                className="pf-btn pf-btn--sec"
                onClick={() => void signOut().then(() => navigate("/", { replace: true }))}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ProfileForm({
  existing,
  onSaved,
  onCancel,
}: {
  existing: ProfileRecord | null;
  onSaved: (profile: ProfileRecord) => void;
  onCancel?: () => void;
}) {
  const navigate = useNavigate();
  const { firebaseUser, supabaseUser, signOut } = useAuth();
  const sexSelectRef = useRef<HTMLDivElement>(null);
  const saveInFlightRef = useRef(false);
  const isEdit = Boolean(existing?.completed);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(
    existing?.name ?? firebaseUser?.displayName ?? "",
  );
  const [birthDate, setBirthDate] = useState(existing?.birth_date ?? "");
  const [sex, setSex] = useState(existing?.sex ?? "");
  const [weight, setWeight] = useState(
    existing?.weight_kg ? String(existing.weight_kg) : "",
  );
  const [height, setHeight] = useState(
    existing?.height_cm ? String(existing.height_cm) : "",
  );
  const [experience, setExperience] = useState(
    existing?.experience_level ?? "",
  );
  const [goal, setGoal] = useState(existing?.goal ?? "");
  const [daysPerWeek, setDaysPerWeek] = useState(
    existing?.days_per_week ? String(existing.days_per_week) : "",
  );
  const [timePerSession, setTimePerSession] = useState(
    existing?.time_per_session ? String(existing.time_per_session) : "",
  );
  const [sexOpen, setSexOpen] = useState(false);

  const sexOptions = [
    { value: "male", label: "Masculino", icon: "♂" },
    { value: "female", label: "Femenino", icon: "♀" },
    { value: "other", label: "Otro", icon: "⚧" },
    { value: "prefer_not_say", label: "Prefiero no decirlo", icon: "◦" },
  ];

  const age = birthDate ? getAgeFromBirthDate(birthDate) : null;
  const bmi =
    weight && height ? calcBmi(Number(weight), Number(height)) : null;
  const bmiState = bmi
    ? getBmiPresentation({
        ...existing,
        bmi,
        bmi_category:
          bmi < 18.5 ? "underweight" : bmi < 25 ? "normal" : bmi < 30 ? "overweight" : "obese",
      } as ProfileRecord)
    : null;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!sexSelectRef.current) {
        return;
      }

      if (!sexSelectRef.current.contains(event.target as Node)) {
        setSexOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const validateStep = () => {
    if (step === 0) {
      if (!name.trim()) {
        void Alert.fire({ icon: "warning", title: "Falta tu nombre" });
        return false;
      }
      if (!birthDate) {
        void Alert.fire({
          icon: "warning",
          title: "Falta tu fecha de nacimiento",
        });
        return false;
      }
      if (!sex) {
        void Alert.fire({ icon: "warning", title: "Selecciona tu sexo" });
        return false;
      }
    }

    if (step === 1) {
      if (!weight || Number(weight) < 30 || Number(weight) > 300) {
        void Alert.fire({
          icon: "warning",
          title: "Peso inválido",
          text: "Ingresa un valor entre 30 y 300 kg.",
        });
        return false;
      }

      if (!height || Number(height) < 100 || Number(height) > 250) {
        void Alert.fire({
          icon: "warning",
          title: "Altura inválida",
          text: "Ingresa un valor entre 100 y 250 cm.",
        });
        return false;
      }

      if (!experience) {
        void Alert.fire({
          icon: "warning",
          title: "Selecciona tu nivel de experiencia",
        });
        return false;
      }
    }

    if (step === 2) {
      if (!goal) {
        void Alert.fire({ icon: "warning", title: "Selecciona tu objetivo" });
        return false;
      }
      if (!daysPerWeek) {
        void Alert.fire({
          icon: "warning",
          title: "Selecciona tus días por semana",
        });
        return false;
      }
      if (!timePerSession) {
        void Alert.fire({
          icon: "warning",
          title: "Selecciona el tiempo por sesión",
        });
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (saveInFlightRef.current) {
      return;
    }

    if (!validateStep()) {
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
        name: name.trim(),
        birth_date: birthDate,
        sex,
        weight_kg: Number(weight),
        height_cm: Number(height),
        experience_level: experience,
        goal,
        days_per_week: Number(daysPerWeek),
        time_per_session: Number(timePerSession),
        email: supabaseUser?.email ?? existing?.email ?? undefined,
        avatar_url: firebaseUser?.photoURL ?? existing?.avatar_url ?? undefined,
      };

      const saved = existing?.user_id
        ? await api.put<ProfileRecord>("/profiles/me", payload)
        : await api.post<ProfileRecord>("/profiles/me", payload);

      Swal.close();

      await Alert.fire({
        icon: "success",
        title: isEdit ? "¡Perfil actualizado!" : "¡Perfil guardado!",
        text: saved.profile_confirmed
          ? "Tus cambios quedaron guardados."
          : "Ahora puedes completar salud y luego confirmar el perfil para generar rutina.",
        timer: 2200,
        showConfirmButton: false,
      });

      onSaved(saved);

      if (!isEdit) {
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      Swal.close();
      await Alert.fire({
        icon: "error",
        title: "Error al guardar",
        text:
          error instanceof Error
            ? error.message
            : "No fue posible guardar tu perfil.",
      });
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="pf">
      <header className="pf-header">
        {isEdit ? (
          <button className="pf-back" onClick={onCancel}>
            <ArrowLeft size={15} /> <span>Cancelar</span>
          </button>
        ) : (
          <button
            className="pf-back"
            onClick={() => navigate("/home", { replace: true })}
          >
            <ArrowLeft size={15} /> <span>Dashboard</span>
          </button>
        )}
        <div className="pf-logo">
          Train<span>Smart</span> <em>AI</em>
        </div>
        <div className="pf-user">
          <span>{supabaseUser?.email ?? existing?.email}</span>
          <button
            className="pf-logout"
            onClick={() => void signOut().then(() => navigate("/", { replace: true }))}
          >
            Salir
          </button>
        </div>
      </header>

      <main className="pf-main">
        <div className="pf-stepper">
          {steps.map((label, index) => (
            <div
              key={label}
              className={`pf-step${
                index === step
                  ? " pf-step--active"
                  : index < step
                    ? " pf-step--done"
                    : ""
              }`}
            >
              <div className="pf-step-num">{index < step ? "✓" : index + 1}</div>
              <span>{label}</span>
            </div>
          ))}
          <div className="pf-step-bar">
            <div
              className="pf-step-fill"
              style={{ width: `${(step / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="pf-card">
          {step === 0 && (
            <div className="pf-section pf-section--personal">
              <h2 className="pf-title">Datos personales</h2>
              <p className="pf-sub">
                Necesitamos conocerte para personalizar tu experiencia.
              </p>
              <div className="pf-grid">
                <div className="pf-field pf-field--full">
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    placeholder="Juan García"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="pf-field pf-field--date">
                  <label>Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                    max={
                      new Date(Date.now() - 16 * 365.25 * 24 * 3600 * 1000)
                        .toISOString()
                        .split("T")[0]
                    }
                  />
                  <span className="pf-hint pf-hint--age">
                    {age !== null ? `${age} años` : ""}
                  </span>
                </div>
                <div className="pf-field pf-field--sex">
                  <label>Sexo</label>
                  <div className="pf-sex-select" ref={sexSelectRef}>
                    <button
                      type="button"
                      className={`pf-sex-trigger${
                        sexOpen ? " pf-sex-trigger--open" : ""
                      }${sex ? " pf-sex-trigger--selected" : ""}`}
                      onClick={() => setSexOpen((current) => !current)}
                    >
                      <span className="pf-sex-current">
                        <span className="pf-sex-current-icon">
                          {sexOptions.find((option) => option.value === sex)?.icon ?? "◦"}
                        </span>
                        <span className="pf-sex-current-label">
                          {sexOptions.find((option) => option.value === sex)?.label ??
                            "Seleccionar"}
                        </span>
                      </span>
                      <span
                        className={`pf-sex-caret${
                          sexOpen ? " pf-sex-caret--open" : ""
                        }`}
                      >
                        ▾
                      </span>
                    </button>

                    {sexOpen && (
                      <div className="pf-sex-menu">
                        {sexOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`pf-sex-item${
                              sex === option.value ? " pf-sex-item--on" : ""
                            }`}
                            onClick={() => {
                              setSex(option.value);
                              setSexOpen(false);
                            }}
                          >
                            <span className="pf-sex-item-icon">{option.icon}</span>
                            <span className="pf-sex-item-label">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="pf-hint pf-hint--slot" aria-hidden="true">
                    &nbsp;
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="pf-section pf-section--physical">
              <h2 className="pf-title">Condición física</h2>
              <p className="pf-sub">
                Esta información calcula tu IMC y ajusta la dificultad de tu
                rutina.
              </p>
              <div className="pf-grid">
                <div className="pf-field">
                  <label>Peso (kg)</label>
                  <input
                    type="number"
                    placeholder="70"
                    min={30}
                    max={300}
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                  />
                </div>
                <div className="pf-field">
                  <label>Altura (cm)</label>
                  <input
                    type="number"
                    placeholder="170"
                    min={100}
                    max={250}
                    value={height}
                    onChange={(event) => setHeight(event.target.value)}
                  />
                </div>
                {bmi !== null && bmiState && (
                  <div className="pf-field pf-field--full">
                    <div className="pf-imc">
                      <div className="pf-imc-value" style={{ color: bmiState.color }}>
                        {bmi}
                      </div>
                      <div className="pf-imc-info">
                        <span className="pf-imc-label">Índice de masa corporal</span>
                        <span className="pf-imc-cat" style={{ color: bmiState.color }}>
                          {bmiState.label}
                        </span>
                      </div>
                    </div>
                    <div className="pf-imc-bar">
                      <div className="pf-imc-seg" style={{ background: "#60a5fa" }} />
                      <div className="pf-imc-seg" style={{ background: "#32c878" }} />
                      <div className="pf-imc-seg" style={{ background: "#f0c040" }} />
                      <div className="pf-imc-seg" style={{ background: "#ff4a2b" }} />
                      <div
                        className="pf-imc-marker"
                        style={{
                          left: `${Math.min(
                            Math.max(((bmi - 15) / 25) * 100, 0),
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="pf-imc-scale">
                      <span>15</span>
                      <span>18.5</span>
                      <span>25</span>
                      <span>30</span>
                      <span>40</span>
                    </div>
                  </div>
                )}
                <div className="pf-field pf-field--full">
                  <label>Nivel de experiencia</label>
                  <div className="pf-opts">
                    {[
                      ["beginner", "Principiante", "0–6 meses"],
                      ["intermediate", "Intermedio", "6–18 meses"],
                      ["advanced", "Avanzado", "18+ meses"],
                    ].map(([value, label, subtitle]) => (
                      <button
                        key={value}
                        type="button"
                        className={`pf-opt pf-opt--tall${
                          experience === value ? " pf-opt--on" : ""
                        }`}
                        onClick={() => setExperience(value)}
                      >
                        <span className="pf-opt-title">{label}</span>
                        <span className="pf-opt-sub">{subtitle}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="pf-section pf-section--goals">
              <h2 className="pf-title">Tus objetivos</h2>
              <p className="pf-sub">
                Esta información desbloquea la generación de rutina personalizada.
              </p>
              <div className="pf-grid">
                <div className="pf-field pf-field--full">
                  <label>Objetivo principal</label>
                  <div className="pf-opts pf-opts--2">
                    {[
                      ["lose_fat", "Perder grasa", "🔥"],
                      ["gain_muscle", "Ganar músculo", "💪"],
                      ["general_fitness", "Estar activo", "⚡"],
                      ["strength", "Ganar fuerza", "🏋️"],
                      ["mobility", "Movilidad", "🧘"],
                    ].map(([value, label, icon]) => (
                      <button
                        key={value}
                        type="button"
                        className={`pf-opt pf-opt--tall${
                          goal === value ? " pf-opt--on" : ""
                        }`}
                        onClick={() => setGoal(value)}
                      >
                        <span className="pf-opt-icon">{icon}</span>
                        <span className="pf-opt-title">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pf-field">
                  <label>Días por semana</label>
                  <div className="pf-days">
                    {[2, 3, 4, 5, 6].map((day) => (
                      <button
                        key={day}
                        type="button"
                        className={`pf-day${
                          daysPerWeek === String(day) ? " pf-day--on" : ""
                        }`}
                        onClick={() => setDaysPerWeek(String(day))}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pf-field">
                  <label>Tiempo por sesión</label>
                  <select
                    value={timePerSession}
                    onChange={(event) => setTimePerSession(event.target.value)}
                  >
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

          <div className="pf-nav">
            {step > 0 && (
              <button
                className="pf-btn pf-btn--sec"
                onClick={() => setStep((current) => current - 1)}
                disabled={saving}
              >
                ← Atrás
              </button>
            )}
            {step < steps.length - 1 ? (
              <button className="pf-btn" onClick={() => validateStep() && setStep((current) => current + 1)}>
                Continuar →
              </button>
            ) : (
              <button className="pf-btn" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Guardando..." : isEdit ? "Guardar cambios ✓" : "Guardar perfil ✓"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoadError(null);
      setLoading(true);

      try {
        const data = await api.get<ProfileRecord>("/profiles/me");

        if (active) {
          setProfile(data);
        }
      } catch (error) {
        if (
          active &&
          error instanceof ApiClientError &&
          error.status === 404
        ) {
          setProfile(null);
        } else if (active) {
          console.error("Failed to load profile", error);
          setLoadError(
            error instanceof ApiClientError && error.status === 401
              ? "Tu sesi\u00f3n operativa expir\u00f3 o dej\u00f3 de ser v\u00e1lida. Inicia sesi\u00f3n nuevamente."
              : error instanceof ApiClientError && error.status === 429
                ? "La API alcanz\u00f3 temporalmente su l\u00edmite de peticiones. Espera unos segundos y vuelve a intentar."
                : error instanceof Error
                  ? error.message
                  : "No fue posible cargar tu perfil en este momento.",
          );
        } else {
          console.error("Failed to load profile", error);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const handleConfirm = async () => {
    setConfirming(true);

    try {
      const confirmed = await api.post<ProfileRecord>("/profiles/me/confirm");
      setProfile(confirmed);
      await Alert.fire({
        icon: "success",
        title: "Perfil confirmado",
        text: "Ahora ya puedes generar y regenerar rutinas.",
      });
    } catch (error) {
      await Alert.fire({
        icon: "error",
        title: "No se pudo confirmar",
        text:
          error instanceof Error
            ? error.message
            : "Revisa tu perfil e inténtalo de nuevo.",
      });
    } finally {
      setConfirming(false);
    }
  };

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
        title="No pudimos cargar tu perfil"
        description={loadError}
        primaryActionLabel="Reintentar"
        onPrimaryAction={() => setReloadKey((current) => current + 1)}
        secondaryActionLabel="Volver al inicio"
        onSecondaryAction={() => void signOut().then(() => navigate("/", { replace: true }))}
      />
    );
  }

  if (!profile || !profile.completed) {
    return (
      <ProfileForm
        existing={profile}
        onSaved={(savedProfile) => {
          setProfile(savedProfile);
          setEditing(false);
        }}
      />
    );
  }

  if (editing) {
    return (
      <ProfileForm
        existing={profile}
        onSaved={(savedProfile) => {
          setProfile(savedProfile);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <ProfileSummary
      profile={profile}
      onEdit={() => setEditing(true)}
      onConfirm={handleConfirm}
      confirming={confirming}
    />
  );
}
