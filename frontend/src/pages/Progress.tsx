import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Camera,
  CircleCheck,
  Gauge,
  TrendingUp,
} from "lucide-react";

import { api } from "../lib/api";
import type {
  BodyProgressEntry,
  MealAnalysis,
  ProgressStatsResponse,
  WorkoutSession,
} from "../types/api";
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("No fue posible leer la imagen seleccionada."));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("No fue posible leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

export default function Progress() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProgressStatsResponse | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [mealLatest, setMealLatest] = useState<MealAnalysis | null>(null);
  const [mealHistory, setMealHistory] = useState<MealAnalysis[]>([]);
  const [bodyLatest, setBodyLatest] = useState<BodyProgressEntry | null>(null);
  const [bodyHistory, setBodyHistory] = useState<BodyProgressEntry[]>([]);
  const [uploadingMeal, setUploadingMeal] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);

  async function loadProgress() {
    const [
      statsData,
      sessionsData,
      mealLatestData,
      mealHistoryData,
      bodyLatestData,
      bodyHistoryData,
    ] = await Promise.all([
      api.get<ProgressStatsResponse>("/progress/stats", { weeks: 8 }),
      api.get<WorkoutSession[]>("/sessions/me", { limit: 5 }),
      api.get<MealAnalysis | null>("/vision/nutrition/latest"),
      api.get<MealAnalysis[]>("/vision/nutrition/history", { limit: 4 }),
      api.get<BodyProgressEntry | null>("/vision/body-progress/latest"),
      api.get<BodyProgressEntry[]>("/vision/body-progress/history", { limit: 4 }),
    ]);

    setStats(statsData);
    setSessions(sessionsData);
    setMealLatest(mealLatestData);
    setMealHistory(mealHistoryData);
    setBodyLatest(bodyLatestData);
    setBodyHistory(bodyHistoryData);
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await loadProgress();
      } catch (error) {
        console.error("Failed to load progress", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  const handleMealFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    event.target.value = "";

    if (file.size > 4 * 1024 * 1024) {
      await Alert.fire({
        icon: "info",
        title: "Imagen demasiado grande",
        text: "Usa una imagen de hasta 4 MB para analizar tu comida.",
      });
      return;
    }

    setUploadingMeal(true);

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      const analysis = await api.post<MealAnalysis>("/vision/nutrition/analyze", {
        image_data_url: imageDataUrl,
        file_name: file.name,
      });

      setMealLatest(analysis);
      setMealHistory((current) => [analysis, ...current.filter((item) => item.id !== analysis.id)].slice(0, 4));

      await Alert.fire({
        icon: "success",
        title: "Comida analizada",
        text: "El analisis visual de alimentacion ya quedo guardado.",
      });
    } catch (error) {
      console.error("Failed to analyze meal", error);
      await Alert.fire({
        icon: "error",
        title: "No se pudo analizar la comida",
        text:
          error instanceof Error
            ? error.message
            : "Revisa la imagen y la configuracion del backend o Ximilar.",
      });
    } finally {
      setUploadingMeal(false);
    }
  };

  const handleBodyFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    event.target.value = "";

    if (file.size > 4 * 1024 * 1024) {
      await Alert.fire({
        icon: "info",
        title: "Imagen demasiado grande",
        text: "Usa una imagen de hasta 4 MB para registrar progreso corporal.",
      });
      return;
    }

    setUploadingBody(true);

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      const entry = await api.post<BodyProgressEntry>("/vision/body-progress/analyze", {
        image_data_url: imageDataUrl,
        file_name: file.name,
      });

      setBodyLatest(entry);
      setBodyHistory((current) => [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 4));

      await Alert.fire({
        icon: "success",
        title: "Registro visual guardado",
        text: "El seguimiento corporal ya quedo disponible como comparacion aproximada.",
      });
    } catch (error) {
      console.error("Failed to analyze body progress", error);
      await Alert.fire({
        icon: "error",
        title: "No se pudo registrar el progreso",
        text:
          error instanceof Error
            ? error.message
            : "Revisa la imagen y la configuracion del backend o Ximilar.",
      });
    } finally {
      setUploadingBody(false);
    }
  };

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
          <BarChart3 size={13} /> <span>Metricas reales</span>
        </div>
      </header>

      <main className="pg-main">
        <section className="pg-hero">
          <h1>Seguimiento de progreso</h1>
          <p>
            Estas metricas salen de tus sesiones y ejercicios guardados en el backend. Tambien puedes
            registrar fotos de comida y progreso corporal para recibir orientacion visual aproximada.
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
              Racha actual: <strong>{stats?.current_streak ?? 0}</strong> dias
            </p>
            <p>
              Consistencia semanal: <strong>{stats?.weekly_consistency ?? 0}%</strong>
            </p>
            <div className="pg-list" style={{ marginTop: 12 }}>
              {stats?.sessions_per_week.map((week) => (
                <span key={week.week}>
                  <CircleCheck size={14} /> {week.week}: {week.count} sesion(es)
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
                <li>Aun no hay suficientes ejercicios registrados.</li>
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
                  <CircleCheck size={14} /> Todavia no hay sesiones recientes
                </span>
              )}
            </div>
          </article>
        </section>

        {stats?.weight_progression.length ? (
          <section className="pg-cards" style={{ gridTemplateColumns: "1fr" }}>
            <article className="pg-card">
              <h2>
                <TrendingUp size={16} /> Progresion por ejercicio
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

        <section className="pg-vision-grid">
          <article className="pg-card">
            <h2>
              <Camera size={16} /> Analisis visual de alimentacion
            </h2>
            <p>
              Sube una foto de tu comida y recibe una lectura educativa aproximada sobre balance,
              grupos visibles y coherencia con tu objetivo.
            </p>
            <label className="pg-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(event) => void handleMealFileChange(event)}
                disabled={uploadingMeal}
              />
              <span>{uploadingMeal ? "Analizando comida..." : "Subir foto de comida"}</span>
            </label>

            {mealLatest ? (
              <div className="pg-vision-detail">
                {mealLatest.source_image_url ? (
                  <img
                    className="pg-vision-image"
                    src={mealLatest.source_image_url}
                    alt="Ultima comida analizada"
                  />
                ) : null}
                <p>{mealLatest.summary}</p>
                <div className="pg-chip-list">
                  {(mealLatest.detected_food_groups.length > 0
                    ? mealLatest.detected_food_groups
                    : ["sin grupos claros"]
                  ).map((group) => (
                    <span key={group}>{group}</span>
                  ))}
                </div>
                <p>{mealLatest.educational_feedback}</p>
                <p>{mealLatest.goal_alignment}</p>
                <div className="pg-list">
                  {mealHistory.map((item) => (
                    <span key={item.id}>
                      <CircleCheck size={14} /> {item.created_at.slice(0, 10)} ·{" "}
                      {(item.detected_food_groups[0] ?? "sin grupo claro")}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pg-list">
                <span>
                  <CircleCheck size={14} /> Aun no tienes analisis de comidas guardados
                </span>
              </div>
            )}
          </article>

          <article className="pg-card">
            <h2>
              <Camera size={16} /> Seguimiento visual del progreso corporal
            </h2>
            <p>
              Sube fotos periodicas con condiciones parecidas para guardar comparaciones visuales
              orientativas, no clinicas.
            </p>
            <label className="pg-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(event) => void handleBodyFileChange(event)}
                disabled={uploadingBody}
              />
              <span>{uploadingBody ? "Registrando progreso..." : "Subir foto corporal"}</span>
            </label>

            {bodyLatest ? (
              <div className="pg-vision-detail">
                {bodyLatest.source_image_url ? (
                  <img
                    className="pg-vision-image"
                    src={bodyLatest.source_image_url}
                    alt="Ultimo progreso corporal analizado"
                  />
                ) : null}
                <p>{bodyLatest.entry_summary}</p>
                <p>{bodyLatest.comparison_summary}</p>
                <p>{bodyLatest.comparison_notes}</p>
                <div className="pg-chip-list">
                  {(bodyLatest.body_focus_tags.length > 0
                    ? bodyLatest.body_focus_tags
                    : ["seguimiento visual general"]
                  ).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                {bodyLatest.quality_warnings.length > 0 ? (
                  <ul className="pg-inline-list">
                    {bodyLatest.quality_warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="pg-list">
                  {bodyHistory.map((item) => (
                    <span key={item.id}>
                      <CircleCheck size={14} /> {item.created_at.slice(0, 10)} ·{" "}
                      {item.person_count} persona(s)
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pg-list">
                <span>
                  <CircleCheck size={14} /> Aun no tienes registros visuales corporales
                </span>
              </div>
            )}
          </article>
        </section>

        <div className="pg-actions">
          <button className="pg-btn pg-btn--ghost" onClick={() => navigate("/home", { replace: true })}>
            Volver
          </button>
          <button className="pg-btn" onClick={() => navigate("/routine", { replace: true })}>
            Registrar sesion
          </button>
        </div>
      </main>
    </div>
  );
}
