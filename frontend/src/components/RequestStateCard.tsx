import type { CSSProperties } from "react";

interface RequestStateCardProps {
  title: string;
  description: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

const containerStyle: CSSProperties = {
  minHeight: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 20px 48px",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#101010",
  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  padding: 28,
  color: "#f0f0f0",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "1.2rem",
  lineHeight: 1.2,
};

const descriptionStyle: CSSProperties = {
  margin: "10px 0 0",
  color: "rgba(255,255,255,0.68)",
  lineHeight: 1.5,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 22,
};

const primaryButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 10,
  background: "#ff4a2b",
  color: "#fff",
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  background: "transparent",
  color: "rgba(255,255,255,0.74)",
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

export default function RequestStateCard({
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: RequestStateCardProps) {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>{title}</h2>
        <p style={descriptionStyle}>{description}</p>

        {(primaryActionLabel || secondaryActionLabel) && (
          <div style={actionsStyle}>
            {primaryActionLabel && onPrimaryAction ? (
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={onPrimaryAction}
              >
                {primaryActionLabel}
              </button>
            ) : null}

            {secondaryActionLabel && onSecondaryAction ? (
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={onSecondaryAction}
              >
                {secondaryActionLabel}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
