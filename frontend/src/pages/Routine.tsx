import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Mic,
  MicOff,
  PlayCircle,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";

import RequestStateCard from "../components/RequestStateCard";
import RoutineAudioPlayer from "../components/RoutineAudioPlayer";
import { useAuth } from "../context/AuthContext";
import { ApiClientError, api, clearApiClientState } from "../lib/api";
import type {
  AuthMeResponse,
  EnvironmentAnalysis,
  HealthHistoryRecord,
  ProfileRecord,
  Routine,
  RoutineDashboardDay,
  RoutineDashboardResponse,
  RoutineMutationResponse,
  RoutineTodayResponse,
  RoutineVersion,
  WorkoutSession,
  WorkoutSessionDetail,
  WorkoutSessionExercise,
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

type BusyAction =
  | "generate"
  | "regenerate"
  | "approve"
  | "discard"
  | "start-session"
  | "complete-series"
  | "finish-session";

type DayPreviewTone = "active" | "available" | "completed" | "next" | "blocked";

interface DayPreviewMeta {
  label: string;
  note: string;
  tone: DayPreviewTone;
}

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

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: {
    readonly transcript: string;
  };
}

interface SpeechRecognitionEventLike extends Event {
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
  readonly resultIndex?: number;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onspeechend: (() => void) | null;
  onaudioend: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

type InstructionDictationStatus = "idle" | "starting" | "listening" | "stopping" | "error";
type SpeechAudioContext = "timer" | "session" | "routine";

interface CompletedSeriesRecord {
  completedAt: string;
  timerSeconds: number;
}

interface GuidedSessionProgress {
  activeExerciseIndex: number;
  completedSeriesByExercise: Record<string, number>;
  seriesRecordsByExercise: Record<string, CompletedSeriesRecord[]>;
}

interface SeriesTimerTarget {
  exerciseId: string;
  exerciseName: string;
  exerciseOrder: number;
  seriesNumber: number;
  totalSeries: number;
  durationSeconds: number;
}

const VOICE_TIMER_STORAGE_KEY = "ts:voice-timer-enabled";
const DICTATION_RESTART_DELAY_MS = 600;

function isAudioPlaybackSupported() {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function formatTimerLabel(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatDurationMinutes(totalMinutes: number) {
  if (totalMinutes <= 1) {
    return "1 minuto";
  }

  return `${totalMinutes} minutos`;
}

function formatLocalIsoDate(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function getExerciseSeriesCount(exercise: RoutineDashboardDay["exercises"][number]) {
  return Math.max(1, exercise.sets || 1);
}

function getExerciseProgressId(exercise: RoutineDashboardDay["exercises"][number]) {
  return exercise.id || `${exercise.routine_day_id}-${exercise.exercise_order}`;
}

function getStartSessionMessage(input: {
  exerciseCount: number;
  totalSeries: number;
  firstExerciseName: string;
  firstExerciseSets: number;
}) {
  return `Excelente. Comienzas una sesión de ${input.exerciseCount} ejercicios y ${input.totalSeries} series. Primer ejercicio: ${input.firstExerciseName}, serie 1 de ${input.firstExerciseSets}. Mantén una técnica controlada.`;
}

function getStartSeriesMessage(target: SeriesTimerTarget) {
  return `${target.exerciseName}, serie ${target.seriesNumber} de ${target.totalSeries}. Inicia con control y respeta tu rango de movimiento.`;
}

function getSeriesCountdownMessage(target: SeriesTimerTarget) {
  return `Quedan 10 segundos en ${target.exerciseName}, serie ${target.seriesNumber}.`;
}

function getTimerCompletionMessage(target: SeriesTimerTarget) {
  return `Buen trabajo. Terminó el conteo de ${target.exerciseName}, serie ${target.seriesNumber}. Puedes finalizar esta serie.`;
}

function getSeriesCompletedMessage(input: {
  exerciseName: string;
  seriesNumber: number;
  totalSeries: number;
  restSeconds: number | null;
}) {
  const restText =
    input.restSeconds && input.restSeconds > 0
      ? ` Descansa ${input.restSeconds} segundos antes de continuar.`
      : " Descansa lo necesario antes de continuar.";

  return `Serie ${input.seriesNumber} de ${input.totalSeries} completada en ${input.exerciseName}.${restText}`;
}

function getExerciseCompletedMessage(exerciseName: string, nextExerciseName?: string) {
  return nextExerciseName
    ? `Completaste ${exerciseName}. Cuando estés listo, avanza a ${nextExerciseName}.`
    : `Completaste ${exerciseName}. Ya puedes registrar el cierre de la sesión.`;
}

function getNextExerciseMotivation(nextExerciseName: string, totalSeries: number) {
  return `Ahora continúa con ${nextExerciseName}, serie 1 de ${totalSeries}. Mantén el ritmo y cuida la técnica.`;
}

function buildFinalSummaryMessage(input: {
  dayLabel: string;
  exerciseCount: number;
  totalSeries: number;
  effort: "easy" | "moderate" | "hard";
  startedAt: string | null;
}) {
  const startedAt = input.startedAt ? new Date(input.startedAt) : null;
  const elapsedMinutes =
    startedAt && !Number.isNaN(startedAt.getTime())
      ? Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000))
      : null;

  const effortLabel =
    input.effort === "easy"
      ? "fácil"
      : input.effort === "moderate"
        ? "moderado"
        : "intenso";

  const durationText = elapsedMinutes
    ? ` en ${formatDurationMinutes(elapsedMinutes)}`
    : "";

  return `Has completado ${input.dayLabel}${durationText} con éxito. Cerraste ${input.exerciseCount} ejercicios y ${input.totalSeries} series, con esfuerzo ${effortLabel}. Excelente trabajo.`;
}

function getOptionalResource<T>(request: Promise<T>) {
  return request.catch((error) => {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    throw error;
  });
}

function getGuidedProgressStorageKey(sessionId: string) {
  return `routine-guided-progress:${sessionId}`;
}

function getEmptyGuidedProgress(): GuidedSessionProgress {
  return {
    activeExerciseIndex: 0,
    completedSeriesByExercise: {},
    seriesRecordsByExercise: {},
  };
}

function getTotalSeriesCount(exercises: RoutineDashboardDay["exercises"]) {
  return exercises.reduce((total, exercise) => total + getExerciseSeriesCount(exercise), 0);
}

function getCompletedSeriesCount(
  progress: GuidedSessionProgress,
  exercise: RoutineDashboardDay["exercises"][number],
) {
  const exerciseId = getExerciseProgressId(exercise);
  return Math.min(
    progress.completedSeriesByExercise[exerciseId] ?? 0,
    getExerciseSeriesCount(exercise),
  );
}

function getCompletedTotalSeries(
  exercises: RoutineDashboardDay["exercises"],
  progress: GuidedSessionProgress,
) {
  return exercises.reduce(
    (total, exercise) => total + getCompletedSeriesCount(progress, exercise),
    0,
  );
}

function getFirstPendingExerciseIndex(
  exercises: RoutineDashboardDay["exercises"],
  progress: GuidedSessionProgress,
) {
  const pendingIndex = exercises.findIndex(
    (exercise) => getCompletedSeriesCount(progress, exercise) < getExerciseSeriesCount(exercise),
  );

  return pendingIndex >= 0 ? pendingIndex : Math.max(exercises.length - 1, 0);
}

function normalizeGuidedProgress(
  progress: GuidedSessionProgress,
  exercises: RoutineDashboardDay["exercises"],
): GuidedSessionProgress {
  const normalized = getEmptyGuidedProgress();

  exercises.forEach((exercise) => {
    const exerciseId = getExerciseProgressId(exercise);
    const completed = Math.min(
      Math.max(progress.completedSeriesByExercise[exerciseId] ?? 0, 0),
      getExerciseSeriesCount(exercise),
    );
    const records = progress.seriesRecordsByExercise[exerciseId] ?? [];

    normalized.completedSeriesByExercise[exerciseId] = completed;
    normalized.seriesRecordsByExercise[exerciseId] = records.slice(0, completed);
  });

  const maxIndex = Math.max(exercises.length - 1, 0);
  normalized.activeExerciseIndex = Math.min(
    Math.max(progress.activeExerciseIndex ?? getFirstPendingExerciseIndex(exercises, normalized), 0),
    maxIndex,
  );

  return normalized;
}

function readGuidedProgress(
  sessionId: string,
  exercises: RoutineDashboardDay["exercises"],
) {
  try {
    const stored = window.localStorage.getItem(getGuidedProgressStorageKey(sessionId));

    if (!stored) {
      return normalizeGuidedProgress(getEmptyGuidedProgress(), exercises);
    }

    return normalizeGuidedProgress(JSON.parse(stored) as GuidedSessionProgress, exercises);
  } catch {
    return normalizeGuidedProgress(getEmptyGuidedProgress(), exercises);
  }
}

function writeGuidedProgress(sessionId: string, progress: GuidedSessionProgress) {
  window.localStorage.setItem(getGuidedProgressStorageKey(sessionId), JSON.stringify(progress));
}

function clearGuidedProgress(sessionId: string) {
  window.localStorage.removeItem(getGuidedProgressStorageKey(sessionId));
}

function mergeSessionExerciseProgress(
  progress: GuidedSessionProgress,
  sessionExercises: WorkoutSessionExercise[],
  exercises: RoutineDashboardDay["exercises"],
) {
  const nextProgress = normalizeGuidedProgress(progress, exercises);
  const sessionExerciseByOrder = new Map(
    sessionExercises.map((exercise) => [exercise.exercise_order, exercise]),
  );

  exercises.forEach((exercise) => {
    const persistedExercise = sessionExerciseByOrder.get(exercise.exercise_order);
    const exerciseId = getExerciseProgressId(exercise);
    const persistedSets = persistedExercise?.performed_sets ?? 0;
    const completed = Math.min(
      Math.max(nextProgress.completedSeriesByExercise[exerciseId] ?? 0, persistedSets),
      getExerciseSeriesCount(exercise),
    );

    nextProgress.completedSeriesByExercise[exerciseId] = completed;
    nextProgress.seriesRecordsByExercise[exerciseId] =
      nextProgress.seriesRecordsByExercise[exerciseId]?.slice(0, completed) ?? [];
  });

  nextProgress.activeExerciseIndex = Math.min(
    nextProgress.activeExerciseIndex,
    Math.max(exercises.length - 1, 0),
  );

  if (
    exercises[nextProgress.activeExerciseIndex] &&
    getCompletedSeriesCount(nextProgress, exercises[nextProgress.activeExerciseIndex]) >=
      getExerciseSeriesCount(exercises[nextProgress.activeExerciseIndex])
  ) {
    nextProgress.activeExerciseIndex = getFirstPendingExerciseIndex(exercises, nextProgress);
  }

  return nextProgress;
}

function buildSessionProgressNotes(
  userNotes: string,
  exercises: RoutineDashboardDay["exercises"],
  progress: GuidedSessionProgress,
) {
  const progressSummary = exercises
    .map((exercise) => {
      const completed = getCompletedSeriesCount(progress, exercise);
      return `${exercise.exercise_name}: ${completed}/${getExerciseSeriesCount(exercise)} series`;
    })
    .join('; ');

  return [userNotes.trim(), `Progreso guiado: ${progressSummary}`]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 1000);
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
      note: "Ya comenzaste este día y estás avanzando por ejercicios y series.",
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
  const { getSupabaseAccessToken } = useAuth();
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
  const [environmentAnalysis, setEnvironmentAnalysis] =
    useState<EnvironmentAnalysis | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");
  const [regenerateReason, setRegenerateReason] = useState("");
  const [effort, setEffort] = useState<"easy" | "moderate" | "hard">("moderate");
  const [difficulty, setDifficulty] = useState("6");
  const [painOrDiscomfort, setPainOrDiscomfort] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [previewDayId, setPreviewDayId] = useState<string | null>(null);
  const [analyzingEnvironment, setAnalyzingEnvironment] = useState(false);
  const [guidedProgress, setGuidedProgress] =
    useState<GuidedSessionProgress>(() => getEmptyGuidedProgress());
  const [voiceTimerEnabled, setVoiceTimerEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(VOICE_TIMER_STORAGE_KEY) !== "false";
  });
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [timerRemaining, setTimerRemaining] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTarget, setTimerTarget] = useState<SeriesTimerTarget | null>(null);
  const [instructionDictationStatus, setInstructionDictationStatus] =
    useState<InstructionDictationStatus>("idle");
  const [instructionTranscriptError, setInstructionTranscriptError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const timerIntervalRef = useRef<number | null>(null);
  const spokenTimerMarksRef = useRef<Set<number>>(new Set());
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionStopRequestedRef = useRef(false);
  const recognitionHadErrorRef = useRef(false);
  const recognitionKeepAliveRef = useRef(false);
  const recognitionRestartTimeoutRef = useRef<number | null>(null);
  const instructionMicStreamRef = useRef<MediaStream | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioCacheRef = useRef<Map<string, string>>(new Map());
  const isBusy = busyAction !== null;

  const readyToGenerate = Boolean(
    authState?.profile_completed &&
      authState.profile_confirmed &&
      authState.health_completed,
  );

  const dayExercises = useMemo(
    () =>
      routineToday?.today.exercises
        .slice()
        .sort((left, right) => left.exercise_order - right.exercise_order) ?? [],
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
  const activeExerciseIndex = Math.min(
    guidedProgress.activeExerciseIndex,
    Math.max(dayExercises.length - 1, 0),
  );
  const currentExercise =
    activeDaySession && !dayCompleted && dayExercises.length > 0
      ? dayExercises[activeExerciseIndex]
      : null;
  const currentExerciseCompletedSeries = currentExercise
    ? getCompletedSeriesCount(guidedProgress, currentExercise)
    : 0;
  const currentExerciseTotalSeries = currentExercise
    ? getExerciseSeriesCount(currentExercise)
    : 0;
  const currentSeriesNumber = currentExercise
    ? Math.min(currentExerciseCompletedSeries + 1, currentExerciseTotalSeries)
    : 0;
  const currentExerciseCompleted =
    Boolean(currentExercise) && currentExerciseCompletedSeries >= currentExerciseTotalSeries;
  const completedTotalSeries = getCompletedTotalSeries(dayExercises, guidedProgress);
  const totalSeriesCount = getTotalSeriesCount(dayExercises);
  const allSeriesCompleted =
    dayExercises.length > 0 && totalSeriesCount > 0 && completedTotalSeries >= totalSeriesCount;
  const hasNextExercise =
    Boolean(currentExercise) && activeExerciseIndex < dayExercises.length - 1;
  const nextExercise = hasNextExercise ? dayExercises[activeExerciseIndex + 1] : null;
  const timerMatchesCurrentSeries =
    Boolean(
      currentExercise &&
        timerTarget &&
        timerTarget.exerciseId === getExerciseProgressId(currentExercise) &&
        timerTarget.seriesNumber === currentSeriesNumber,
    );
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
  const speechRecognitionSupported = Boolean(getSpeechRecognitionConstructor());
  const isListeningToInstructions =
    instructionDictationStatus === "starting" ||
    instructionDictationStatus === "listening" ||
    instructionDictationStatus === "stopping";
  const dictationButtonLabel =
    instructionDictationStatus === "starting"
      ? "Iniciando dictado..."
      : instructionDictationStatus === "stopping"
        ? "Deteniendo..."
        : isListeningToInstructions
          ? "Detener dictado"
          : "Dictar instrucciones";
  const dictationHint =
    instructionDictationStatus === "starting"
      ? "Solicitando acceso al microfono..."
      : instructionDictationStatus === "listening"
        ? "Escuchando. Presiona detener cuando termines de hablar."
        : instructionDictationStatus === "stopping"
          ? "Cerrando el dictado..."
          : speechRecognitionSupported
            ? "Habla para completar tus instrucciones sin escribir."
            : "Dictado disponible en navegadores compatibles como Chrome o Edge.";
  const suggestedTimerSeconds = useMemo(() => {
    if (!currentExercise) {
      return 30;
    }

    return currentExercise.rest_seconds && currentExercise.rest_seconds > 0
      ? currentExercise.rest_seconds
      : 30;
  }, [currentExercise]);

  const playElevenLabsSpeech = useCallback(
    async (text: string, context: SpeechAudioContext) => {
      if (!voiceTimerEnabled || !isAudioPlaybackSupported()) {
        return;
      }

      const normalizedText = text.trim();

      if (!normalizedText) {
        return;
      }

      const cacheKey = `${context}:${normalizedText}`;

      try {
        let audioUrl = voiceAudioCacheRef.current.get(cacheKey);

        if (!audioUrl) {
          const token = await getSupabaseAccessToken();

          if (!token) {
            return;
          }

          const response = await fetch('/api/greetings/speech-audio', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: normalizedText,
              context,
            }),
          });

          if (!response.ok) {
            console.warn('Failed to generate ElevenLabs routine voice audio', {
              status: response.status,
              context,
            });
            return;
          }

          const audioBlob = await response.blob();
          audioUrl = URL.createObjectURL(audioBlob);
          voiceAudioCacheRef.current.set(cacheKey, audioUrl);
        }

        voiceAudioRef.current?.pause();
        const audio = new Audio(audioUrl);
        voiceAudioRef.current = audio;
        await audio.play();
      } catch (error) {
        console.warn('Could not play ElevenLabs routine voice audio', error);
      }
    },
    [getSupabaseAccessToken, voiceTimerEnabled],
  );

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
  }, [routineDashboard?.days, routineToday]);

  useEffect(() => {
    if (dayCompleted) {
      setGuidedProgress((current) => normalizeGuidedProgress(current, dayExercises));
      return;
    }

    if (!activeDaySession) {
      setGuidedProgress(getEmptyGuidedProgress());
      return;
    }

    const storedProgress = readGuidedProgress(activeDaySession.id, dayExercises);
    setGuidedProgress(storedProgress);

    let cancelled = false;

    api
      .get<WorkoutSessionDetail>(`/sessions/${activeDaySession.id}`, { cacheTtlMs: false })
      .then((sessionDetail) => {
        if (cancelled) {
          return;
        }

        const mergedProgress = mergeSessionExerciseProgress(
          storedProgress,
          sessionDetail.exercises,
          dayExercises,
        );
        setGuidedProgress(mergedProgress);
        writeGuidedProgress(activeDaySession.id, mergedProgress);
      })
      .catch((error) => {
        console.warn("Could not hydrate guided session progress", error);
      });

    return () => {
      cancelled = true;
    };
  }, [activeDaySession, dayCompleted, dayExercises]);

  useEffect(() => {
    setTimerRunning(false);
    setTimerTarget(null);
    setTimerSeconds(suggestedTimerSeconds);
    setTimerRemaining(suggestedTimerSeconds);
    spokenTimerMarksRef.current.clear();
  }, [activeDaySession?.id, currentExercise?.id, currentSeriesNumber, suggestedTimerSeconds]);

  useEffect(() => {
    if (!timerRunning) {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = window.setInterval(() => {
      setTimerRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timerIntervalRef.current ?? undefined);
          timerIntervalRef.current = null;
          setTimerRunning(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timerRunning]);

  useEffect(() => {
    if (!voiceTimerEnabled || !isAudioPlaybackSupported() || !timerTarget) {
      return;
    }

    if (
      timerRunning &&
      timerTarget.durationSeconds > 10 &&
      timerRemaining === 10 &&
      !spokenTimerMarksRef.current.has(10)
    ) {
      void playElevenLabsSpeech(getSeriesCountdownMessage(timerTarget), "timer");
      spokenTimerMarksRef.current.add(10);
      return;
    }

    if (timerRemaining === 0 && !spokenTimerMarksRef.current.has(0)) {
      void playElevenLabsSpeech(getTimerCompletionMessage(timerTarget), "timer");
      spokenTimerMarksRef.current.add(0);
    }
  }, [playElevenLabsSpeech, timerRemaining, timerRunning, timerTarget, voiceTimerEnabled]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
      }

      if (recognitionRestartTimeoutRef.current !== null) {
        window.clearTimeout(recognitionRestartTimeoutRef.current);
      }

      recognitionStopRequestedRef.current = true;
      recognitionKeepAliveRef.current = false;
      recognitionRef.current?.abort();
      instructionMicStreamRef.current?.getTracks().forEach((track) => track.stop());
      instructionMicStreamRef.current = null;

      voiceAudioRef.current?.pause();
      voiceAudioCacheRef.current.forEach((audioUrl) => URL.revokeObjectURL(audioUrl));
      voiceAudioCacheRef.current.clear();
    };
  }, []);

  async function fetchRoutineSnapshot() {
    const [authMe, profileData, healthData, sessions, dashboard, today, routines, environment] =
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
        api.getFresh<EnvironmentAnalysis | null>("/vision/environment/latest"),
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
      environment,
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
        setEnvironmentAnalysis(snapshot.environment);
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
    setEnvironmentAnalysis(snapshot.environment);
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

  const stopInstructionMicCapture = () => {
    instructionMicStreamRef.current?.getTracks().forEach((track) => track.stop());
    instructionMicStreamRef.current = null;
  };

  const requestInstructionMicCapture = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Tu navegador no permite solicitar acceso al microfono desde esta pagina.");
    }

    stopInstructionMicCapture();
    instructionMicStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
  };

  const handleToggleInstructionDictation = async () => {
    if (isListeningToInstructions) {
      recognitionStopRequestedRef.current = true;
      recognitionKeepAliveRef.current = false;
      setInstructionDictationStatus("stopping");
      recognitionRef.current?.stop();
      stopInstructionMicCapture();
      return;
    }

    const SpeechRecognitionApi = getSpeechRecognitionConstructor();

    if (!SpeechRecognitionApi) {
      setInstructionTranscriptError(
        "Tu navegador no soporta dictado por voz. Usa Chrome o Edge para habilitarlo.",
      );
      setInstructionDictationStatus("error");
      return;
    }

    if (recognitionRestartTimeoutRef.current !== null) {
      window.clearTimeout(recognitionRestartTimeoutRef.current);
      recognitionRestartTimeoutRef.current = null;
    }

    setInstructionTranscriptError(null);
    setLiveTranscript("");
    setInstructionDictationStatus("starting");

    try {
      await requestInstructionMicCapture();
    } catch (error) {
      setInstructionDictationStatus("error");
      setInstructionTranscriptError(
        error instanceof Error && error.name === "NotAllowedError"
          ? "El navegador bloqueo el microfono. Permite el acceso en la barra de direcciones e intenta de nuevo."
          : error instanceof Error && error.name === "NotFoundError"
            ? "No encontramos un microfono disponible para iniciar el dictado."
            : error instanceof Error
              ? error.message
              : "No fue posible acceder al microfono para iniciar el dictado.",
      );
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = "es-CO";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setInstructionDictationStatus("listening");
      setInstructionTranscriptError(null);
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      const startIndex = event.resultIndex ?? 0;

      for (let index = startIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim() ?? "";

        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          finalText += `${transcript} `;
        } else {
          interimText += `${transcript} `;
        }
      }

      setLiveTranscript(interimText.trim());

      if (finalText.trim()) {
        setCustomInstructions((current) =>
          `${current.trim()} ${finalText.trim()}`.trim(),
        );
      }
    };

    recognition.onerror = (event) => {
      const errorCode = event.error ?? "unknown";

      if (errorCode === "no-speech" && recognitionKeepAliveRef.current) {
        setInstructionTranscriptError(null);
        setLiveTranscript("");
        return;
      }

      if (errorCode === "aborted" && recognitionStopRequestedRef.current) {
        return;
      }

      recognitionHadErrorRef.current = true;
      recognitionKeepAliveRef.current = false;

      const errorMessage =
        errorCode === "not-allowed"
          ? "El navegador bloqueo el microfono. Debes permitir acceso para usar el dictado."
          : errorCode === "service-not-allowed"
            ? "El servicio de reconocimiento de voz no esta permitido en este navegador o dominio."
            : errorCode === "audio-capture"
              ? "No pudimos acceder al microfono. Revisa que este conectado y disponible."
              : errorCode === "network"
                ? "El dictado necesita conexion con el servicio de reconocimiento de voz. Revisa tu red e intenta de nuevo."
                : "No fue posible completar la transcripcion por voz en este momento.";

      setInstructionTranscriptError(errorMessage);
      setLiveTranscript("");
      setInstructionDictationStatus("error");
      stopInstructionMicCapture();
    };

    recognition.onspeechend = () => {
      setLiveTranscript("");
    };

    recognition.onaudioend = () => {
      setLiveTranscript("");
    };

    recognition.onend = () => {
      const shouldRestart =
        recognitionKeepAliveRef.current &&
        !recognitionStopRequestedRef.current &&
        !recognitionHadErrorRef.current;

      if (shouldRestart) {
        recognitionRestartTimeoutRef.current = window.setTimeout(() => {
          recognitionRestartTimeoutRef.current = null;

          if (!recognitionKeepAliveRef.current || recognitionStopRequestedRef.current) {
            return;
          }

          try {
            recognition.start();
            setInstructionDictationStatus("starting");
          } catch {
            recognitionHadErrorRef.current = true;
            recognitionKeepAliveRef.current = false;
            setInstructionDictationStatus("error");
            setInstructionTranscriptError(
              "El navegador cerro el dictado antes de tiempo. Presiona el boton para intentarlo de nuevo.",
            );
            setLiveTranscript("");
            recognitionRef.current = null;
            stopInstructionMicCapture();
          }
        }, DICTATION_RESTART_DELAY_MS);
        return;
      }

      if (!recognitionHadErrorRef.current && !recognitionStopRequestedRef.current) {
        setInstructionTranscriptError(
          "El dictado termino porque el navegador dejo de recibir audio. Puedes iniciarlo de nuevo para continuar.",
        );
      }

      setInstructionDictationStatus(recognitionHadErrorRef.current ? "error" : "idle");
      setLiveTranscript("");
      recognitionRef.current = null;
      stopInstructionMicCapture();
    };

    recognitionStopRequestedRef.current = false;
    recognitionHadErrorRef.current = false;
    recognitionKeepAliveRef.current = true;
    setInstructionTranscriptError(null);
    setLiveTranscript("");
    setInstructionDictationStatus("starting");
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      recognitionHadErrorRef.current = true;
      recognitionKeepAliveRef.current = false;
      setInstructionDictationStatus("error");
      setInstructionTranscriptError(
        "No fue posible iniciar el dictado. Revisa permisos de microfono e intenta nuevamente.",
      );
      stopInstructionMicCapture();
    }
  };
  const handleToggleVoiceTimer = () => {
    const nextValue = !voiceTimerEnabled;
    setVoiceTimerEnabled(nextValue);
    window.localStorage.setItem(VOICE_TIMER_STORAGE_KEY, String(nextValue));

    if (!nextValue) {
      voiceAudioRef.current?.pause();
    }
  };

  const handleTimerInputChange = (value: string) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      setTimerSeconds(0);
      setTimerRemaining(0);
      return;
    }

    const nextValue = Math.max(0, Math.min(600, Math.round(parsed)));
    setTimerSeconds(nextValue);
    setTimerRemaining(nextValue);
    setTimerRunning(false);
    setTimerTarget(null);
    spokenTimerMarksRef.current.clear();
  };

  const handleStartTimer = () => {
    if (!currentExercise || currentExerciseCompleted || timerSeconds <= 0) {
      return;
    }

    const nextTimerTarget: SeriesTimerTarget = {
      exerciseId: getExerciseProgressId(currentExercise),
      exerciseName: currentExercise.exercise_name,
      exerciseOrder: currentExercise.exercise_order,
      seriesNumber: currentSeriesNumber,
      totalSeries: currentExerciseTotalSeries,
      durationSeconds: timerSeconds,
    };

    setTimerTarget(nextTimerTarget);
    spokenTimerMarksRef.current.clear();
    setTimerRemaining(timerSeconds);
    setTimerRunning(true);

    if (voiceTimerEnabled) {
      void playElevenLabsSpeech(`3, 2, 1, comienza. ${getStartSeriesMessage(nextTimerTarget)}`, "timer");
    }
  };

  const handlePauseTimer = () => {
    setTimerRunning(false);

    voiceAudioRef.current?.pause();
  };

  const handleResetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(suggestedTimerSeconds);
    setTimerRemaining(suggestedTimerSeconds);
    setTimerTarget(null);
    spokenTimerMarksRef.current.clear();

    voiceAudioRef.current?.pause();
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
        text: environmentAnalysis
          ? `${result.message} Se tuvo en cuenta tu ultimo analisis visual del entorno.`
          : result.message,
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
        text: environmentAnalysis
          ? `${result.message} La regeneracion considero el entorno detectado en tu foto mas reciente.`
          : result.message,
      });
    });
  };

  const handleEnvironmentFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    event.target.value = "";

    if (file.size > 4 * 1024 * 1024) {
      await Alert.fire({
        icon: "info",
        title: "Imagen demasiado grande",
        text: "Usa una imagen de hasta 4 MB para que el analisis sea estable.",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      await Alert.fire({
        icon: "info",
        title: "Archivo no compatible",
        text: "Selecciona una imagen PNG, JPG o WEBP.",
      });
      return;
    }

    setAnalyzingEnvironment(true);

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      const analysis = await api.post<EnvironmentAnalysis>("/vision/environment/analyze", {
        image_data_url: imageDataUrl,
        file_name: file.name,
      });

      setEnvironmentAnalysis(analysis);

      await Alert.fire({
        icon: "success",
        title: "Entorno analizado",
        text: "El equipo detectado ya queda disponible para adaptar tus proximas rutinas.",
      });
    } catch (error) {
      console.error("Failed to analyze environment image", error);
      await Alert.fire({
        icon: "error",
        title: "No se pudo analizar la imagen",
        text:
          error instanceof Error
            ? error.message
            : "Revisa la imagen seleccionada, tu conexion y la configuracion de Ximilar.",
      });
    } finally {
      setAnalyzingEnvironment(false);
    }
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
    if (!routineToday || dayExercises.length === 0) {
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
        session_date: formatLocalIsoDate(),
        routine_version_id: routineToday.version.id,
        routine_day_id: routineToday.today.id,
        notes: "",
      });

      setActiveSession(session);
      setRecentSessions((current) => [session, ...current].slice(0, 10));
      const initialProgress = normalizeGuidedProgress(getEmptyGuidedProgress(), dayExercises);
      setGuidedProgress(initialProgress);
      writeGuidedProgress(session.id, initialProgress);

      if (voiceTimerEnabled) {
        void playElevenLabsSpeech(
          getStartSessionMessage({
            exerciseCount: dayExercises.length,
            totalSeries: totalSeriesCount,
            firstExerciseName: dayExercises[0].exercise_name,
            firstExerciseSets: getExerciseSeriesCount(dayExercises[0]),
          }),
          "session",
        );
      }

      await Alert.fire({
        icon: "success",
        title: "Entrenamiento iniciado",
        text: `Primer ejercicio: ${dayExercises[0].exercise_name}. Serie 1 de ${getExerciseSeriesCount(dayExercises[0])}.`,
      });
    });
  };

  const handleCompleteCurrentSeries = async () => {
    if (
      !activeDaySession ||
      !currentExercise ||
      !timerTarget ||
      !timerMatchesCurrentSeries ||
      timerRemaining !== 0
    ) {
      return;
    }

    try {
      await withBusyState("complete-series", async () => {
        const exerciseId = getExerciseProgressId(currentExercise);
        const previousCompleted = getCompletedSeriesCount(guidedProgress, currentExercise);
        const nextCompleted = Math.min(previousCompleted + 1, currentExerciseTotalSeries);
        const nextRecords = [
          ...(guidedProgress.seriesRecordsByExercise[exerciseId] ?? []),
          {
            completedAt: new Date().toISOString(),
            timerSeconds: timerTarget.durationSeconds,
          },
        ].slice(0, nextCompleted);
        const nextProgress = normalizeGuidedProgress(
          {
            ...guidedProgress,
            completedSeriesByExercise: {
              ...guidedProgress.completedSeriesByExercise,
              [exerciseId]: nextCompleted,
            },
            seriesRecordsByExercise: {
              ...guidedProgress.seriesRecordsByExercise,
              [exerciseId]: nextRecords,
            },
          },
          dayExercises,
        );

        await api.put<WorkoutSessionExercise>(
          `/sessions/${activeDaySession.id}/exercises/${currentExercise.exercise_order}/progress`,
          {
            performed_sets: nextCompleted,
            performed_reps: currentExercise.reps,
            rest_seconds: currentExercise.rest_seconds ?? null,
          },
        );

        setGuidedProgress(nextProgress);
        writeGuidedProgress(activeDaySession.id, nextProgress);
        setTimerRunning(false);
        setTimerTarget(null);
        setTimerSeconds(suggestedTimerSeconds);
        setTimerRemaining(suggestedTimerSeconds);
        spokenTimerMarksRef.current.clear();

        const exerciseNowCompleted = nextCompleted >= currentExerciseTotalSeries;
        const allCompletedAfterThis =
          getCompletedTotalSeries(dayExercises, nextProgress) >= totalSeriesCount;

        if (voiceTimerEnabled) {
          if (exerciseNowCompleted) {
            void playElevenLabsSpeech(
              getExerciseCompletedMessage(currentExercise.exercise_name, nextExercise?.exercise_name),
              "session",
            );
          } else {
            void playElevenLabsSpeech(
              getSeriesCompletedMessage({
                exerciseName: currentExercise.exercise_name,
                seriesNumber: nextCompleted,
                totalSeries: currentExerciseTotalSeries,
                restSeconds: currentExercise.rest_seconds,
              }),
              "session",
            );
          }
        }

        await Alert.fire({
          icon: "success",
          title: `Serie ${nextCompleted} completada`,
          text: allCompletedAfterThis
            ? "Todas las series de la sesión quedaron completadas. Registra el cierre final."
            : exerciseNowCompleted
              ? `Completaste ${currentExercise.exercise_name}. Avanza al siguiente ejercicio cuando estés listo.`
              : `Continúa con la serie ${nextCompleted + 1} de ${currentExerciseTotalSeries}.`,
        });
      });
    } catch (error) {
      console.error("Failed to complete guided workout series", error);
      await Alert.fire({
        icon: "error",
        title: "No se pudo guardar la serie",
        text:
          error instanceof Error
            ? error.message
            : "La serie no quedo registrada correctamente. Revisa tu conexion e intentalo de nuevo.",
      });
    }
  };

  const handleAdvanceExercise = () => {
    if (!activeDaySession || !currentExercise || !currentExerciseCompleted || !nextExercise) {
      return;
    }

    const nextProgress = normalizeGuidedProgress(
      {
        ...guidedProgress,
        activeExerciseIndex: activeExerciseIndex + 1,
      },
      dayExercises,
    );

    setGuidedProgress(nextProgress);
    writeGuidedProgress(activeDaySession.id, nextProgress);
    setTimerRunning(false);
    setTimerTarget(null);
    setTimerSeconds(nextExercise.rest_seconds && nextExercise.rest_seconds > 0 ? nextExercise.rest_seconds : 30);
    setTimerRemaining(nextExercise.rest_seconds && nextExercise.rest_seconds > 0 ? nextExercise.rest_seconds : 30);
    spokenTimerMarksRef.current.clear();

    if (voiceTimerEnabled) {
      void playElevenLabsSpeech(
        getNextExerciseMotivation(nextExercise.exercise_name, getExerciseSeriesCount(nextExercise)),
        "session",
      );
    }
  };

  const handleFinishSession = async () => {
    if (!activeDaySession || !routineToday || !allSeriesCompleted) {
      return;
    }

    try {
      await withBusyState("finish-session", async () => {
        await api.put<WorkoutSession>(`/sessions/${activeDaySession.id}/finish`, {
          perceived_effort: effort,
          difficulty_rating: Number(difficulty),
          pain_or_discomfort: painOrDiscomfort,
          notes: buildSessionProgressNotes(sessionNotes, dayExercises, guidedProgress) || undefined,
        });

        clearApiClientState();
        clearGuidedProgress(activeDaySession.id);
        setSessionNotes("");
        setPainOrDiscomfort(false);
        setDifficulty("6");
        setEffort("moderate");
        setGuidedProgress((current) => normalizeGuidedProgress(current, dayExercises));
        setTimerRunning(false);
        setTimerTarget(null);
        spokenTimerMarksRef.current.clear();

        if (voiceTimerEnabled) {
          void playElevenLabsSpeech(
            buildFinalSummaryMessage({
              dayLabel: routineToday?.today.day_label ?? "tu entrenamiento de hoy",
              exerciseCount: dayExercises.length,
              totalSeries: totalSeriesCount,
              effort,
              startedAt: activeDaySession.started_at,
            }),
            "routine",
          );
        }

        await refreshRoutineData();

        await Alert.fire({
          icon: "success",
          title: "Día completado",
          text: "Completaste todos los ejercicios y series de hoy. Descansa y vuelve para el siguiente día.",
          confirmButtonText: "Volver al dashboard",
          allowOutsideClick: false,
        });

        navigate("/home", { replace: true });
      });
    } catch (error) {
      console.error("Failed to finish workout session", error);
      await Alert.fire({
        icon: "error",
        title: "No se pudo finalizar la sesion",
        text:
          error instanceof Error
            ? error.message
            : "La sesion no quedo cerrada correctamente. Revisa tu conexion o los permisos de la API y vuelve a intentarlo.",
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
                  <Camera size={16} /> Entorno y equipo disponible
                </h2>
                <p>
                  Sube una foto de tu espacio real para detectar implementos visibles y reutilizar
                  ese contexto al generar o regenerar tu rutina.
                </p>
                <label className="rt-upload">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(event) => void handleEnvironmentFileChange(event)}
                    disabled={analyzingEnvironment}
                  />
                  <span>
                    {analyzingEnvironment ? "Analizando imagen..." : "Subir foto del entorno"}
                  </span>
                </label>
                {environmentAnalysis ? (
                  <div className="rt-environment">
                    {environmentAnalysis.source_image_url ? (
                      <img
                        className="rt-environment__image"
                        src={environmentAnalysis.source_image_url}
                        alt="Ultimo entorno analizado"
                      />
                    ) : null}
                    <p className="rt-environment__summary">{environmentAnalysis.summary}</p>
                    <div className="rt-day-preview__tags">
                      {(environmentAnalysis.detected_equipment.length > 0
                        ? environmentAnalysis.detected_equipment
                        : ["peso corporal como base"]
                      ).map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                    {environmentAnalysis.detected_space_tags.length > 0 ? (
                      <div className="rt-day-preview__tags">
                        {environmentAnalysis.detected_space_tags.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    ) : null}
                    <p className="rt-environment__context">
                      {environmentAnalysis.training_context}
                    </p>
                  </div>
                ) : (
                  <div className="rt-block-note">
                    <ClipboardList size={15} />
                    <span>
                      Todavia no has subido una foto. Mientras tanto, la rutina se genera sin
                      contexto visual de equipo.
                    </span>
                  </div>
                )}
              </article>

              <article className="rt-card">
                <h2>
                  <Sparkles size={16} /> Generación IA
                </h2>
                <p>
                  Puedes enviar instrucciones extra para que la propuesta se adapte a tus preferencias, restricciones y estilo de entrenamiento.
                </p>
                {environmentAnalysis ? (
                  <p className="rt-environment__hint">
                    El ultimo analisis visual se aplicara automaticamente a la rutina.
                  </p>
                ) : null}
                <div className="rt-voice-tools">
                  <button
                    type="button"
                    className={`rt-btn${isListeningToInstructions ? "" : " rt-btn--ghost"}`}
                    onClick={handleToggleInstructionDictation}
                    disabled={
                      isBusy ||
                      !speechRecognitionSupported ||
                      instructionDictationStatus === "stopping"
                    }
                  >
                    {isListeningToInstructions ? <MicOff size={14} /> : <Mic size={14} />}
                    {dictationButtonLabel}
                  </button>
                  <span className="rt-voice-tools__hint">
                    {dictationHint}
                  </span>
                </div>
                <textarea
                  className="rt-textarea"
                  value={customInstructions}
                  onChange={(event) => setCustomInstructions(event.target.value)}
                  placeholder="Ej: prioriza ejercicios con mancuernas, evita movimientos sobre la cabeza..."
                  rows={4}
                  disabled={isBusy}
                />
                {liveTranscript ? (
                  <p className="rt-live-transcript">Escuchando: {liveTranscript}</p>
                ) : null}
                {instructionTranscriptError ? (
                  <p className="rt-error-copy">{instructionTranscriptError}</p>
                ) : null}
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
                          ? `${completedTotalSeries}/${totalSeriesCount} series completadas`
                          : `${dayExercises.length} ejercicios`}
                    </span>
                  </div>

                  {activeDaySession && !dayCompleted ? (
                    <RoutineAudioPlayer sessionId={activeDaySession.id} />
                  ) : dayCompleted ? (
                    <RoutineAudioPlayer sessionId={activeDaySession?.id ?? "completed"} disabled />
                  ) : null}

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
                        <span>Ejercicios: {previewDay.exercises.length}</span>
                        <span>Series: {getTotalSeriesCount(previewDay.exercises)}</span>
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
                    {dayExercises.map((exercise, index) => {
                      const completedSeries = dayCompleted
                        ? getExerciseSeriesCount(exercise)
                        : getCompletedSeriesCount(guidedProgress, exercise);
                      const totalSeries = getExerciseSeriesCount(exercise);
                      const isCompleted = dayCompleted || completedSeries >= totalSeries;
                      const isCurrent = Boolean(
                        activeDaySession && !dayCompleted && index === activeExerciseIndex,
                      );
                      const isAvailable = !activeDaySession && !dayCompleted && index === 0;
                      const isLocked =
                        !isCompleted &&
                        !isCurrent &&
                        !isAvailable &&
                        (!activeDaySession || index > activeExerciseIndex);

                      return (
                        <div
                          key={exercise.id}
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
                              <strong>
                                Ejercicio {index + 1}: {exercise.exercise_name}
                              </strong>
                              <p>
                                {totalSeries} series · {exercise.reps} reps · Descanso {exercise.rest_seconds ?? 0}s
                              </p>
                            </div>
                            <span className={`rt-pill rt-pill--${isCompleted ? "completed" : isCurrent ? "active" : isAvailable ? "available" : "blocked"}`}>
                              {isCompleted
                                ? "Completado"
                                : isCurrent
                                  ? `Serie ${currentSeriesNumber} de ${currentExerciseTotalSeries}`
                                  : isAvailable
                                    ? "Lista para iniciar"
                                    : "Se habilita después"}
                            </span>
                          </div>

                          <div className="rt-series-track">
                            {Array.from({ length: totalSeries }, (_, seriesIndex) => {
                              const seriesNumber = seriesIndex + 1;
                              const seriesDone = seriesNumber <= completedSeries;
                              const seriesActive =
                                isCurrent && !isCompleted && seriesNumber === currentSeriesNumber;

                              return (
                                <span
                                  key={`${exercise.id}-series-${seriesNumber}`}
                                  className={`rt-series-chip${
                                    seriesDone
                                      ? " rt-series-chip--done"
                                      : seriesActive
                                        ? " rt-series-chip--active"
                                        : ""
                                  }`}
                                >
                                  {seriesDone ? <CheckCircle2 size={13} /> : null}
                                  Serie {seriesNumber}
                                </span>
                              );
                            })}
                          </div>

                          {exercise.notes ? (
                            <p className="rt-exercise-note">{exercise.notes}</p>
                          ) : null}

                          {isCompleted ? (
                            <div className="rt-block-note">
                              <CheckCircle2 size={15} />
                              <span>Este ejercicio ya quedó completado y se mantiene visible como referencia.</span>
                            </div>
                          ) : null}

                          {isLocked ? (
                            <div className="rt-block-note">
                              <ClipboardList size={15} />
                              <span>Se habilita cuando completes las series del ejercicio activo.</span>
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
                              <div className="rt-timer-card">
                                <div className="rt-timer-card__head">
                                  <div>
                                    <strong>
                                      Temporizador de {exercise.exercise_name} · Serie {currentSeriesNumber} de {currentExerciseTotalSeries}
                                    </strong>
                                    <p>
                                      Tiempo sugerido: {suggestedTimerSeconds}s. La voz anuncia ejercicio, serie, aviso de 10 segundos y cierre del conteo.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    className={`rt-btn${voiceTimerEnabled ? "" : " rt-btn--ghost"}`}
                                    onClick={handleToggleVoiceTimer}
                                  >
                                    {voiceTimerEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                                    {voiceTimerEnabled ? "Voz activa" : "Voz apagada"}
                                  </button>
                                </div>

                                <div className="rt-timer-card__controls">
                                  <label className="rt-timer-card__input">
                                    <span>Segundos</span>
                                    <input
                                      className="rt-input rt-input--small"
                                      type="number"
                                      min={0}
                                      max={600}
                                      value={timerSeconds}
                                      onChange={(event) => handleTimerInputChange(event.target.value)}
                                      disabled={isBusy}
                                    />
                                  </label>

                                  <div className="rt-timer-card__actions">
                                    <button
                                      type="button"
                                      className="rt-btn"
                                      onClick={handleStartTimer}
                                      disabled={isBusy || timerSeconds <= 0 || currentExerciseCompleted}
                                    >
                                      <PlayCircle size={14} />
                                      {timerRunning ? "Reiniciar conteo" : "Iniciar conteo"}
                                    </button>
                                    <button
                                      type="button"
                                      className="rt-btn rt-btn--ghost"
                                      onClick={handlePauseTimer}
                                      disabled={isBusy || !timerRunning}
                                    >
                                      Pausar
                                    </button>
                                    <button
                                      type="button"
                                      className="rt-btn rt-btn--ghost"
                                      onClick={handleResetTimer}
                                      disabled={isBusy}
                                    >
                                      <TimerReset size={14} />
                                      Restablecer
                                    </button>
                                  </div>
                                </div>

                                <div className="rt-timer-card__status">
                                  <strong>{formatTimerLabel(timerRemaining)}</strong>
                                  <span>
                                    {timerRunning
                                      ? timerTarget
                                        ? `${timerTarget.exerciseName} · Serie ${timerTarget.seriesNumber}`
                                        : "Conteo activo"
                                      : timerRemaining === 0
                                        ? "Conteo finalizado. Ya puedes marcar la serie."
                                        : "Listo para iniciar la serie actual"}
                                  </span>
                                </div>
                              </div>

                              {!currentExerciseCompleted ? (
                                <>
                                  <p className="rt-block-current__copy">
                                    Inicia el temporizador para esta serie. Al finalizar, registra la serie completada para avanzar.
                                  </p>
                                  <div className="rt-actions">
                                    <button
                                      className="rt-btn"
                                      onClick={() => void handleCompleteCurrentSeries()}
                                      disabled={
                                        isBusy ||
                                        !timerMatchesCurrentSeries ||
                                        timerRunning ||
                                        timerRemaining !== 0
                                      }
                                    >
                                      {busyAction === "complete-series"
                                        ? "Guardando serie..."
                                        : `Finalizar serie ${currentSeriesNumber}`}
                                    </button>
                                  </div>
                                </>
                              ) : nextExercise ? (
                                <>
                                  <p className="rt-block-current__copy">
                                    Completaste todas las series de este ejercicio. Avanza cuando estés listo para continuar.
                                  </p>
                                  <div className="rt-actions">
                                    <button className="rt-btn" onClick={handleAdvanceExercise} disabled={isBusy}>
                                      Avanzar a {nextExercise.exercise_name}
                                    </button>
                                  </div>
                                </>
                              ) : allSeriesCompleted ? (
                                <>
                                  <p className="rt-block-current__copy">
                                    Todos los ejercicios y series quedaron completados. Registra el cierre final de la sesión.
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
                                    <button className="rt-btn" onClick={() => void handleFinishSession()} disabled={isBusy}>
                                      {busyAction === "finish-session"
                                        ? "Finalizando día..."
                                        : "Finalizar día de entrenamiento"}
                                    </button>
                                  </div>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    {activeDaySession && allSeriesCompleted && !currentExercise ? (
                      <div className="rt-block-card rt-block-card--completed">
                        <div className="rt-block-card__head">
                          <div>
                            <strong>Sesión lista para cierre</strong>
                            <p>Todas las series fueron registradas correctamente.</p>
                          </div>
                          <span className="rt-pill rt-pill--completed">Completada</span>
                        </div>
                      </div>
                    ) : null}

                    {dayCompleted ? (
                      <div className="rt-session-summary">
                        <strong>Resumen registrado</strong>
                        <p>
                          {dayExercises.length} ejercicios · {totalSeriesCount} series planificadas.
                        </p>
                      </div>
                    ) : null}
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
