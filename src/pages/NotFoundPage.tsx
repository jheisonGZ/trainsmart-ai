import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <main className="login">
    <h1>404</h1>
    <p>Página no encontrada</p>
    <Link to="/">Volver al inicio</Link>
  </main>
);
