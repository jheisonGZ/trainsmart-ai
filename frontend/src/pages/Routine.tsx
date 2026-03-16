import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  PlayCircle,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import RequestStateCard from "../components/RequestStateCard";
import { ApiClientError, api, clearApiClientState } from "../lib/api";
import type {
  AuthMeResponse,
  HealthHistoryRecord,
  ProfileRecord,
  Routine,
  RoutineDashboardDay,
  RoutineDashboardResponse,
  RoutineMutationResponse,
  RoutineTodayResponse,
  RoutineVersion,
  WorkoutSession,
} from "../types/api";
import "./Routine.css";

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

interface PendingReview {
  routine: Routine;
  version: RoutineVersion;
}

interface WorkoutBlock {
  id: string;
  index: number;
  title: string;
  exercises: RoutineDashboardDay["exercises"];
}

type BusyAction =
  | "generate"
  | "regenerate"
  | "approve"
  | "discard"
  | "start-session"
  | "finish-session";

type DayPreviewTone = "active" | "available" | "completed" | "next" | "blocked";

interface DayPreviewMeta {
  label: string;
  note: string;
  tone: DayPreviewTone;
}

function getOptionalResource<T>(request: Promise<T>) {
  return request.catch((error) => {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    throw error;
  });
}

function buildWorkoutBlocks(day: RoutineDashboardDay | null): WorkoutBlock[] {
  if (!day || day.exercises.length === 0) {
    return [];
  }

  const blockCount =
    day.exercises.length >= 8 ? 3 : day.exercises.length >= 4 ? 2 : 1;
  const blockSize = Math.ceil(day.exercises.length / blockCount);

  return Array.from({ length: blockCount }, (_, index) => {
    const exercises = day.exercises.slice(index * blockSize, (index + 1) * blockSize);
    const title =
      blockCount === 1 ? "Sesión del día" : `Sesión ${index + 1}`;

    return {
      id: `${day.id}-block-${index + 1}`,
      index: index + 1,
      title,
      exercises,
    };
  }).filter((block) => block.exercises.length > 0);
}

function getBlockProgressStorageKey(sessionId: string) {
  return `routine-progress:${sessionId}`;
}

function readCompletedBlocks(sessionId: string) {
  const stored = window.localStorage.getItem(getBlockProgressStorageKey(sessionId));
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function writeCompletedBlocks(sessionId: string, count: number) {
  window.localStorage.setItem(getBlockProgressStorageKey(sessionId), String(count));
}

function clearCompletedBlocks(sessionId: string) {
  window.localStorage.removeItem(getBlockProgressStorageKey(sessionId));
}

function getCompletedDayIds(sessions: WorkoutSession[]) {
  return new Set(
    sessions
      .filter((session) => Boolean(session.ended_at) && Boolean(session.routine_day_id))
      .map((session) => session.routine_day_id as string),
  );
}

function inferDayFocus(day: RoutineDashboardDay) {
  const mainExercises = day.exercises
    .slice(0, 3)
    .map((exercise) => exercise.exercise_name);

  return mainExercises.length > 0
    ? mainExercises.join(", ")
    : "Trabajo general de acondicionamiento";
}

function getDayPreviewMeta(
  day: RoutineDashboardDay,
  currentDayId: string,
  currentDayIndex: number,
  activeDaySession: WorkoutSession | null,
  completedDayIds: Set<string>,
): DayPreviewMeta {
  if (day.id === currentDayId && activeDaySession) {
    return {
      label: "En curso",
      note: "Ya comenzaste este día y estás avanzando por sus sesiones internas.",
      tone: "active",
    };
  }

  if (completedDayIds.has(day.id)) {
    return {
      label: "Completado",
      note: "Ya quedó registrado en tu historial reciente.",
      tone: "completed",
    };
  }

  if (day.id === currentDayId) {
    return {
      label: "Disponible",
      note: "Este es el día activo que puedes trabajar ahora.",
      tone: "available",
    };
  }

  if (day.day_index > currentDayIndex) {
    return {
      label: "Próximo",
      note: "Se habilita según la progresión natural de tu rutina.",
      tone: "next",
    };
  }

  return {
    label: "Bloqueado",
    note: "No está disponible para operar desde esta vista en este momento.",
    tone: "blocked",
  };
}

export default function Routine() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [authState, setAuthState] = useState<AuthMeResponse | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [health, setHealth] = useState<HealthHistoryRecord | null>(null);
  const [routineDashboard, setRoutineDashboard] =
    useState<RoutineDashboardResponse | null>(null);
  const [routineToday, setRoutineToday] = useState<RoutineTodayResponse | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [regenerateReason, setRegenerateReason] = useState("");
  const [effort, setEffort] = useState<"easy" | "moderate" | "hard">("moderate");
  const [difficulty, setDifficulty] = useState("6");
  const [painOrDiscomfort, setPainOrDiscomfort] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [previewDayId, setPreviewDayId] = useState<string | null>(null);
  const [completedBlockCount, setCompletedBlockCount] = useState(0);
  const isBusy = busyAction !== null;

  const readyToGenerate = Boolean(
    authState?.profile_completed &&
      authState.profile_confirmed &&
      authState.health_completed,
  );

  const dayBlocks = useMemo(
    () => buildWorkoutBlocks(routineToday?.today ?? null),
    [routineToday?.today],
  );
  const completedDayIds = useMemo(
    () => getCompletedDayIds(recentSessions),
    [recentSessions],
  );
  const activeDaySession =
    activeSession && routineToday && activeSession.routine_day_id === routineToday.today.id
      ? activeSession
      : null;
  const dayCompleted = Boolean(
    routineToday &&
      (routineToday.today_status === "completed" ||
        completedDayIds.has(routineToday.today.id)),
  );
  const currentBlock =
    activeDaySession && !dayCompleted && dayBlocks.length > 0
      ? dayBlocks[Math.min(completedBlockCount, dayBlocks.length - 1)]
      : null;
  const previewDay =
    routineDashboard?.days.find((day) => day.id === previewDayId) ??
    routineToday?.today ??
    null;
  const previewMeta =
    previewDay && routineToday
      ? getDayPreviewMeta(
          previewDay,
          routineToday.today.id,
          routineToday.today.day_index,
          activeDaySession,
          completedDayIds,
        )
      : null;

  useEffect(() => {
    if (!routineToday) {
      setPreviewDayId(null);
      return;
    }

    setPreviewDayId((current) => {
      if (current && routineDashboard?.days.some((day) => day.id === current)) {
        return current;
      }

      return routineToday.today.id;
    });
  }, [routineDashboard?.days, routineToday?.today.id]);

  useEffect(() => {
    if (dayCompleted) {
      setCompletedBlockCount(dayBlocks.length);
      return;
    }

    if (!activeDaySession) {
      setCompletedBlockCount(0);
      return;
    }

    const storedCount = readCompletedBlocks(activeDaySession.id);
    setCompletedBlockCount(Math.min(storedCount, Math.max(dayBlocks.length - 1, 0)));
  }, [activeDaySession?.id, dayBlocks.length, dayCompleted]);

  async function fetchRoutineSnapshot() {
    const [authMe, profileData, healthData, sessions, dashboard, today, routines] =
      await Promise.all([
        api.getFresh<AuthMeResponse>("/auth/me"),
        getOptionalResource(api.getFresh<ProfileRecord>("/profiles/me")),
        getOptionalResource(api.getFresh<HealthHistoryRecord>("/health-history/me")),
        api.getFresh<WorkoutSession[]>("/sessions/me", { limit: 10 }),
        getOptionalResource(
          api.getFresh<RoutineDashboardResponse>("/routines/current/dashboard"),
        ),
        getOptionalResource(api.getFresh<RoutineTodayResponse>("/routines/current/today")),
        api.getFresh<Routine[]>("/routines/me"),
      ]);

    let pending: PendingReview | null = null;

    for (const routine of routines) {
      const versions = await api.getFresh<RoutineVersion[]>(`/routines/${routine.id}/versions`);
      const proposed = versions.find((version) => version.approval_status === "proposed");

      if (proposed) {
        pending = { routine, version: proposed };
        break;
      }
    }

    return {
      authMe,
      profileData,
      healthData,
      sessions,
      dashboard,
      today,
      pending,
    };
  }

  useEffect(() => {
    let active = true;

    async function loadRoutinePage() {
      setLoading(true);
      setLoadError(null);

      try {
        const snapshot = await fetchRoutineSnapshot();

        if (!active) {
          return;
        }

        setAuthState(snapshot.authMe);
        setProfile(snapshot.profileData);
        setHealth(snapshot.healthData);
        setRoutineDashboard(snapshot.dashboard);
        setRoutineToday(snapshot.today);
        setPendingReview(snapshot.pending);
        setRecentSessions(snapshot.sessions);
        setActiveSession(
          snapshot.today?.active_session_id
            ? snapshot.sessions.find((session) => session.id === snapshot.today?.active_session_id) ??
                null
            : null,
        );
      } catch (error) {
        console.error("Failed to load routine page", error);

        if (active) {
          setLoadError(
            error instanceof ApiClientError && error.status === 401
              ? "Tu sesión operativa expiró o dejó de ser válida. Inicia sesión nuevamente."
              : error instanceof ApiClientError && error.status === 429
                ? "La API alcanzó temporalmente su límite de peticiones. Espera unos segundos y vuelve a intentar."
                : error instanceof Error
                  ? error.message
                  : "No fue posible cargar la experiencia de rutinas.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadRoutinePage();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const refreshRoutineData = async () => {
    const snapshot = await fetchRoutineSnapshot();
    setAuthState(snapshot.authMe);
    setProfile(snapshot.profileData);
    setHealth(snapshot.healthData);
    setRoutineDashboard(snapshot.dashboard);
    setRoutineToday(snapshot.today);
    setPendingReview(snapshot.pending);
    setRecentSessions(snapshot.sessions);
    setActiveSession(
      snapshot.today?.active_session_id
        ? snapshot.sessions.find((session) => session.id === snapshot.today?.active_session_id) ??
            null
        : null,
    );
  };

  const withBusyState = async (actionKey: BusyAction, action: () => Promise<void>) => {
    if (busyAction) {
      return;
    }

    setBusyAction(actionKey);

    try {
      await action();
    } finally {
      setBusyAction(null);
    }
  };

  const handleGenerate = async () => {
    await withBusyState("generate", async () => {
      const result = await api.post<RoutineMutationResponse>("/routines/generate", {
        customInstructions: customInstructions.trim() || undefined,
      });

      setPendingReview({ routine: result.routine, version: result.version });
      setCustomInstructions("");

      await Alert.fire({
        icon: "success",
        title: "Rutina propuesta",
        text: result.message,
      });
    });
  };

  const handleRegenerate = async () => {
    if (!routineDashboard) {
      return;
    }

    await withBusyState("regenerate", async () => {
      const result = await api.post<RoutineMutationResponse>(
        `/routines/${routineDashboard.routine.id}/regenerate`,
        {
          reason: regenerateReason.trim() || undefined,
          customInstructions: customInstructions.trim() || undefined,
        },
      );

      setPendingReview({ routine: result.routine, version: result.version });
      setRegenerateReason("");
      setCustomInstructions("");

      await Alert.fire({
        icon: "success",
        title: "Nueva versión propuesta",
        text: result.message,
      });
    });
  };

  const handleApprove = async () => {
    if (!pendingReview) {
      return;
    }

    await withBusyState("approve", async () => {
      await api.post(`/routines/versions/${pendingReview.version.id}/approve`);
      await refreshRoutineData();
      await Alert.fire({
        icon: "success",
        title: "Rutina aprobada",
        text: "La nueva versión ya quedó activa para tus próximas sesiones.",
      });
    });
  };

  const handleDiscard = async () => {
    if (!pendingReview) {
      return;
    }

    await withBusyState("discard", async () => {
      await api.post(`/routines/versions/${pendingReview.version.id}/discard`);
      await refreshRoutineData();
      await Alert.fire({
        icon: "info",
        title: "Versión descartada",
        text: "La propuesta pendiente fue descartada.",
      });
    });
  };

  const handleStartSession = async () => {
    if (!routineToday) {
      return;
    }

    if (routineToday.today_status === "completed") {
      await Alert.fire({
        icon: "info",
        title: "Este día ya fue completado",
        text: "La rutina de hoy queda disponible solo como referencia y ya no puede iniciarse de nuevo.",
      });
      return;
    }

    if (activeSession && !activeDaySession) {
      await Alert.fire({
        icon: "info",
        title: "Ya tienes otra sesión abierta",
        text: "Cierra primero la sesión activa antes de iniciar un nuevo día de rutina.",
      });
      return;
    }

    if (activeDaySession) {
      return;
    }

    await withBusyState("start-session", async () => {
      const session = await api.post<WorkoutSession>("/sessions", {
        session_date: new Date().toISOString().slice(0, 10),
        routine_version_id: routineToday.version.id,
        routine_day_id: routineToday.today.id,
        notes: "",
      });

      setActiveSession(session);
      setRecentSessions((current) => [session, ...current].slice(0, 10));
      setCompletedBlockCount(0);
      writeCompletedBlocks(session.id, 0);

      await Alert.fire({
        icon: "success",
        title: "Entrenamiento iniciado",
        text:
          dayBlocks.length > 1
            ? `Comenzaste la sesión 1 de ${dayBlocks.length} para hoy.`
            : "Ya puedes registrar tu entrenamiento de hoy.",
      });
    });
  };

  const handleAdvanceSession = async () => {
    if (!activeDaySession || !currentBlock) {
      return;
    }

    try {
      await withBusyState("finish-session", async () => {
      const nextCompletedCount = Math.min(completedBlockCount + 1, dayBlocks.length);

      if (nextCompletedCount < dayBlocks.length) {
        setCompletedBlockCount(nextCompletedCount);
        writeCompletedBlocks(activeDaySession.id, nextCompletedCount);

        await Alert.fire({
          icon: "success",
          title: `${currentBlock.title} completada`,
          text: `Continúa con la ${dayBlocks[nextCompletedCount].title.toLowerCase()} de hoy.`,
        });
        return;
      }

      await api.put<WorkoutSession>(`/sessions/${activeDaySession.id}/finish`, {
        perceived_effort: effort,
        difficulty_rating: Number(difficulty),
        pain_or_discomfort: painOrDiscomfort,
        notes: sessionNotes.trim() || undefined,
      });

      clearApiClientState();
      clearCompletedBlocks(activeDaySession.id);
      setSessionNotes("");
      setPainOrDiscomfort(false);
      setDifficulty("6");
      setEffort("moderate");
      setCompletedBlockCount(dayBlocks.length);

      await refreshRoutineData();

      await Alert.fire({
        icon: "success",
        title: "Día completado",
        text:
          dayBlocks.length > 1
            ? "Completaste la última sesión de hoy y con eso cerraste el día de entrenamiento."
            : "Completaste tu entrenamiento de hoy. Descansa y vuelve mañana para el siguiente día.",
        confirmButtonText: "Volver al dashboard",
        allowOutsideClick: false,
      });

        navigate("/home", { replace: true });
      });
    } catch (error) {
      console.error("Failed to finish workout session", error);
      await Alert.fire({
        icon: "error",
        title: "No se pudo finalizar la sesiÃ³n",
        text:
          error instanceof Error
            ? error.message
            : "La sesiÃ³n no quedÃ³ cerrada correctamente. Revisa tu conexiÃ³n o los permisos de la API y vuelve a intentarlo.",
      });
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
        title="No pudimos cargar tus rutinas"
        description={loadError}
        primaryActionLabel="Reintentar"
        onPrimaryAction={() => setReloadKey((current) => current + 1)}
      />
    );
  }

  const blockers = [
    !authState?.profile_completed ? "Completa tu perfil" : null,
    authState?.profile_completed && !authState.profile_confirmed
      ? "Confirma tu perfil"
      : null,
    !authState?.health_completed ? "Completa tu historial de salud" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="rt">
      <main className="rt-main">
        <section className="rt-hero">
          <h1>Rutina personalizada</h1>
          <p>
            {readyToGenerate
              ? "Gestiona tu rutina, revisa cambios propuestos y avanza por las sesiones del día sin perder el hilo."
              : "Todavía faltan prerrequisitos antes de habilitar la generación y la operación completa de la rutina."}
          </p>
        </section>

        {!readyToGenerate && (
          <section className="rt-grid">
            <article className="rt-card">
              <h2>
                <ClipboardList size={16} /> Estado operativo
              </h2>
              <ul>
                <li>Perfil completado: {authState?.profile_completed ? "Sí" : "No"}</li>
                <li>Perfil confirmado: {authState?.profile_confirmed ? "Sí" : "No"}</li>
                <li>Salud completada: {authState?.health_completed ? "Sí" : "No"}</li>
              </ul>
            </article>
            <article className="rt-card">
              <h2>
                <ShieldCheck size={16} /> Pasos pendientes
              </h2>
              <ul>
                {blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </article>
          </section>
        )}

        {readyToGenerate && (
          <>
            <section className="rt-grid">
              <article className="rt-card">
                <h2>
                  <Sparkles size={16} /> Generación IA
                </h2>
                <p>
                  Puedes enviar instrucciones extra para que la propuesta se adapte a tus preferencias, restricciones y estilo de entrenamiento.
                </p>
                <textarea
                  className="rt-textarea"
                  value={customInstructions}
                  onChange={(event) => setCustomInstructions(event.target.value)}
                  placeholder="Ej: prioriza ejercicios con mancuernas, evita movimientos sobre la cabeza..."
                  rows={4}
                  disabled={isBusy}
                />
                <div className="rt-actions rt-actions--start">
                  {!routineDashboard ? (
                    <button className="rt-btn" onClick={() => void handleGenerate()} disabled={isBusy}>
                      {busyAction === "generate" ? "Generando..." : "Generar rutina"}
                    </button>
                  ) : (
                    <>
                      <input
                        className="rt-input"
                        value={regenerateReason}
                        onChange={(event) => setRegenerateReason(event.target.value)}
                        placeholder="Motivo de regeneración"
                        disabled={isBusy}
                      />
                      <button className="rt-btn" onClick={() => void handleRegenerate()} disabled={isBusy}>
                        <RefreshCcw size={14} />{" "}
                        {busyAction === "regenerate" ? "Regenerando..." : "Regenerar"}
                      </button>
                    </>
                  )}
                </div>
              </article>

              <article className="rt-card">
                <h2>
                  <Calendar size={16} /> Estado actual
                </h2>
                <ul>
                  <li>Rutina activa: {routineDashboard ? routineDashboard.routine.title : "Aún no"}</li>
                  <li>Versión pendiente: {pendingReview ? `V${pendingReview.version.version_number}` : "No"}</li>
                  <li>Sesión abierta: {activeDaySession ? "Sí" : "No"}</li>
                  <li>Perfil listo: {profile?.completed ? "Sí" : "No"}</li>
                  <li>Salud lista: {health?.completed ? "Sí" : "No"}</li>
                </ul>
              </article>
            </section>

            {pendingReview && (
              <section className="rt-grid rt-grid--single">
                <article className="rt-card">
                  <h2>
                    <ShieldCheck size={16} /> Revisión HITL pendiente
                  </h2>
                  <p>{pendingReview.version.llm_output.summary}</p>
                  {pendingReview.version.llm_output.safety_warnings.length > 0 && (
                    <ul className="rt-list-spaced">
                      {pendingReview.version.llm_output.safety_warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  )}
                  <div className="rt-plan-list">
                    {pendingReview.version.llm_output.weekly_plan.map((day) => (
                      <div key={`${pendingReview.version.id}-${day.day_index}`} className="rt-plan-day">
                        <strong>
                          Día {day.day_index}: {day.day_label}
                        </strong>
                        <p>{day.warmup_notes}</p>
                        <ul>
                          {day.exercises.map((exercise) => (
                            <li key={`${day.day_index}-${exercise.exercise_name}`}>
                              {exercise.exercise_name} · {exercise.sets}x{exercise.reps}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="rt-actions">
                    <button className="rt-btn rt-btn--ghost" onClick={() => void handleDiscard()} disabled={isBusy}>
                      Descartar
                    </button>
                    <button className="rt-btn" onClick={() => void handleApprove()} disabled={isBusy}>
                      {busyAction === "approve" ? "Aprobando..." : "Aprobar versión"}
                    </button>
                  </div>
                </article>
              </section>
            )}

            {routineToday && (
              <section className="rt-grid rt-grid--single">
                <article className="rt-card">
                  <h2>
                    <Dumbbell size={16} /> Rutina activa de hoy
                  </h2>

                  <div className="rt-day-overview">
                    <div>
                      <p className="rt-day-label">
                        Día {routineToday.today.day_index}: {routineToday.today.day_label}
                      </p>
                      <p className="rt-day-copy">
                        Calentamiento: {routineToday.today.warmup_notes ?? "Sin indicaciones específicas."}
                      </p>
                    </div>
                    <span className={`rt-pill rt-pill--${dayCompleted ? "completed" : activeDaySession ? "active" : "available"}`}>
                      {dayCompleted
                        ? "Día completado"
                        : activeDaySession
                          ? `${completedBlockCount}/${dayBlocks.length} sesiones cerradas`
                          : `${dayBlocks.length} sesiones internas`}
                    </span>
                  </div>

                  <div className="rt-days">
                    {routineDashboard?.days.map((day) => {
                      const dayMeta = getDayPreviewMeta(
                        day,
                        routineToday.today.id,
                        routineToday.today.day_index,
                        activeDaySession,
                        completedDayIds,
                      );

                      return (
                        <button
                          key={day.id}
                          type="button"
                          className={`rt-day-button${day.id === previewDay?.id ? " rt-day-button--preview" : ""}${
                            day.id === routineToday.today.id ? " rt-day-button--today" : ""
                          }`}
                          onMouseEnter={() => setPreviewDayId(day.id)}
                          onFocus={() => setPreviewDayId(day.id)}
                          onClick={() => setPreviewDayId(day.id)}
                        >
                          <span>{day.day_label}</span>
                          <small>{dayMeta.label}</small>
                        </button>
                      );
                    })}
                  </div>

                  {previewDay && previewMeta && (
                    <div className="rt-day-preview">
                      <div className="rt-day-preview__head">
                        <div>
                          <strong>
                            Día {previewDay.day_index}: {previewDay.day_label}
                          </strong>
                          <p>{previewMeta.note}</p>
                        </div>
                        <span className={`rt-pill rt-pill--${previewMeta.tone}`}>
                          {previewMeta.label}
                        </span>
                      </div>

                      <div className="rt-day-preview__meta">
                        <span>Posición: {previewDay.day_index} de {routineDashboard?.days.length ?? 0}</span>
                        <span>Sesiones internas: {buildWorkoutBlocks(previewDay).length}</span>
                        <span>Ejercicios: {previewDay.exercises.length}</span>
                      </div>

                      <p className="rt-day-preview__focus">
                        Enfoque estimado: {inferDayFocus(previewDay)}
                      </p>

                      <div className="rt-day-preview__tags">
                        {previewDay.exercises.slice(0, 4).map((exercise) => (
                          <span key={`${previewDay.id}-${exercise.id}`}>{exercise.exercise_name}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rt-blocks">
                    {dayBlocks.map((block, index) => {
                      const isCompleted = dayCompleted || index < completedBlockCount;
                      const isCurrent = Boolean(
                        activeDaySession && !dayCompleted && index === completedBlockCount,
                      );
                      const isAvailable = !activeDaySession && !dayCompleted && index === 0;
                      const isLocked = !isCompleted && !isCurrent && !isAvailable;
                      const isLastBlock = index === dayBlocks.length - 1;

                      return (
                        <div
                          key={block.id}
                          className={`rt-block-card${
                            isCompleted
                              ? " rt-block-card--completed"
                              : isCurrent
                                ? " rt-block-card--current"
                                : isLocked
                                  ? " rt-block-card--locked"
                                  : " rt-block-card--available"
                          }`}
                        >
                          <div className="rt-block-card__head">
                            <div>
                              <strong>{block.title}</strong>
                              <p>{block.exercises.length} ejercicios en secuencia</p>
                            </div>
                            <span className={`rt-pill rt-pill--${isCompleted ? "completed" : isCurrent ? "active" : isAvailable ? "available" : "blocked"}`}>
                              {isCompleted
                                ? "Completada"
                                : isCurrent
                                  ? "En curso"
                                  : isAvailable
                                    ? "Lista para iniciar"
                                    : "Se habilita después"}
                            </span>
                          </div>

                          <div className="rt-exercise-list">
                            {block.exercises.map((exercise) => (
                              <div key={exercise.id} className="rt-exercise-card">
                                <strong>{exercise.exercise_name}</strong>
                                <p>
                                  {exercise.sets} series · {exercise.reps} reps · Descanso {exercise.rest_seconds ?? 0}s
                                </p>
                                {exercise.notes ? <span>{exercise.notes}</span> : null}
                              </div>
                            ))}
                          </div>

                          {isCompleted ? (
                            <div className="rt-block-note">
                              <CheckCircle2 size={15} />
                              <span>Esta sesión ya quedó completada y se mantiene visible como referencia.</span>
                            </div>
                          ) : null}

                          {isLocked ? (
                            <div className="rt-block-note">
                              <ClipboardList size={15} />
                              <span>Se habilita automáticamente cuando cierres la sesión anterior.</span>
                            </div>
                          ) : null}

                          {isAvailable ? (
                            <div className="rt-actions">
                              <button className="rt-btn" onClick={() => void handleStartSession()} disabled={isBusy}>
                                <PlayCircle size={14} />{" "}
                                {busyAction === "start-session" ? "Iniciando..." : "Iniciar entrenamiento de hoy"}
                              </button>
                            </div>
                          ) : null}

                          {isCurrent ? (
                            <div className="rt-block-current">
                              {!isLastBlock ? (
                                <>
                                  <p className="rt-block-current__copy">
                                    Al cerrar esta sesión interna se habilita inmediatamente la siguiente parte del día.
                                  </p>
                                  <div className="rt-actions">
                                    <button className="rt-btn" onClick={() => void handleAdvanceSession()} disabled={isBusy}>
                                      {busyAction === "finish-session"
                                        ? "Guardando..."
                                        : `Finalizar ${block.title.toLowerCase()}`}
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <p className="rt-block-current__copy">
                                    Esta es la última sesión del día. Al cerrarla sí se marcará el día completo.
                                  </p>
                                  <div className="rt-feedback-grid">
                                    <div className="rt-effort-group">
                                      {(["easy", "moderate", "hard"] as const).map((value) => (
                                        <button
                                          key={value}
                                          className={`rt-btn${effort === value ? "" : " rt-btn--ghost"}`}
                                          onClick={() => setEffort(value)}
                                          type="button"
                                          disabled={isBusy}
                                        >
                                          {value === "easy"
                                            ? "Fácil"
                                            : value === "moderate"
                                              ? "Moderado"
                                              : "Intenso"}
                                        </button>
                                      ))}
                                    </div>

                                    <input
                                      className="rt-input rt-input--small"
                                      value={difficulty}
                                      onChange={(event) => setDifficulty(event.target.value)}
                                      type="number"
                                      min={1}
                                      max={10}
                                      placeholder="Dificultad 1-10"
                                      disabled={isBusy}
                                    />

                                    <label className="rt-checkbox">
                                      <input
                                        type="checkbox"
                                        checked={painOrDiscomfort}
                                        onChange={(event) => setPainOrDiscomfort(event.target.checked)}
                                        disabled={isBusy}
                                      />
                                      <span>Reporté dolor o molestia</span>
                                    </label>

                                    <textarea
                                      className="rt-textarea"
                                      value={sessionNotes}
                                      onChange={(event) => setSessionNotes(event.target.value)}
                                      rows={3}
                                      placeholder="Notas finales de la sesión"
                                      disabled={isBusy}
                                    />
                                  </div>

                                  <div className="rt-actions">
                                    <button className="rt-btn" onClick={() => void handleAdvanceSession()} disabled={isBusy}>
                                      {busyAction === "finish-session"
                                        ? "Finalizando día..."
                                        : "Finalizar día de entrenamiento"}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </article>
              </section>
            )}

            {recentSessions.length > 0 && (
              <section className="rt-grid rt-grid--single">
                <article className="rt-card">
                  <h2>
                    <ClipboardList size={16} /> Sesiones recientes
                  </h2>
                  <ul>
                    {recentSessions.slice(0, 5).map((session) => (
                      <li key={session.id}>
                        {session.session_date} · {session.ended_at ? "finalizada" : "en curso"}
                      </li>
                    ))}
                  </ul>
                </article>
              </section>
            )}
          </>
        )}

        <div className="rt-actions">
          <button className="rt-btn rt-btn--ghost" onClick={() => navigate("/home", { replace: true })}>
            Volver
          </button>
          <button className="rt-btn" onClick={() => navigate("/progress", { replace: true })}>
            Ver progreso
          </button>
        </div>
      </main>
    </div>
  );
}
