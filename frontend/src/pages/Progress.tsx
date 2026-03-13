import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, CalendarDays, CircleCheck, Gauge, TrendingUp } from "lucide-react";
import "./Progress.css";

export default function Progress() {
  const navigate = useNavigate();

  return (
    <div className="pg">
      <header className="pg-header">
        <button className="pg-back" onClick={() => navigate("/home", { replace: true })}>
          <ArrowLeft size={15} /> <span>Dashboard</span>
        </button>
        <div className="pg-logo">Train<span>Smart</span> <em>AI</em></div>
        <div className="pg-badge"><BarChart3 size={13} /> <span>Propuesta UI</span></div>
      </header>

      <main className="pg-main">
        <section className="pg-hero">
          <h1>Seguimiento de progreso</h1>
          <p>Vista propuesta para HU-10/HU-11 con bloques listos para métricas y evolución semanal.</p>
        </section>

        <section className="pg-cards">
          <article className="pg-card">
            <h2><TrendingUp size={16} /> Tendencia mensual</h2>
            <p>Contenedor reservado para gráfico de evolución (peso, fuerza o adherencia).</p>
          </article>

          <article className="pg-card">
            <h2><Gauge size={16} /> Indicadores clave</h2>
            <ul>
              <li>Sesiones completadas</li>
              <li>Consistencia semanal</li>
              <li>Carga total entrenada</li>
            </ul>
          </article>

          <article className="pg-card">
            <h2><CalendarDays size={16} /> Historial reciente</h2>
            <div className="pg-list">
              {["Semana 1", "Semana 2", "Semana 3"].map((item) => (
                <span key={item}><CircleCheck size={14} /> {item}</span>
              ))}
            </div>
          </article>
        </section>

        <div className="pg-actions">
          <button className="pg-btn pg-btn--ghost" onClick={() => navigate("/home", { replace: true })}>Volver</button>
          <button className="pg-btn">Registrar progreso</button>
        </div>
      </main>
    </div>
  );
}