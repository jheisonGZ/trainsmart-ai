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

import BodyCaptureCamera from "../components/BodyCaptureCamera";
import { api } from "../lib/api";
import type {
  BodyCategoryKey,
  BodyCategoryTrend,
  BodyChangeLevel,
  BodyProgressEntry,
  FoodGroupAssessment,
  FoodGroupKey,
  MealAnalysis,
  ProgressStatsResponse,
  WorkoutSession,
} from "../types/api";
import "./Progress.css";

const FOOD_CATEGORY_ORDER: FoodGroupKey[] = ["proteina", "carbohidratos", "vegetales", "fruta", "grasas"];

const FOOD_CATEGORY_LABELS: Record<FoodGroupKey, string> = {
  proteina: "Proteinas",
  carbohidratos: "Carbohidratos",
  vegetales: "Verduras",
  fruta: "Frutas",
  grasas: "Grasas saludables",
};

const CATEGORY_ASSESSMENT_LABELS: Record<FoodGroupAssessment, string> = {
  excelente: "Excelente",
  adecuado: "Adecuado",
  escaso: "Escaso",
  no_identificable: "No identificable",
};

const BODY_CATEGORY_ORDER: BodyCategoryKey[] = [
  "definicion_muscular",
  "volumen_muscular",
  "abdomen",
  "brazos",
  "hombros",
  "pecho",
  "espalda",
  "piernas",
  "postura",
  "simetria",
];

const BODY_CATEGORY_LABELS: Record<BodyCategoryKey, string> = {
  definicion_muscular: "Definicion muscular",
  volumen_muscular: "Volumen muscular",
  abdomen: "Abdomen",
  brazos: "Brazos",
  hombros: "Hombros",
  pecho: "Pecho",
  espalda: "Espalda",
  piernas: "Piernas",
  postura: "Postura",
  simetria: "Simetria corporal",
};

const BODY_TREND_LABELS: Record<BodyCategoryTrend, string> = {
  incremento: "Aumento notable",
  incremento_leve: "Aumento leve",
  reduccion: "Reduccion notable",
  reduccion_leve: "Reduccion leve",
  sin_cambio: "Sin cambio",
  no_visible: "No visible",
};

const MAX_WEEK_CHART_BARS = 16;

const BODY_CHANGE_LEVEL_LABELS: Record<BodyChangeLevel, string> = {
  leve: "leve",
  moderado: "moderado",
  alto: "alto",
};

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
  const [bodyLatest, setBodyLatest] = useState<BodyProgressEntry | null>(null);
  const [uploadingMeal, setUploadingMeal] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);
  const [reanalyzingBody, setReanalyzingBody] = useState(false);
  const [showBodyCamera, setShowBodyCamera] = useState(false);

  async function loadProgress() {
    const [statsData, sessionsData, mealLatestData, bodyLatestData] = await Promise.all([
      api.get<ProgressStatsResponse>("/progress/stats", { weeks: 8 }),
      api.get<WorkoutSession[]>("/sessions/me", { limit: 5 }),
      api.get<MealAnalysis | null>("/vision/nutrition/latest"),
      api.get<BodyProgressEntry | null>("/vision/body-progress/latest"),
    ]);

    setStats(statsData);
    setSessions(sessionsData);
    setMealLatest(mealLatestData);
    setBodyLatest(bodyLatestData);
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

  const submitBodyPhoto = async (imageDataUrl: string, fileName: string) => {
    setUploadingBody(true);

    try {
      const entry = await api.post<BodyProgressEntry>("/vision/body-progress/analyze", {
        image_data_url: imageDataUrl,
        file_name: fileName,
      });

      setBodyLatest(entry);

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

    const imageDataUrl = await readFileAsDataUrl(file);
    await submitBodyPhoto(imageDataUrl, file.name);
  };

  const handleCameraCapture = async (dataUrl: string) => {
    setShowBodyCamera(false);
    await submitBodyPhoto(dataUrl, "foto-guiada.jpg");
  };

  const handleReanalyzeBody = async () => {
    setReanalyzingBody(true);

    try {
      const entry = await api.post<BodyProgressEntry>("/vision/body-progress/reanalyze", {});

      setBodyLatest(entry);

      await Alert.fire({
        icon: "success",
        title: "Comparacion actualizada",
        text: "Se volvio a comparar tu registro con el anterior.",
      });
    } catch (error) {
      console.error("Failed to reanalyze body progress", error);
      await Alert.fire({
        icon: "error",
        title: "No se pudo volver a analizar",
        text: error instanceof Error ? error.message : "Intenta de nuevo en unos minutos.",
      });
    } finally {
      setReanalyzingBody(false);
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
            {stats?.sessions_per_week.length ? (
              (() => {
                const visibleWeeks = stats.sessions_per_week.slice(-MAX_WEEK_CHART_BARS);
                const maxCount = Math.max(1, ...visibleWeeks.map((w) => w.count));

                return (
                  <div className="pg-week-chart">
                    {visibleWeeks.map((week) => {
                      const heightPct = Math.max(8, (week.count / maxCount) * 100);
                      return (
                        <div key={week.week} className="pg-week-bar" title={`${week.week}: ${week.count} sesion(es)`}>
                          <div className="pg-week-bar-track">
                            <span className="pg-week-bar-count">{week.count}</span>
                            <div className="pg-week-bar-fill" style={{ height: `${heightPct}%` }} />
                          </div>
                          <span className="pg-week-bar-label">{week.week.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : null}
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

                {typeof mealLatest.balance_score === "number" ? (
                  <div className="pg-score">
                    <div className="pg-score-row">
                      <span>Balance visual del plato</span>
                      <strong>{mealLatest.balance_score.toFixed(1)} / 10</strong>
                    </div>
                    <div className="pg-score-bar">
                      <div
                        className="pg-score-bar-fill"
                        style={{ width: `${(mealLatest.balance_score / 10) * 100}%` }}
                      />
                    </div>
                    {mealLatest.balance_score_note ? (
                      <span className="pg-score-note">{mealLatest.balance_score_note}</span>
                    ) : null}
                  </div>
                ) : null}

                <p>{mealLatest.balance_assessment ?? "Balance visual no disponible."}</p>

                {mealLatest.category_assessment ? (
                  <div className="pg-category-grid">
                    {FOOD_CATEGORY_ORDER.map((key) => {
                      const value = mealLatest.category_assessment?.[key];
                      return (
                        <div key={key} className={`pg-category ${value ? `pg-category--${value}` : ""}`}>
                          <span className="pg-category-label">{FOOD_CATEGORY_LABELS[key]}</span>
                          <span className="pg-category-value">
                            {value ? CATEGORY_ASSESSMENT_LABELS[value] : "No identificable"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {mealLatest.recommendations?.length ? (
                  <div className="pg-recommendations">
                    <span className="pg-recommendations-title">Recomendaciones</span>
                    <ul className="pg-inline-list">
                      {mealLatest.recommendations.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {mealLatest.uncertainty_notes?.length ? (
                  <div className="pg-uncertainty">
                    {mealLatest.uncertainty_notes.map((note, index) => (
                      <p key={index}>{note}</p>
                    ))}
                  </div>
                ) : null}

                {mealLatest.disclaimer ? (
                  <p className="pg-disclaimer">{mealLatest.disclaimer}</p>
                ) : null}
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
            <div className="pg-upload-row">
              <label className="pg-upload">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(event) => void handleBodyFileChange(event)}
                  disabled={uploadingBody}
                />
                <span>{uploadingBody ? "Registrando progreso..." : "Subir foto corporal"}</span>
              </label>

              <button
                type="button"
                className="pg-btn pg-btn--ghost"
                onClick={() => setShowBodyCamera(true)}
                disabled={uploadingBody}
              >
                Tomar foto guiada
              </button>

              {bodyLatest?.compared_to_entry_id ? (
                <button
                  type="button"
                  className="pg-btn pg-btn--ghost"
                  onClick={() => void handleReanalyzeBody()}
                  disabled={reanalyzingBody}
                >
                  {reanalyzingBody ? "Analizando de nuevo..." : "Analizar nuevamente"}
                </button>
              ) : null}
            </div>

            {bodyLatest ? (
              <div className="pg-vision-detail">
                {bodyLatest.compared_to_image_url ? (
                  <div className="pg-compare-grid">
                    <div className="pg-compare-item">
                      <span className="pg-compare-label">Anterior</span>
                      <img
                        className="pg-vision-image pg-vision-image--compare"
                        src={bodyLatest.compared_to_image_url}
                        alt="Registro corporal anterior"
                      />
                    </div>
                    <div className="pg-compare-item">
                      <span className="pg-compare-label">Actual</span>
                      {bodyLatest.source_image_url ? (
                        <img
                          className="pg-vision-image pg-vision-image--compare"
                          src={bodyLatest.source_image_url}
                          alt="Ultimo progreso corporal analizado"
                        />
                      ) : null}
                    </div>
                  </div>
                ) : bodyLatest.source_image_url ? (
                  <img
                    className="pg-vision-image"
                    src={bodyLatest.source_image_url}
                    alt="Ultimo progreso corporal analizado"
                  />
                ) : null}

                <p>{bodyLatest.progress_summary}</p>

                {bodyLatest.is_baseline ? (
                  <div className="pg-chip-list">
                    <span>Punto de referencia inicial</span>
                  </div>
                ) : (
                  <>
                    {bodyLatest.overall_change_level ? (
                      <div className="pg-chip-list">
                        <span className={`pg-change-badge pg-change-badge--${bodyLatest.overall_change_level}`}>
                          Cambio {BODY_CHANGE_LEVEL_LABELS[bodyLatest.overall_change_level]}
                        </span>
                        {bodyLatest.comparison_method ? (
                          <span className="pg-score-note">
                            {bodyLatest.comparison_method === "vision_llm"
                              ? "Analisis por IA de vision"
                              : "Analisis aproximado por etiquetas (respaldo)"}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {bodyLatest.category_comparison ? (
                      <div className="pg-category-grid">
                        {BODY_CATEGORY_ORDER.map((key) => {
                          const comparison = bodyLatest.category_comparison?.[key];
                          if (!comparison) return null;
                          return (
                            <div
                              key={key}
                              className={`pg-category ${
                                comparison.visible ? `pg-category--trend-${comparison.trend}` : "pg-category--no_identificable"
                              }`}
                            >
                              <span className="pg-category-label">{BODY_CATEGORY_LABELS[key]}</span>
                              <span className="pg-category-value">
                                {comparison.visible ? BODY_TREND_LABELS[comparison.trend] : "No visible"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {bodyLatest.observations?.length ? (
                      <div className="pg-recommendations">
                        <span className="pg-recommendations-title">Cambios detectados</span>
                        <ul className="pg-inline-list">
                          {bodyLatest.observations.map((observation, index) => (
                            <li key={index}>{observation}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {bodyLatest.reliability_warning ? (
                      <div className="pg-uncertainty">
                        <p>{bodyLatest.reliability_warning}</p>
                      </div>
                    ) : null}
                  </>
                )}

                {bodyLatest.next_capture_recommendations?.length ? (
                  <div className="pg-recommendations">
                    <span className="pg-recommendations-title">Para tu proxima foto</span>
                    <ul className="pg-inline-list">
                      {bodyLatest.next_capture_recommendations.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {bodyLatest.measurement_disclaimer ? (
                  <p className="pg-disclaimer">{bodyLatest.measurement_disclaimer}</p>
                ) : null}
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

      {showBodyCamera ? (
        <BodyCaptureCamera
          referenceImageUrl={bodyLatest?.source_image_url ?? null}
          onCapture={(dataUrl) => void handleCameraCapture(dataUrl)}
          onClose={() => setShowBodyCamera(false)}
        />
      ) : null}
    </div>
  );
}
