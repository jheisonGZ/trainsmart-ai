import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CircleCheck,
  Gauge,
  TrendingUp,
} from "lucide-react";

import { api } from "../lib/api";
import type { ProgressStatsResponse, WorkoutSession } from "../types/api";
import "./Progress.css";

export default function Progress() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProgressStatsResponse | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useEffect(() => {
    let active = true;

    async function loadProgress() {
      try {
        const [statsData, sessionsData] = await Promise.all([
          api.get<ProgressStatsResponse>("/progress/stats", { weeks: 8 }),
          api.get<WorkoutSession[]>("/sessions/me", { limit: 5 }),
        ]);

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
  }, []);

  if (loading) {
    return (
      <div className="ts-loading">
        <span className="ts-spin" />
      </div>
    );
  }

  return (
    <div className="pg">
      <header className="pg-header">
        <button className="pg-back" onClick={() => navigate("/home", { replace: true })}>
          <ArrowLeft size={15} /> <span>Dashboard</span>
        </button>
        <div className="pg-logo">
          Train<span>Smart</span> <em>AI</em>
        </div>
        <div className="pg-badge">
          <BarChart3 size={13} /> <span>Métricas reales</span>
        </div>
      </header>

      <main className="pg-main">
        <section className="pg-hero">
          <h1>Seguimiento de progreso</h1>
          <p>
            Estas métricas salen de tus sesiones y ejercicios guardados en el backend.
          </p>
        </section>

        <section className="pg-cards">
          <article className="pg-card">
            <h2>
              <TrendingUp size={16} /> Tendencia de consistencia
            </h2>
            <p>
              Sesiones totales: <strong>{stats?.total_sessions ?? 0}</strong>
            </p>
            <p>
              Racha actual: <strong>{stats?.current_streak ?? 0}</strong> días
            </p>
            <p>
              Consistencia semanal: <strong>{stats?.weekly_consistency ?? 0}%</strong>
            </p>
            <div className="pg-list" style={{ marginTop: 12 }}>
              {stats?.sessions_per_week.map((week) => (
                <span key={week.week}>
                  <CircleCheck size={14} /> {week.week}: {week.count} sesión(es)
                </span>
              ))}
            </div>
          </article>

          <article className="pg-card">
            <h2>
              <Gauge size={16} /> Indicadores clave
            </h2>
            <ul>
              {stats?.top_exercises.length ? (
                stats.top_exercises.slice(0, 5).map((exercise) => (
                  <li key={exercise.exercise_name}>
                    {exercise.exercise_name}: {exercise.count} registros
                  </li>
                ))
              ) : (
                <li>Aún no hay suficientes ejercicios registrados.</li>
              )}
            </ul>
          </article>

          <article className="pg-card">
            <h2>
              <CalendarDays size={16} /> Historial reciente
            </h2>
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

        {stats?.weight_progression.length ? (
          <section className="pg-cards" style={{ gridTemplateColumns: "1fr" }}>
            <article className="pg-card">
              <h2>
                <TrendingUp size={16} /> Progresión por ejercicio
              </h2>
              <div className="pg-list">
                {stats.weight_progression.map((exercise) => (
                  <span key={exercise.exercise_name}>
                    <CircleCheck size={14} /> {exercise.exercise_name}:{" "}
                    {exercise.data[0]?.weight}kg →{" "}
                    {exercise.data[exercise.data.length - 1]?.weight}kg
                  </span>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        <div className="pg-actions">
          <button className="pg-btn pg-btn--ghost" onClick={() => navigate("/home", { replace: true })}>
            Volver
          </button>
          <button className="pg-btn" onClick={() => navigate("/routine", { replace: true })}>
            Registrar sesión
          </button>
        </div>
      </main>
    </div>
  );
}
