import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, ClipboardList, Dumbbell, ShieldCheck, Sparkles } from "lucide-react";
import "./Routine.css";

export default function Routine() {
  const navigate = useNavigate();

  return (
    <div className="rt">
      <header className="rt-header">
        <button className="rt-back" onClick={() => navigate("/home", { replace: true })}>
          <ArrowLeft size={15} /> <span>Dashboard</span>
        </button>
        <div className="rt-logo">Train<span>Smart</span> <em>AI</em></div>
        <div className="rt-badge"><Sparkles size={13} /> <span>Propuesta UI</span></div>
      </header>

      <main className="rt-main">
        <section className="rt-hero">
          <h1>Rutina personalizada</h1>
          <p>Vista propuesta para HU-06/HU-07. Base visual lista para conectar con la API de generación.</p>
        </section>

        <section className="rt-grid">
          <article className="rt-card">
            <h2><ClipboardList size={16} /> Inputs de generación</h2>
            <ul>
              <li>Perfil físico completado</li>
              <li>Historial de salud validado</li>
              <li>Objetivo y disponibilidad semanal</li>
            </ul>
          </article>

          <article className="rt-card">
            <h2><Dumbbell size={16} /> Estructura sugerida</h2>
            <ul>
              <li>División semanal por grupos</li>
              <li>Ejercicios, series y repeticiones</li>
              <li>Adaptaciones por limitaciones</li>
            </ul>
          </article>

          <article className="rt-card">
            <h2><Calendar size={16} /> Plan semanal</h2>
            <div className="rt-days">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </article>

          <article className="rt-card">
            <h2><ShieldCheck size={16} /> Revisión HITL</h2>
            <p>Espacio para aprobar, ajustar o regenerar antes de guardar la rutina final.</p>
          </article>
        </section>

        <div className="rt-actions">
          <button className="rt-btn rt-btn--ghost" onClick={() => navigate("/home", { replace: true })}>Volver</button>
          <button className="rt-btn">Generar rutina</button>
        </div>
      </main>
    </div>
  );
}