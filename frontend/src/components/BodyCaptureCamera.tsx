import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, X } from "lucide-react";

import "./BodyCaptureCamera.css";

interface BodyCaptureCameraProps {
  referenceImageUrl: string | null;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export default function BodyCaptureCamera({
  referenceImageUrl,
  onCapture,
  onClose,
}: BodyCaptureCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      setError(null);
      setReady(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Tu navegador no permite acceso a la camara desde aqui. Usa 'Subir foto corporal' en su lugar.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setReady(true);
      } catch {
        if (!cancelled) {
          setError("No se pudo acceder a la camara. Revisa los permisos del navegador, o usa 'Subir foto corporal'.");
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    onCapture(dataUrl);
  };

  return (
    <div className="bcc-overlay" role="dialog" aria-modal="true">
      <div className="bcc-panel">
        <div className="bcc-header">
          <span>Foto guiada de progreso</span>
          <button type="button" className="bcc-icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="bcc-stage">
          <video ref={videoRef} className="bcc-video" muted playsInline />

          {referenceImageUrl && showGuide ? (
            <img className="bcc-guide" src={referenceImageUrl} alt="Silueta de referencia" />
          ) : null}

          {error ? <div className="bcc-error">{error}</div> : null}
        </div>

        <p className="bcc-hint">
          {referenceImageUrl
            ? "Alinea tu cuerpo con la silueta semitransparente de tu foto anterior para mantener el mismo angulo y distancia."
            : "Esta sera tu foto de referencia. Procura buena luz y que se vea el cuerpo completo."}
        </p>

        <div className="bcc-actions">
          {referenceImageUrl ? (
            <button
              type="button"
              className="pg-btn pg-btn--ghost"
              onClick={() => setShowGuide((current) => !current)}
            >
              {showGuide ? "Ocultar guia" : "Mostrar guia"}
            </button>
          ) : null}

          <button
            type="button"
            className="pg-btn pg-btn--ghost"
            onClick={() => setFacingMode((current) => (current === "user" ? "environment" : "user"))}
          >
            <RotateCcw size={16} /> Girar camara
          </button>

          <button type="button" className="pg-btn" onClick={handleCapture} disabled={!ready}>
            <Camera size={16} /> Capturar foto
          </button>
        </div>
      </div>
    </div>
  );
}
