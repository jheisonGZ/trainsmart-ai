import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useApp();

  const handleAccess = (provider: 'google' | 'apple' | 'guest') => {
    login(provider);
    navigate('/dashboard');
  };

  return (
    <main className="login">
      <div className="logo">💳</div>
      <h1>Tu Plata, Sin Drama</h1>
      <p>Tu dinero al día, tu vida tranquila</p>
      <div className="auth-box">
        <h2>Comenzar</h2>
        <button onClick={() => handleAccess('google')}>Continuar con Google</button>
        <button onClick={() => handleAccess('apple')}>Continuar con Apple</button>
        <button className="ghost" onClick={() => handleAccess('guest')}>
          Probar sin registrarse
        </button>
      </div>
    </main>
  );
};
