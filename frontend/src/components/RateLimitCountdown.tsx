import { useEffect, useRef, useState } from "react";

import "./RateLimitCountdown.css";

interface RateLimitCountdownProps {
  seconds: number;
  message: string;
  onComplete?: () => void;
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default function RateLimitCountdown({
  seconds,
  message,
  onComplete,
}: RateLimitCountdownProps) {
  const initialSeconds = useRef(Math.max(1, Math.round(seconds))).current;
  const [remaining, setRemaining] = useState(initialSeconds);
  const hasCompleted = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!hasCompleted.current) {
        hasCompleted.current = true;
        onComplete?.();
      }
      return;
    }

    const timer = setTimeout(() => setRemaining((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onComplete]);

  const size = 44;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = remaining / initialSeconds;
  const offset = circumference * (1 - progress);

  return (
    <div className="rlc" role="status" aria-live="polite">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rlc-ring"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--rlc-track, rgba(255,255,255,0.12))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--rlc-fill, #ff4a2b)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="rlc-ring__fill"
        />
      </svg>
      <div className="rlc-body">
        <p className="rlc-message">{message}</p>
        <p className="rlc-time">
          Disponible en <strong>{formatCountdown(remaining)}</strong>
        </p>
      </div>
    </div>
  );
}
