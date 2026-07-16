import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  Dumbbell,
  PersonStanding,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react";

import { useExerciseGifUrl } from "../components/ExerciseGif";
import { ApiClientError, api } from "../lib/api";
import type {
  BodyProgressAnalysis,
  EnvironmentAnalysis,
  MealAnalysis,
} from "../types/api";
import "./VisualAnalysis.css";

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

type Category = "meal" | "body" | "environment";

interface AnalysisRecord {
  id: string;
  created_at: string;
  image_url?: string;
}

interface SectionConfig<T extends AnalysisRecord> {
  apiPath: string;
  title: string;
  description: string;
  icon: ReactNode;
  renderResult: (record: T, compact?: boolean) => ReactNode;
}

function AnalysisSection<T extends AnalysisRecord>({
  config,
}: {
  config: SectionConfig<T>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<T | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<T[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [clearingHistory, setClearingHistory] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingHistory(true);

    api
      .get<T[]>(config.apiPath)
      .then((records) => {
        if (active) {
          setHistory(records);
        }
      })
      .catch((historyError) => {
        console.error(`Failed to load ${config.apiPath} history`, historyError);
      })
      .finally(() => {
        if (active) {
          setLoadingHistory(false);
        }
      });

    return () => {
      active = false;
    };
  }, [config.apiPath]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setError(null);
    setPreview(URL.createObjectURL(file));
  };

  const handleClearHistory = async () => {
    if (history.length === 0 || clearingHistory) {
      return;
    }

    const confirmation = await Alert.fire({
      icon: "warning",
      title: "¿Borrar historial?",
      text: "Se eliminarán todos los análisis de esta categoría junto con sus imágenes. Esta acción no se puede deshacer.",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    setClearingHistory(true);

    try {
      await api.delete(config.apiPath);
      setHistory([]);
      await Alert.fire({
        icon: "success",
        title: "Historial borrado",
        text: "Se eliminaron todos los análisis de esta categoría.",
      });
    } catch (clearError) {
      console.error(`Failed to clear ${config.apiPath} history`, clearError);
      await Alert.fire({
        icon: "error",
        title: "No se pudo borrar el historial",
        text:
          clearError instanceof ApiClientError
            ? clearError.message
            : "Intenta de nuevo en unos segundos.",
      });
    } finally {
      setClearingHistory(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const result = await api.post<T>(config.apiPath, formData);
      setLatestResult(result);
      setHistory((current) => [result, ...current]);
      setSelectedFile(null);
      setPreview(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (analyzeError) {
      setError(
        analyzeError instanceof ApiClientError
          ? analyzeError.message
          : "No se pudo analizar la imagen. Intenta de nuevo.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="va-section">
      <div className="va-section-intro">
        <h2>
          {config.icon} {config.title}
        </h2>
        <p>{config.description}</p>
      </div>

      <div className="va-upload">
        <label className="va-upload-box">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            hidden
          />
          {preview ? (
            <img src={preview} alt="Vista previa" className="va-preview" />
          ) : (
            <div className="va-upload-placeholder">
              <Camera size={22} />
              <span>Elegir foto</span>
            </div>
          )}
        </label>

        <button
          className="va-btn"
          disabled={!selectedFile || analyzing}
          onClick={() => void handleAnalyze()}
        >
          {analyzing ? (
            <>
              <span className="va-spin" /> Analizando...
            </>
          ) : (
            <>
              <Sparkles size={15} /> Analizar con IA
            </>
          )}
        </button>
      </div>

      {error && <p className="va-error">{error}</p>}

      {latestResult && (
        <div className="va-result">{config.renderResult(latestResult)}</div>
      )}

      <div className="va-history">
        <div className="va-history-head">
          <button
            type="button"
            className="va-history-toggle"
            onClick={() => setHistoryOpen((current) => !current)}
          >
            <ChevronDown
              size={16}
              className={`va-history-chevron${historyOpen ? " va-history-chevron--open" : ""}`}
            />
            <span>Historial{history.length > 0 ? ` (${history.length})` : ""}</span>
          </button>

          {history.length > 0 && (
            <button
              type="button"
              className="va-history-clear"
              onClick={() => void handleClearHistory()}
              disabled={clearingHistory}
              aria-label="Borrar historial"
              title="Borrar historial"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {historyOpen && (
          <div className="va-history-content">
            {loadingHistory ? (
              <p className="va-muted">Cargando historial...</p>
            ) : history.length === 0 ? (
              <p className="va-muted">Aún no tienes análisis en esta categoría.</p>
            ) : (
              <div className="va-history-list">
                {history.map((record) => (
                  <div key={record.id} className="va-history-item">
                    {record.image_url && (
                      <img src={record.image_url} alt="" className="va-history-thumb" />
                    )}
                    <div className="va-history-body">
                      {config.renderResult(record, true)}
                      <span className="va-history-date">
                        {new Date(record.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const mealConfig: SectionConfig<MealAnalysis> = {
  apiPath: "/meal-images",
  title: "Comida",
  description: "Sube una foto de tu plato y detecta el alimento y sus calorías/macros estimados.",
  icon: <Utensils size={18} />,
  renderResult: (record) => (
    <div className="va-result-body">
      <strong>{record.food_names.length > 0 ? record.food_names.join(", ") : "Alimento no identificado"}</strong>
      <div className="va-macro-row">
        {record.calories !== null && <span>{Math.round(record.calories)} kcal</span>}
        {record.protein_g !== null && <span>{Math.round(record.protein_g)}g prot</span>}
        {record.carbs_g !== null && <span>{Math.round(record.carbs_g)}g carbs</span>}
        {record.fat_g !== null && <span>{Math.round(record.fat_g)}g grasa</span>}
      </div>
    </div>
  ),
};

const bodyConfig: SectionConfig<BodyProgressAnalysis> = {
  apiPath: "/body-progress-images",
  title: "Progreso corporal",
  description: "Sube una foto de tu cuerpo y recibe una lectura cualitativa de tu composición y postura.",
  icon: <PersonStanding size={18} />,
  renderResult: (record) => <p className="va-result-text">{record.analysis_text}</p>,
};

function EquipmentGifCard({
  name,
  compact,
  onUnavailable,
}: {
  name: string;
  compact?: boolean;
  onUnavailable: (name: string) => void;
}) {
  const { gifUrl, loading } = useExerciseGifUrl(name);
  const [imgFailed, setImgFailed] = useState(false);
  const unavailable = !loading && (!gifUrl || imgFailed);
  const sizeClass = compact ? "" : " exercise-gif--lg";

  useEffect(() => {
    if (unavailable) {
      onUnavailable(name);
    }
  }, [unavailable, name, onUnavailable]);

  if (loading) {
    return (
      <div className="va-equipment-card">
        <div className={`exercise-gif exercise-gif--loading${sizeClass}`} />
      </div>
    );
  }

  if (unavailable) {
    return null;
  }

  return (
    <div className="va-equipment-card">
      <div className={`exercise-gif${sizeClass}`}>
        <img
          src={gifUrl ?? undefined}
          alt={name}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </div>
      <span>{name}</span>
    </div>
  );
}

function EquipmentGrid({ items, compact }: { items: string[]; compact?: boolean }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const handleUnavailable = useCallback((name: string) => {
    setHidden((current) => {
      if (current.has(name)) {
        return current;
      }

      const next = new Set(current);
      next.add(name);
      return next;
    });
  }, []);

  if (hidden.size >= items.length) {
    return null;
  }

  return (
    <div className={`va-equipment-grid${compact ? " va-equipment-grid--compact" : ""}`}>
      {items.map((item) => (
        <EquipmentGifCard
          key={item}
          name={item}
          compact={compact}
          onUnavailable={handleUnavailable}
        />
      ))}
    </div>
  );
}

const environmentConfig: SectionConfig<EnvironmentAnalysis> = {
  apiPath: "/environment-images",
  title: "Entorno de entrenamiento",
  description: "Sube una foto de tu gimnasio o espacio de entrenamiento y detecta qué equipo tienes disponible.",
  icon: <Dumbbell size={18} />,
  renderResult: (record, compact) => (
    <div className="va-result-body">
      {record.equipment_detected.length > 0 && (
        <EquipmentGrid items={record.equipment_detected} compact={compact} />
      )}
      <p className="va-result-text">{record.analysis_text}</p>
    </div>
  ),
};

const categories: Array<{ key: Category; label: string }> = [
  { key: "meal", label: "Comida" },
  { key: "body", label: "Cuerpo" },
  { key: "environment", label: "Entorno" },
];

export default function VisualAnalysis() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>("meal");

  return (
    <div className="va">
      <header className="va-header">
        <button className="va-back" onClick={() => navigate("/home", { replace: true })}>
          <ArrowLeft size={15} /> <span>Dashboard</span>
        </button>
        <div className="va-logo">
          Train<span>Smart</span> <em>AI</em>
        </div>
        <div className="va-badge">
          <Sparkles size={13} /> <span>Análisis visual con IA</span>
        </div>
      </header>

      <main className="va-main">
        <section className="va-hero">
          <h1>Análisis visual con IA</h1>
          <p>Sube fotos de tu comida, tu progreso corporal o tu espacio de entrenamiento.</p>
        </section>

        <div className="va-tabs">
          {categories.map((item) => (
            <button
              key={item.key}
              className={`va-tab${activeCategory === item.key ? " va-tab--active" : ""}`}
              onClick={() => setActiveCategory(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {activeCategory === "meal" && <AnalysisSection key="meal" config={mealConfig} />}
        {activeCategory === "body" && <AnalysisSection key="body" config={bodyConfig} />}
        {activeCategory === "environment" && (
          <AnalysisSection key="environment" config={environmentConfig} />
        )}
      </main>
    </div>
  );
}
