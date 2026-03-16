import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import {
  Bot,
  Calendar,
  ChevronRight,
  Scale,
  Target,
  Zap,
} from "lucide-react";

import RequestStateCard from "../components/RequestStateCard";
import { useAuth } from "../context/AuthContext";
import { ApiClientError, api } from "../lib/api";
import type {
  AuthMeResponse,
  ProfileRecord,
  RoutineTodayResponse,
} from "../types/api";
import "./Dashboard.css";

const goalLabel: Record<string, string> = {
  lose_fat: "Perder grasa",
  gain_muscle: "Ganar músculo",
  general_fitness: "Estar activo",
  strength: "Ganar fuerza",
  mobility: "Movilidad",
};

const experienceLabel: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

const bmiCategoryLabel: Record<string, string> = {
  underweight: "Bajo peso",
  normal: "Normal",
  overweight: "Sobrepeso",
  obese: "Obesidad",
};

const isMobile = () => window.innerWidth <= 768;

export default function Dashboard() {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [authState, setAuthState] = useState<AuthMeResponse | null>(null);
  const [todayRoutine, setTodayRoutine] = useState<RoutineTodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const headerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoadError(null);
      setLoading(true);

      try {
        const authMe = await api.getFresh<AuthMeResponse>("/auth/me");
        let profileData: ProfileRecord | null = null;

        try {
          profileData = await api.getFresh<ProfileRecord>("/profiles/me");
        } catch (error) {
          if (!(error instanceof ApiClientError) || error.status !== 404) {
            throw error;
          }
        }

        let routineData: RoutineTodayResponse | null = null;

        try {
          routineData = await api.getFresh<RoutineTodayResponse>("/routines/current/today");
        } catch (error) {
          if (!(error instanceof ApiClientError) || error.status !== 404) {
            console.error("Failed to load current routine", error);
          }
        }

        if (!active) {
          return;
        }

        setAuthState(authMe);
        setProfile(profileData);
        setTodayRoutine(routineData);
      } catch (error) {
        console.error("Failed to load dashboard", error);
        if (active) {
          setLoadError(
            error instanceof ApiClientError && error.status === 429
              ? "La API alcanz\u00f3 temporalmente su l\u00edmite de peticiones. Espera unos segundos y vuelve a intentar."
              : error instanceof Error
                ? error.message
                : "No fue posible cargar tu panel en este momento.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (loading || isMobile()) {
      return;
    }

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      timeline
        .fromTo(
          headerRef.current,
          { y: -18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45 },
        )
        .fromTo(
          sectionRef.current,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45 },
          "-=0.15",
        );

      const statElements = document.querySelectorAll(".db-stat");

      if (statElements.length > 0) {
        timeline.fromTo(
          statElements,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35, stagger: 0.07 },
          "-=0.25",
        );
      }
    });

    return () => context.revert();
  }, [loading]);

  const firstName =
    profile?.name?.split(" ")[0] ??
    firebaseUser?.displayName?.split(" ")[0] ??
    "Atleta";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  if (loading) {
    return (
      <div className="db-loading">
        <div className="db-loading-inner">
          <span className="db-spin" />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <RequestStateCard
        title="No pudimos cargar tu dashboard"
        description={loadError}
        primaryActionLabel="Reintentar"
        onPrimaryAction={() => setReloadKey((current) => current + 1)}
      />
    );
  }

  const stats = profile
    ? [
        {
          icon: <Target size={18} />,
          label: "Objetivo",
          value: goalLabel[profile.goal ?? ""] ?? "Sin definir",
        },
        {
          icon: <Calendar size={18} />,
          label: "Días/semana",
          value: `${profile.days_per_week ?? "--"} días`,
        },
        {
          icon: <Zap size={18} />,
          label: "Nivel",
          value: experienceLabel[profile.experience_level ?? ""] ?? "Sin definir",
        },
        {
          icon: <Scale size={18} />,
          label: "IMC",
          value:
            profile.bmi && profile.bmi_category
              ? `${profile.bmi} · ${bmiCategoryLabel[profile.bmi_category] ?? profile.bmi_category}`
              : "Sin calcular",
        },
      ]
    : [];

  const blockers = [
    !authState?.profile_completed ? "Completa tu perfil" : null,
    !authState?.health_completed ? "Completa tu historial de salud" : null,
    authState?.profile_completed && !authState.profile_confirmed
      ? "Confirma tu perfil para habilitar la IA"
      : null,
  ].filter(Boolean) as string[];

  const emptyState = blockers.length
    ? {
        title: blockers[0],
        description:
          blockers.length > 1
            ? blockers.join(" · ")
            : "Necesitas completar este paso antes de operar la app con tu sesión Supabase.",
        buttonLabel:
          !authState?.profile_completed
            ? "Ir a perfil"
            : !authState?.health_completed
              ? "Ir a salud"
              : "Revisar perfil",
        buttonPath:
          !authState?.profile_completed
            ? "/profile"
            : !authState?.health_completed
              ? "/health"
              : "/profile",
      }
    : {
        title: "Aún no tienes una rutina aprobada",
        description:
          "Genera tu primera propuesta con IA, revísala y apruébala para ver aquí tu sesión de hoy.",
        buttonLabel: "Generar rutina",
        buttonPath: "/routine",
      };
  const isTodayCompleted = todayRoutine?.today_status === "completed";
  const isTodayInProgress = todayRoutine?.today_status === "in_progress";

  return (
    <div className="db-content">
      <div ref={headerRef} className="db-hero">
        <div>
          <p className="db-greeting">{greeting}</p>
          <h1 className="db-name">{firstName}</h1>
        </div>
        <div className="db-hero-right">
          <div className="db-desktop-avatar">
            {firebaseUser?.photoURL || profile?.avatar_url ? (
              <img
                src={firebaseUser?.photoURL ?? profile?.avatar_url ?? ""}
                alt={firstName}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{firstName[0]?.toUpperCase() ?? "A"}</span>
            )}
          </div>
          {profile?.experience_level ? (
            <div className="db-hero-badge">
              <Zap size={13} />
              {experienceLabel[profile.experience_level]}
            </div>
          ) : null}
        </div>
      </div>

      {stats.length > 0 ? (
        <div className="db-stats">
          {stats.map((stat) => (
            <div className="db-stat" key={stat.label}>
              <div className="db-stat-icon">{stat.icon}</div>
              <div className="db-stat-body">
                <span className="db-stat-label">{stat.label}</span>
                <span className="db-stat-val">{stat.value}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <section ref={sectionRef} className="db-section">
        <div className="db-section-head">
          <h2>Rutina de hoy</h2>
          <button
            type="button"
            className="db-action"
            onClick={() => navigate("/routine", { replace: true })}
          >
            Ver rutinas <ChevronRight size={14} />
          </button>
        </div>

        {!todayRoutine ? (
          <div className="db-empty">
            <div className="db-empty-icon-wrap">
              <Bot size={32} strokeWidth={1.5} />
            </div>
            <p className="db-empty-title">{emptyState.title}</p>
            <p className="db-empty-sub">{emptyState.description}</p>
            <button
              type="button"
              className="db-cta"
              onClick={() => navigate(emptyState.buttonPath, { replace: true })}
            >
              {emptyState.buttonLabel} <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                padding: 18,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#181818",
              }}
            >
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8rem" }}>
                {todayRoutine.routine.title}
              </p>
              <h3 style={{ marginTop: 6, fontSize: "1.1rem" }}>
                Día {todayRoutine.today.day_index}: {todayRoutine.today.day_label}
              </h3>
              <p style={{ marginTop: 8, color: "rgba(255,255,255,0.7)" }}>
                Calentamiento: {todayRoutine.today.warmup_notes}
              </p>
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 999,
                    padding: "7px 12px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: isTodayCompleted
                      ? "#60a5fa"
                      : isTodayInProgress
                        ? "#ff8d75"
                        : "#6ee7b7",
                    background: isTodayCompleted
                      ? "rgba(96,165,250,0.12)"
                      : isTodayInProgress
                        ? "rgba(255,74,43,0.12)"
                        : "rgba(52,211,153,0.12)",
                    border: isTodayCompleted
                      ? "1px solid rgba(96,165,250,0.24)"
                      : isTodayInProgress
                        ? "1px solid rgba(255,74,43,0.24)"
                        : "1px solid rgba(52,211,153,0.24)",
                  }}
                >
                  {isTodayCompleted
                    ? "Día completado"
                    : isTodayInProgress
                      ? "Sesión en curso"
                      : "Disponible"}
                </span>
                <span style={{ color: "rgba(255,255,255,0.62)", fontSize: "0.84rem" }}>
                  {todayRoutine.completed_day_count}/{todayRoutine.total_day_count} días completados
                </span>
              </div>
              {isTodayCompleted ? (
                <p style={{ marginTop: 12, color: "rgba(255,255,255,0.72)" }}>
                  Ya terminaste este día. Aquí queda visible como referencia, pero ya no está pendiente ni se puede volver a cerrar.
                </p>
              ) : null}
              {todayRoutine.next_day ? (
                <p style={{ marginTop: 10, color: "rgba(255,255,255,0.58)" }}>
                  Próximo día del plan: Día {todayRoutine.next_day.day_index} · {todayRoutine.next_day.day_label}
                </p>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {todayRoutine.today.exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "#101010",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div>
                    <strong>{exercise.exercise_name}</strong>
                    <p
                      style={{
                        marginTop: 4,
                        color: "rgba(255,255,255,0.62)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {exercise.sets} series · {exercise.reps} reps · Descanso{" "}
                      {exercise.rest_seconds ?? 0}s
                    </p>
                  </div>
                  <button
                    type="button"
                    className="db-action"
                    onClick={() => navigate("/routine", { replace: true })}
                    disabled={isTodayCompleted}
                    style={isTodayCompleted ? { opacity: 0.7, cursor: "default" } : undefined}
                  >
                    {isTodayCompleted ? "Completado" : "Abrir"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
