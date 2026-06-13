import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

import { ApiClientError, api } from "../lib/api";
import type { RoutineAudioAccess } from "../types/api";

interface RoutineAudioPlayerProps {
  sessionId: string;
  disabled?: boolean;
}

function getAudioErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 403) {
      return "Audio no disponible despues de finalizar la rutina.";
    }

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

export default function RoutineAudioPlayer({
  sessionId,
  disabled = false,
}: RoutineAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioAccess, setAudioAccess] = useState<RoutineAudioAccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setAudioAccess(null);
    setErrorMessage(null);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    if (!disabled) {
      return;
    }

    audioRef.current?.pause();
    setAudioAccess(null);
  }, [disabled]);

  useEffect(() => {
    const audioElement = audioRef.current;

    return () => {
      audioElement?.pause();
    };
  }, []);

  const handleLoadAudio = async () => {
    if (disabled || loading) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const access = await api.post<RoutineAudioAccess>(
        `/sessions/${sessionId}/audio`,
      );
      setAudioAccess(access);
    } catch (error) {
      setErrorMessage(getAudioErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (disabled) {
    return (
      <div className="rt-audio rt-audio--disabled">
        Audio no disponible despues de finalizar la rutina.
      </div>
    );
  }

  return (
    <div className="rt-audio">
      <div className="rt-audio__head">
        <div>
          <strong>Guia en audio</strong>
          <p>Escucha una descripcion breve de la rutina mientras la sesion este activa.</p>
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
              ? "Renovar acceso"
              : "Escuchar descripcion"}
        </button>
      </div>

      {audioAccess ? (
        <audio
          ref={audioRef}
          className="rt-audio__player"
          src={audioAccess.audioUrl}
          controls
          preload="none"
        />
      ) : null}

      {errorMessage ? <p className="rt-audio__error">{errorMessage}</p> : null}
    </div>
  );
}
