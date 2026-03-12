import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { gsap } from "gsap";
import {
  LayoutDashboard, User, HeartPulse, Dumbbell,
  BarChart2, LogOut, Target, Calendar, Zap, Scale,
  Bot, Menu, X, ChevronRight,
} from "lucide-react";
import "./Dashboard.css";

interface Profile {
  name: string; goal: string; days_per_week: number;
  experience_level: string; imc: number; imc_category: string;
}

const goalLabel: Record<string, string> = {
  lose_fat: "Perder grasa", gain_muscle: "Ganar músculo",
  general_fitness: "Estar activo", strength: "Ganar fuerza",
};
const expLabel: Record<string, string> = {
  beginner: "Principiante", returning: "Regresando", intermediate: "Intermedio",
};

const isMobile = () => window.innerWidth <= 768;

export default function Dashboard() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = auth.currentUser;

  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const sideRef    = useRef<HTMLElement>(null);
  const headerRef  = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "profiles", user.uid))
      .then(snap => { if (snap.exists()) setProfile(snap.data() as Profile); })
      .finally(() => setLoading(false));
  }, [user]);

  // Entrada — solo desktop, evita conflicto con transform mobile
  useEffect(() => {
    if (loading) return;
    if (isMobile()) return; // no animar sidebar en mobile

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(sideRef.current,    { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55 })
        .fromTo(headerRef.current,  { y: -18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, "-=0.25")
        .fromTo(sectionRef.current, { y: 24,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, "-=0.15");

      // Stats: solo si existen en el DOM
      const statEls = document.querySelectorAll(".db-stat");
      if (statEls.length > 0) {
        tl.fromTo(statEls, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.07 }, "-=0.3");
      }
    });
    return () => ctx.revert();
  }, [loading]);

  // Menú mobile con GSAP
  useEffect(() => {
    if (!sideRef.current || !overlayRef.current) return;
    if (!isMobile()) return;

    if (menuOpen) {
      gsap.set(sideRef.current, { x: -260 }); // asegura posición inicial
      gsap.to(overlayRef.current, { opacity: 1, pointerEvents: "all", duration: 0.2 });
      gsap.to(sideRef.current,    { x: 0, duration: 0.32, ease: "power3.out" });
    } else {
      gsap.to(overlayRef.current, { opacity: 0, pointerEvents: "none", duration: 0.18 });
      gsap.to(sideRef.current,    { x: -260, duration: 0.28, ease: "power3.in" });
    }
  }, [menuOpen]);

  const firstName = profile?.name?.split(" ")[0] ?? user?.displayName?.split(" ")[0] ?? "Atleta";
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  if (loading) return (
    <div className="db-loading">
      <div className="db-loading-inner">
        <span className="db-spin" />
        <span>Cargando...</span>
      </div>
    </div>
  );

  const navItems = [
    { icon: <LayoutDashboard size={17} />, label: "Dashboard", path: "/home" },
    { icon: <User size={17} />,            label: "Mi Perfil",  path: "/profile" },
    { icon: <HeartPulse size={17} />,      label: "Salud",      path: "/health" },
    { icon: <Dumbbell size={17} />,        label: "Rutinas",    path: "/routine" },
    { icon: <BarChart2 size={17} />,       label: "Progreso",   path: "/progress" },
  ];

  const stats = profile ? [
    { icon: <Target size={18} />,   label: "Objetivo",    val: goalLabel[profile.goal] ?? profile.goal },
    { icon: <Calendar size={18} />, label: "Días/semana", val: `${profile.days_per_week} días` },
    { icon: <Zap size={18} />,      label: "Nivel",       val: expLabel[profile.experience_level] ?? profile.experience_level },
    { icon: <Scale size={18} />,    label: "IMC",         val: `${profile.imc} · ${profile.imc_category}` },
  ] : [];

  return (
    <div className="db">
      {/* Overlay mobile */}
      <div ref={overlayRef} className="db-overlay" onClick={() => setMenuOpen(false)} />

      {/* Sidebar */}
      <aside ref={sideRef} className="db-side">
        <div className="db-side-top">
          <div className="db-logo">Train<span>Smart</span> <em>AI</em></div>
          <button className="db-close-menu" onClick={() => setMenuOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="db-nav">
          {navItems.map(({ icon, label, path }) => (
            <button
              key={path}
              className={`db-nav-item${location.pathname === path ? " db-nav-item--on" : ""}`}
              onClick={() => { navigate(path); setMenuOpen(false); }}
            >
              <span className="db-nav-icon">{icon}</span>
              <span className="db-nav-label">{label}</span>
              {location.pathname === path && <ChevronRight size={14} className="db-nav-arrow" />}
            </button>
          ))}
        </nav>

        <button className="db-signout" onClick={() => { auth.signOut(); navigate("/"); }}>
          <LogOut size={15} />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      {/* Main */}
      <main className="db-main">
        {/* Topbar solo mobile */}
        <header className="db-topbar">
          <button className="db-hamburger" onClick={() => setMenuOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="db-topbar-logo">Train<span>Smart</span> <em>AI</em></div>
          <div className="db-topbar-avatar">
            {user?.photoURL
              ? <img src={user.photoURL} alt={firstName} referrerPolicy="no-referrer" />
              : <span>{firstName[0].toUpperCase()}</span>
            }
          </div>
        </header>

        <div className="db-content">
          {/* Hero */}
          <div ref={headerRef} className="db-hero">
            <div>
              <p className="db-greeting">{greeting}</p>
              <h1 className="db-name">{firstName}</h1>
            </div>
            <div className="db-hero-right">
              <div className="db-desktop-avatar">
                {user?.photoURL
                  ? <img src={user.photoURL} alt={firstName} referrerPolicy="no-referrer" />
                  : <span>{firstName[0].toUpperCase()}</span>
                }
              </div>
              {profile && (
                <div className="db-hero-badge">
                  <Zap size={13} />
                  {expLabel[profile.experience_level] ?? profile.experience_level}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          {profile && (
            <div className="db-stats">
              {stats.map(({ icon, label, val }) => (
                <div className="db-stat" key={label}>
                  <div className="db-stat-icon">{icon}</div>
                  <div className="db-stat-body">
                    <span className="db-stat-label">{label}</span>
                    <span className="db-stat-val">{val}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rutina */}
          <section ref={sectionRef} className="db-section">
            <div className="db-section-head">
              <h2>Rutina de hoy</h2>
              <button className="db-action" onClick={() => navigate("/routine")}>
                Generar rutina <ChevronRight size={14} />
              </button>
            </div>
            <div className="db-empty">
              <div className="db-empty-icon-wrap">
                <Bot size={32} strokeWidth={1.5} />
              </div>
              <p className="db-empty-title">Aún no tienes una rutina generada</p>
              <p className="db-empty-sub">La IA creará un plan personalizado basado en tu perfil y objetivos.</p>
              <button className="db-cta" onClick={() => navigate("/routine")}>
                Generar mi primera rutina <ChevronRight size={16} />
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}