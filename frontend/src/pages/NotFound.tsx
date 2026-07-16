import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import illustration from "../assets/notfound-illustration.svg?raw";
import "./NotFound.css";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="nf">
      <div className="nf-card">
        <div
          className="nf-illustration"
          dangerouslySetInnerHTML={{ __html: illustration }}
        />

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
      </div>
    </div>
  );
}
