import { MobileShell } from '../components/MobileShell';

const faqs = [
  '¿Cómo registro un gasto?',
  '¿Cómo creo un presupuesto?',
  '¿Qué son los recordatorios y cómo los uso?',
  '¿Cómo veo mi balance y resumen financiero?'
];

export const HelpPage = () => (
  <MobileShell title="Ayuda" subtitle="Aprende a usar la app" back>
    <div className="panel success">
      <h3>¡Bienvenido a tu Plata, sin drama!</h3>
      <p>Esta guía te ayudará a gestionar tu dinero de forma simple y efectiva.</p>
    </div>
    <div className="stack">
      {faqs.map((f) => (
        <details key={f} className="faq">
          <summary>{f}</summary>
          <p>Ve al módulo relacionado desde el dashboard y completa el formulario.</p>
        </details>
      ))}
    </div>
  </MobileShell>
);
