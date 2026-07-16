import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CircleCheck,
  Flame,
  Trash2,
  TrendingUp,
} from "lucide-react";

import BarChart from "../components/charts/BarChart";
import Meter from "../components/charts/Meter";
import Sparkline from "../components/charts/Sparkline";
import StatTile from "../components/charts/StatTile";
import { useExerciseGifUrl } from "../components/ExerciseGif";
import { ApiClientError, api } from "../lib/api";
import type { ProgressStatsResponse, WorkoutSession } from "../types/api";
import "./Progress.css";

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

interface ExerciseSpotlightData {
  name: string;
  count?: number;
  weights?: number[];
}

function ExerciseSpotlightCard({
  exercise,
  onUnavailable,
}: {
  exercise: ExerciseSpotlightData;
  onUnavailable: (name: string) => void;
}) {
  const { gifUrl, loading } = useExerciseGifUrl(exercise.name);
  const [imgFailed, setImgFailed] = useState(false);
  const unavailable = !loading && (!gifUrl || imgFailed);

  useEffect(() => {
    if (unavailable) {
      onUnavailable(exercise.name);
    }
  }, [unavailable, exercise.name, onUnavailable]);

  if (loading) {
    return (
      <div className="pg-spotlight">
        <div className="exercise-gif exercise-gif--loading exercise-gif--lg" />
      </div>
    );
  }

  if (unavailable) {
    return null;
  }

  const weights = exercise.weights ?? [];
  const delta =
    weights.length > 1 ? weights[weights.length - 1] - weights[0] : null;

  return (
    <div className="pg-spotlight">
      <div className="exercise-gif exercise-gif--lg">
        <img
          src={gifUrl ?? undefined}
          alt={exercise.name}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </div>
      <div className="pg-spotlight__body">
        <strong title={exercise.name}>{exercise.name}</strong>
        <span className="pg-spotlight__meta">
          {exercise.count ? `${exercise.count}×` : null}
          {exercise.count && delta !== null ? " · " : null}
          {delta !== null ? (
            <strong className="pg-spotlight__delta">
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}kg
            </strong>
          ) : null}
        </span>
        {weights.length > 1 ? (
          <div className="pg-spotlight__spark">
            <Sparkline data={weights} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Progress() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProgressStatsResponse | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [clearingSessions, setClearingSessions] = useState(false);
  const [hiddenExerciseNames, setHiddenExerciseNames] = useState<Set<string>>(
    new Set(),
  );

  const handleExerciseUnavailable = useCallback((name: string) => {
    setHiddenExerciseNames((current) => {
      if (current.has(name)) {
        return current;
      }

      const next = new Set(current);
      next.add(name);
      return next;
    });
  }, []);

  // Única fuente de recarga: la usan el montaje y el borrado de historial.
  const reloadData = useCallback(async () => {
    const [statsData, sessionsData] = await Promise.all([
      api.get<ProgressStatsResponse>("/progress/stats", { weeks: 8 }),
      api.get<WorkoutSession[]>("/sessions/me", { limit: 5 }),
    ]);

    return { statsData, sessionsData };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProgress() {
      try {
        const { statsData, sessionsData } = await reloadData();

        if (!active) {
          return;
        }

        setStats(statsData);
        setSessions(sessionsData);
      } catch (error) {
        console.error("Failed to load progress", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProgress();

    return () => {
      active = false;
    };
  }, [reloadData]);

  const handleClearSessions = async () => {
    if (sessions.length === 0 || clearingSessions) {
      return;
    }

    const confirmation = await Alert.fire({
      icon: "warning",
      title: "¿Borrar historial de sesiones?",
      text: "Se eliminarán todas tus sesiones de entrenamiento registradas. Esta acción no se puede deshacer.",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    setClearingSessions(true);

    try {
      await api.delete("/sessions/me");

      const { statsData, sessionsData } = await reloadData();
      setStats(statsData);
      setSessions(sessionsData);

      await Alert.fire({
        icon: "success",
        title: "Historial borrado",
        text: "Se eliminaron todas tus sesiones de entrenamiento.",
      });
    } catch (error) {
      console.error("Failed to clear session history", error);
      await Alert.fire({
        icon: "error",
        title: "No se pudo borrar el historial",
        text:
          error instanceof ApiClientError
            ? error.message
            : "Intenta de nuevo en unos segundos.",
      });
    } finally {
      setClearingSessions(false);
    }
  };

  if (loading) {
    return (
      <div className="ts-loading">
        <span className="ts-spin" />
      </div>
    );
  }

  const weekBars = (stats?.sessions_per_week ?? []).map((week) => ({
    label: week.week.slice(5).replace("-", "/"),
    value: week.count,
  }));

  const exerciseSpotlights = (() => {
    const merged = new Map<string, ExerciseSpotlightData>();

    for (const exercise of stats?.top_exercises ?? []) {
      merged.set(exercise.exercise_name, {
        name: exercise.exercise_name,
        count: exercise.count,
      });
    }

    for (const exercise of stats?.weight_progression ?? []) {
      const weights = exercise.data.map((point) => point.weight);
      const existing = merged.get(exercise.exercise_name);
      if (existing) {
        existing.weights = weights;
      } else {
        merged.set(exercise.exercise_name, {
          name: exercise.exercise_name,
          weights,
        });
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 6);
  })();

  const hasExercises =
    exerciseSpotlights.length > 0 &&
    hiddenExerciseNames.size < exerciseSpotlights.length;

  return (
    <div className="pg">
      <header className="pg-header">
        <div className="pg-header__left">
          <button
            className="pg-back"
            onClick={() => navigate("/home", { replace: true })}
          >
            <ArrowLeft size={15} /> <span>Dashboard</span>
          </button>
          <div className="pg-logo">
            Train<span>Smart</span> <em>AI</em>
          </div>
        </div>

        <div className="pg-header__title">
          <h1>Seguimiento de progreso</h1>
        </div>

        <div className="pg-badge">
          <BarChart3 size={13} /> <span>Métricas reales</span>
        </div>
      </header>

      <main className="pg-main">
        {/* ── Fila 1: KPIs compactos ── */}
        <section className="pg-kpis">
          <article className="pg-card pg-kpi">
            <StatTile
              label="Sesiones totales"
              value={String(stats?.total_sessions ?? 0)}
            />
          </article>
          <article className="pg-card pg-kpi">
            <StatTile
              label="Racha actual"
              value={String(stats?.current_streak ?? 0)}
              sublabel="días seguidos"
            />
          </article>
          <article className="pg-card pg-kpi pg-kpi--meter">
            <Meter
              value={stats?.weekly_consistency ?? 0}
              label="Consistencia semanal"
            />
          </article>
        </section>

        {/* ── Fila 2 (PROTAGONISTA): ejercicios con imágenes de la API.
              Absorbe todo el alto sobrante del viewport ── */}
        {hasExercises ? (
          <section className="pg-card pg-exercises">
            <h2>
              <Flame size={16} /> Tus ejercicios
            </h2>
            <div className="pg-spotlight-grid">
              {exerciseSpotlights.map((exercise) => (
                <ExerciseSpotlightCard
                  key={exercise.name}
                  exercise={exercise}
                  onUnavailable={handleExerciseUnavailable}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Fila 3: gráfica + historial, compactos y de altura fija ── */}
        <section className="pg-grid">
          <article className="pg-card pg-card--fill">
            <h2>
              <TrendingUp size={16} /> Sesiones por semana
            </h2>
            <div className="pg-chart-wrap">
              {weekBars.length > 0 ? (
                <BarChart data={weekBars} />
              ) : (
                <p className="pg-empty-copy">
                  Aún no hay sesiones registradas en este rango.
                </p>
              )}
            </div>
          </article>

          <article className="pg-card pg-card--fill">
            <div className="pg-card-head">
              <h2>
                <CalendarDays size={16} /> Historial reciente
              </h2>
              {sessions.length > 0 && (
                <button
                  type="button"
                  className="pg-history-clear"
                  onClick={() => void handleClearSessions()}
                  disabled={clearingSessions}
                  aria-label="Borrar historial de sesiones"
                  title="Borrar historial de sesiones"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <div className="pg-list">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <span key={session.id}>
                    <CircleCheck size={14} /> {session.session_date} ·{" "}
                    {session.ended_at ? "finalizada" : "en curso"}
                  </span>
                ))
              ) : (
                <span>
                  <CircleCheck size={14} /> Todavía no hay sesiones recientes
                </span>
              )}
            </div>
          </article>
        </section>

        {/* ── Fila 4: acciones siempre visibles ── */}
        <div className="pg-actions">
          <button
            className="pg-btn pg-btn--ghost"
            onClick={() => navigate("/home", { replace: true })}
          >
            Volver
          </button>
          <button
            className="pg-btn"
            onClick={() => navigate("/routine", { replace: true })}
          >
            Registrar sesión
          </button>
        </div>
      </main>
    </div>
  );
}