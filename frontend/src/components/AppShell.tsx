import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart2,
  ChevronRight,
  Dumbbell,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./AppShell.css";

type NavItem = {
  path: string;
  label: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    path: "/home",
    label: "Dashboard",
    icon: <LayoutDashboard size={17} />,
    match: (pathname) => pathname === "/home",
  },
  {
    path: "/profile",
    label: "Mi Perfil",
    icon: <User size={17} />,
    match: (pathname) => pathname.startsWith("/profile"),
  },
  {
    path: "/health",
    label: "Salud",
    icon: <HeartPulse size={17} />,
    match: (pathname) => pathname.startsWith("/health"),
  },
  {
    path: "/routine",
    label: "Rutinas",
    icon: <Dumbbell size={17} />,
    match: (pathname) => pathname.startsWith("/routine"),
  },
  {
    path: "/progress",
    label: "Progreso",
    icon: <BarChart2 size={17} />,
    match: (pathname) => pathname.startsWith("/progress"),
  },
];

function getCurrentSectionTitle(pathname: string) {
  return navItems.find((item) => item.match(pathname))?.label ?? "TrainSmart AI";
}

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { firebaseUser, supabaseUser, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const userDisplayName = useMemo(() => {
    return (
      firebaseUser?.displayName?.trim() ??
      supabaseUser?.email?.split("@")[0] ??
      "Usuario"
    );
  }, [firebaseUser?.displayName, supabaseUser?.email]);

  const userInitial = userDisplayName[0]?.toUpperCase() ?? "U";
  const currentTitle = getCurrentSectionTitle(location.pathname);

  useEffect(() => {
    setMenuOpen(false);
    mainScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className={`app-shell${menuOpen ? " app-shell--menu-open" : ""}`}>
      <div
        className="app-shell__overlay"
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />

      <aside className="app-shell__sidebar">
        <div className="app-shell__sidebar-top">
          <div className="app-shell__brand">
            Train<span>Smart</span> <em>AI</em>
          </div>
          <button
            type="button"
            className="app-shell__close-menu"
            onClick={() => setMenuOpen(false)}
            aria-label={"Cerrar men\u00fa"}
          >
            <X size={18} />
          </button>
        </div>

        <div className="app-shell__account">
          <div className="app-shell__avatar">
            {firebaseUser?.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={userDisplayName}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{userInitial}</span>
            )}
          </div>
          <div className="app-shell__account-copy">
            <strong>{userDisplayName}</strong>
            <span>{supabaseUser?.email ?? "Sesi\u00f3n activa"}</span>
          </div>
        </div>

        <nav className="app-shell__nav">
          {navItems.map((item) => {
            const isActive = item.match(location.pathname);

            return (
              <button
                key={item.path}
                type="button"
                className={`app-shell__nav-item${isActive ? " app-shell__nav-item--active" : ""}`}
                onClick={() => navigate(item.path, { replace: true })}
              >
                <span className="app-shell__nav-icon">{item.icon}</span>
                <span className="app-shell__nav-label">{item.label}</span>
                {isActive ? <ChevronRight size={14} /> : null}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className="app-shell__signout"
          onClick={() => void signOut().then(() => navigate("/", { replace: true }))}
        >
          <LogOut size={15} />
          <span>{"Cerrar sesi\u00f3n"}</span>
        </button>
      </aside>

      <div className="app-shell__main" ref={mainScrollRef}>
        <header className="app-shell__topbar">
          <button
            type="button"
            className="app-shell__menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label={"Abrir men\u00fa"}
          >
            <Menu size={22} />
          </button>

          <div className="app-shell__topbar-copy">
            <span>TrainSmart AI</span>
            <strong>{currentTitle}</strong>
          </div>

          <div className="app-shell__topbar-avatar">
            {firebaseUser?.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={userDisplayName}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{userInitial}</span>
            )}
          </div>
        </header>

        <div className="app-shell__page">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
