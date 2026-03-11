import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/profile">Perfil</Link>
      <Link to="/health">Salud</Link>
      <Link to="/routine">Rutina</Link>
      <Link to="/progress">Progreso</Link>
    </nav>
  );
}

export default Navbar;