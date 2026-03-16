import { useEffect, useRef, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { isSupabaseConfigured, supabaseConfigError } from "../lib/supabaseClient";
import "./Login.css";

type View = "login" | "register" | "forgot";
type AuthError = { code?: string; message?: string };

const authErrorMessage = (error: AuthError): string => {
  const map: Record<string, string> = {
    "auth/invalid-email": "El correo electrónico no es válido",
    "auth/user-not-found": "No existe una cuenta con ese correo",
    "auth/wrong-password": "Contraseña incorrecta",
    "auth/invalid-credential": "Correo o contraseña incorrectos",
    "auth/email-already-in-use": "Ese correo ya está registrado",
    "auth/weak-password": "La contraseña es demasiado débil",
    "auth/too-many-requests": "Demasiados intentos. Intenta más tarde",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet",
    "auth/popup-closed-by-user": "Cerraste la ventana de Google",
    "auth/cancelled-popup-request": "La solicitud de Google fue cancelada",
    "auth/account-exists-with-different-credential":
      "Ya existe una cuenta con ese correo",
    "Invalid login credentials": "Correo o contraseña incorrectos",
    "Email not confirmed": "Debes confirmar tu correo antes de ingresar",
  };

  return (
    map[error?.code ?? ""] ??
    error?.message ??
    "Ocurrió un error. Intenta de nuevo"
  );
};

const Alert = Swal.mixin({
  background: "#111",
  color: "#f5f5f5",
  confirmButtonColor: "#ff4a2b",
  cancelButtonColor: "#333",
  customClass: {
    popup: "swal-ts-popup",
    title: "swal-ts-title",
    htmlContainer: "swal-ts-text",
    confirmButton: "swal-ts-btn",
  },
});

const showSuccess = (message: string) =>
  Alert.fire({
    icon: "success",
    title: "Éxito",
    text: message,
    timer: 2000,
    showConfirmButton: false,
  });

const showError = (message: string) =>
  Alert.fire({
    icon: "error",
    title: "Error",
    text: message,
  });

const showWarning = (message: string) =>
  Alert.fire({
    icon: "warning",
    title: "Advertencia",
    text: message,
  });

const showLoading = (message: string) =>
  Alert.fire({
    title: message,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

const showRegistrationSuccess = (registeredEmail: string) =>
  Alert.fire({
    icon: "success",
    title: "Cuenta creada correctamente",
    html: `
      <p style="margin:0 0 10px;">
        Te enviamos un correo de verificaci\u00f3n a <strong>${registeredEmail}</strong>.
      </p>
      <p style="margin:0;">
        Revisa tu bandeja de entrada, valida tu cuenta y luego inicia sesi\u00f3n normalmente.
      </p>
    `,
    confirmButtonText: "Ir a iniciar sesi\u00f3n",
    allowOutsideClick: false,
  });

function Eye({ open }: { open: boolean }) {
  return open ? (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGooglePopupFirebase } = useAuth();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.2 + 0.3,
      opacity: Math.random() * 0.3 + 0.07,
    }));

    let animationId = 0;

    const animate = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -1;
        }

        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy *= -1;
        }

        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(255,74,43,${particle.opacity})`;
        context.fill();
      });

      for (let leftIndex = 0; leftIndex < particles.length; leftIndex += 1) {
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < particles.length;
          rightIndex += 1
        ) {
          const dx = particles[leftIndex].x - particles[rightIndex].x;
          const dy = particles[leftIndex].y - particles[rightIndex].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            context.beginPath();
            context.moveTo(particles[leftIndex].x, particles[leftIndex].y);
            context.lineTo(particles[rightIndex].x, particles[rightIndex].y);
            context.strokeStyle = `rgba(255,74,43,${0.06 * (1 - distance / 120)})`;
            context.lineWidth = 0.5;
            context.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const reset = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setShowPass(false);
    setShowConfirmPass(false);
  };

  const switchView = (nextView: View) => {
    reset();
    setView(nextView);
  };

  const strength = (value: string) =>
    Math.min(
      (value.length >= 6 ? 1 : 0) +
        (/[A-Z]/.test(value) ? 1 : 0) +
        (/[0-9]/.test(value) ? 1 : 0) +
        (/[^a-zA-Z0-9]/.test(value) ? 1 : 0),
      4,
    );

  const strengthLabel = ["", "Débil", "Regular", "Buena", "Fuerte"];
  const strengthColor = ["", "#ff4a2b", "#ff8c00", "#f0c040", "#32c878"];

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    showLoading("Verificando credenciales...");

    try {
      const result = await signIn(email, password);
      Swal.close();

      if (result.warning) {
        await showWarning(result.warning);
      }

      await showSuccess("Bienvenido de vuelta");
      navigate("/dashboard");
    } catch (error) {
      Swal.close();
      await showError(authErrorMessage(error as AuthError));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      await showError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      await showError("La contraseña debe tener mínimo 6 caracteres");
      return;
    }

    setLoading(true);
    showLoading("Creando tu cuenta...");

    try {
      const trimmedEmail = email.trim();
      const trimmedName = name.trim();
      const result = await signUp(trimmedEmail, password, {
        displayName: trimmedName || undefined,
      });

      Swal.close();

      if (result.requiresEmailVerification) {
        await showRegistrationSuccess(result.email ?? trimmedEmail);
        reset();
        setEmail(result.email ?? trimmedEmail);
        setView("login");
        navigate("/", { replace: true });
        return;
      }

      if (result.warning) {
        await showWarning(result.warning);
      }

      await showSuccess("Cuenta creada correctamente");
      navigate("/dashboard");
    } catch (error) {
      Swal.close();
      await showError(authErrorMessage(error as AuthError));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    showLoading("Enviando correo...");

    try {
      await sendPasswordResetEmail(auth, email);
      Swal.close();
      await showSuccess("Correo enviado. Revisa tu bandeja de entrada");
      switchView("login");
    } catch (error) {
      Swal.close();
      await showError(authErrorMessage(error as AuthError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    showLoading("Conectando con Google...");

    try {
      const result = await signInWithGooglePopupFirebase();
      Swal.close();

      if (result.redirected) {
        return;
      }

      await showSuccess("Sesión iniciada correctamente");
      navigate("/dashboard");
    } catch (error) {
      Swal.close();
      await showError(authErrorMessage(error as AuthError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`lr${mounted ? " lr--on" : ""}`}>
      <canvas ref={canvasRef} className="lr-canvas" />

      <div className="lr-visual">
        <div
          className="lr-vbg"
          style={{ backgroundImage: "url('/images/login.webp')" }}
        />
        <div className="lr-voverlay" />
        <div className="lr-vcontent">
          <div className="lr-logo">
            Train<span>Smart</span> <em>AI</em>
          </div>
          <h1 className="lr-headline">
            Elevate
            <br />
            Your
            <br />
            <span>Workout</span>
          </h1>
          <p className="lr-vsub">
            Rutinas personalizadas generadas por IA, adaptadas a tu cuerpo y
            objetivos.
          </p>
          <div className="lr-badge">
            <span className="lr-bdot" />
            Motor IA activo · +2.400 rutinas
          </div>
        </div>
      </div>

      <div className="lr-panel">
        <div className="lr-logo lr-logo-m">
          Train<span>Smart</span> <em>AI</em>
        </div>

        {!isSupabaseConfigured && (
          <div
            style={{
              marginBottom: 20,
              padding: "14px 16px",
              borderRadius: 16,
              border: "1px solid rgba(255,74,43,0.35)",
              background: "rgba(255,74,43,0.08)",
              color: "#f5f5f5",
              fontSize: "0.92rem",
              lineHeight: 1.5,
            }}
          >
            {supabaseConfigError}
          </div>
        )}

        <div className="lr-dots">
          {(["login", "register", "forgot"] as View[]).map((option) => (
            <button
              key={option}
              className={`lr-dot${view === option ? " lr-dot--on" : ""}`}
              onClick={() => switchView(option)}
            />
          ))}
        </div>

        {view === "login" && (
          <div className="lr-form" key="login">
            <p className="lr-ew">Bienvenido de vuelta</p>
            <h2 className="lr-title">Inicia Sesión</h2>
            <p className="lr-sub">
              Accede a tus rutinas y progreso personalizado.
            </p>
            <form onSubmit={handleLogin} noValidate>
              <div className="lr-f">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="lr-f">
                <label>Contraseña</label>
                <div className="lr-iw">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="has-icon"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="lr-eye"
                    onClick={() => setShowPass((current) => !current)}
                  >
                    <Eye open={showPass} />
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="lr-forgot"
                onClick={() => switchView("forgot")}
              >
                ¿Olvidaste tu contraseña?
              </button>
              <button type="submit" className="lr-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="lr-spin" />
                    Verificando...
                  </>
                ) : (
                  "Ingresar al sistema"
                )}
              </button>
            </form>
            <div className="lr-div">
              <div className="lr-dl" />
              <span>o continúa con</span>
              <div className="lr-dl" />
            </div>
            <button className="lr-gbtn" onClick={handleGoogle} disabled={loading}>
              <svg width="17" height="17" viewBox="0 0 48 48">
                <path
                  fill="#FFC107"
                  d="M43.6 20H24v8h11.3C33.7 33.3 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7l6.6 4.8C14.5 16.1 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.2 0 9.9-1.9 13.5-5L31.8 33c-2.1 1.4-4.7 2.2-7.8 2.2-5.2 0-9.6-3.5-11.2-8.2l-6.6 5.1C9.6 39.5 16.3 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l5.7 4.7C40.4 35 43.7 30 43.7 24c0-1.3-.1-2.7-.1-4z"
                />
              </svg>
              Continuar con Google
            </button>
            <p className="lr-sw">
              ¿No tienes cuenta?{" "}
              <button onClick={() => switchView("register")}>
                Regístrate gratis
              </button>
            </p>
          </div>
        )}

        {view === "register" && (
          <div className="lr-form" key="register">
            <p className="lr-ew">Comienza hoy</p>
            <h2 className="lr-title">Crear Cuenta</h2>
            <p className="lr-sub">
              Tu primera rutina personalizada está a un paso.
            </p>
            <form onSubmit={handleRegister} noValidate>
              <div className="lr-f">
                <label>Nombre completo</label>
                <input
                  type="text"
                  placeholder="Juan García"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="lr-f">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="lr-f">
                <label>Contraseña</label>
                <div className="lr-iw">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="has-icon"
                  />
                  <button
                    type="button"
                    className="lr-eye"
                    onClick={() => setShowPass((current) => !current)}
                  >
                    <Eye open={showPass} />
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="lr-str">
                    <div className="lr-sbars">
                      {[0, 1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className="lr-ss"
                          style={{
                            background:
                              index < strength(password)
                                ? strengthColor[strength(password)]
                                : "rgba(255,255,255,0.08)",
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="lr-sl"
                      style={{ color: strengthColor[strength(password)] }}
                    >
                      {strengthLabel[strength(password)]}
                    </span>
                  </div>
                )}
              </div>
              <div className="lr-f">
                <label>Confirmar contraseña</label>
                <div className="lr-iw">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    className="has-icon"
                    style={{
                      borderColor:
                        confirmPassword && confirmPassword !== password
                          ? "var(--r)"
                          : undefined,
                    }}
                  />
                  <button
                    type="button"
                    className="lr-eye"
                    onClick={() => setShowConfirmPass((current) => !current)}
                  >
                    <Eye open={showConfirmPass} />
                  </button>
                </div>
              </div>
              <p className="lr-terms">
                Al registrarte aceptas nuestros <a href="#">Términos</a> y{" "}
                <a href="#">Privacidad</a>.
              </p>
              <button type="submit" className="lr-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="lr-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  "Crear mi cuenta"
                )}
              </button>
            </form>
            <p className="lr-sw">
              ¿Ya tienes cuenta?{" "}
              <button onClick={() => switchView("login")}>Inicia sesión</button>
            </p>
          </div>
        )}

        {view === "forgot" && (
          <div className="lr-form" key="forgot">
            <button className="lr-back" onClick={() => switchView("login")}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Volver al login
            </button>
            <p className="lr-ew">¿Problemas para entrar?</p>
            <h2 className="lr-title">Recuperar Acceso</h2>
            <p className="lr-sub">
              Te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <form onSubmit={handleForgot} noValidate>
              <div className="lr-f">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                className="lr-btn"
                disabled={loading}
                style={{ marginTop: "6px" }}
              >
                {loading ? (
                  <>
                    <span className="lr-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar enlace de recuperación"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
