import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";

import { ApiClientError, api } from "../lib/api";
import type { RoutineAudioAccess } from "../types/api";

interface RoutineAudioPlayerProps {
  sessionId: string;
}

function getAudioErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 412) {
      return "La narracion por voz no esta habilitada en este momento.";
    }

    if (error.status === 429) {
      return "ElevenLabs alcanzo su limite temporal de uso. Intenta de nuevo mas tarde.";
    }

    if (error.status === 503) {
      return "El proveedor de audio no esta disponible temporalmente.";
    }
  }

  return error instanceof Error
    ? error.message
    : "No fue posible cargar el audio de la rutina.";
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export default function RoutineAudioPlayer({ sessionId }: RoutineAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioAccess, setAudioAccess] = useState<RoutineAudioAccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setAudioAccess(null);
    setErrorMessage(null);
    setLoading(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [sessionId]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioAccess]);

  const handleLoadAudio = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const access = await api.post<RoutineAudioAccess>(
        `/sessions/${sessionId}/audio`,
      );
      setAudioAccess(access);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    } catch (error) {
      setErrorMessage(getAudioErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      void audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const value = Number(event.target.value);

    if (audio) {
      audio.currentTime = value;
    }

    setCurrentTime(value);
  };

  return (
    <div className="rt-audio">
      <div className="rt-audio__head">
        <div>
          <strong>Guía en audio</strong>
          <p>Escucha la explicación de tu rutina las veces que quieras, antes, durante o después de entrenar.</p>
        </div>
        <button
          type="button"
          className="rt-btn"
          onClick={() => void handleLoadAudio()}
          disabled={loading}
        >
          <Volume2 size={14} />
          {loading
            ? "Generando audio..."
            : audioAccess
              ? "Volver a escuchar"
              : "Escuchar rutina"}
        </button>
      </div>

      {audioAccess ? (
        <div className="rt-audio__player">
          <button
            type="button"
            className="rt-audio__toggle"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <span className="rt-audio__time">{formatTime(currentTime)}</span>

          <input
            type="range"
            className="rt-audio__seek"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeek}
            aria-label="Progreso del audio"
          />

          <span className="rt-audio__time">{formatTime(duration)}</span>

          <audio ref={audioRef} src={audioAccess.audioUrl} preload="metadata" />
        </div>
      ) : null}

      {errorMessage ? <p className="rt-audio__error">{errorMessage}</p> : null}
    </div>
  );
}
