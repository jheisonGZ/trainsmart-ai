import { useNavigate } from "react-router-dom";
import { ArrowLeft, Compass, Dumbbell } from "lucide-react";

import "./NotFound.css";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="nf">
      <div className="nf-card">
        <div className="nf-icon-wrap">
          <Dumbbell size={28} strokeWidth={1.5} />
        </div>

        <p className="nf-code">404</p>
        <h1>Esta rutina no existe</h1>
        <p className="nf-copy">
          La página que buscas no está en el plan. Puede que el enlace esté roto o que se haya
          movido a otro lado.
        </p>

        <div className="nf-actions">
          <button className="nf-btn" onClick={() => navigate("/", { replace: true })}>
            <ArrowLeft size={15} /> Volver al inicio
          </button>
        </div>

        <div className="nf-hint">
          <Compass size={13} /> <span>TrainSmart AI</span>
        </div>
      </div>
    </div>
  );
}
