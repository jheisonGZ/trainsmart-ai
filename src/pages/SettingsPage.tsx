import { useNavigate } from 'react-router-dom';
import { MobileShell } from '../components/MobileShell';
import { useApp } from '../context/AppContext';

export const SettingsPage = () => {
  const { logout } = useApp();
  const navigate = useNavigate();
  return (
    <MobileShell title="Configuración" subtitle="Gestiona tu cuenta" back>
      <article className="panel">
        <h3>Tu Plata, Sin Drama</h3>
        <p>Versión 1.0.0</p>
      </article>
      <button className="danger" onClick={() => { logout(); navigate('/'); }}>Cerrar sesión</button>
    </MobileShell>
  );
};
