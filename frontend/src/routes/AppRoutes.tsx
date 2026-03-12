import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

import Profile from "../pages/Profile";
import HealthHistory from "../pages/HealthHistory";
import Routine from "../pages/Routine";
import Progress from "../pages/Progress";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";


// ── Hook para bloquear botón atrás del navegador ─────────────────────────────
function useBlockBack() {
  useEffect(() => {
    // Empuja una entrada extra al historial para "absorber" el botón atrás
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);
}

function PrivateRoute({ user, loading, children }: { user: User | null; loading: boolean; children: ReactNode }) {
  if (loading) return <div className="ts-loading"><span className="ts-spin" /></div>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ user, loading, children }: { user: User | null; loading: boolean; children: ReactNode }) {
  if (loading) return <div className="ts-loading"><span className="ts-spin" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ── Flujo: perfil → historial de salud → dashboard ──────────────────────────
function RootRedirect({ user }: { user: User }) {
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false; // evita setear estado si el componente se desmontó

    const check = async () => {
      console.log("🔍 RootRedirect uid:", user.uid);
      try {
        // 1. ¿Tiene perfil completado?
        const profileSnap = await getDoc(doc(db, "profiles", user.uid));
        if (cancelled) return;
        console.log("📋 profile exists:", profileSnap.exists(), "completed:", profileSnap.data()?.completed);

        const hasProfile = profileSnap.exists() && profileSnap.data()?.completed === true;
        if (!hasProfile) { setDestination("/profile"); return; }

        // 2. ¿Tiene historial de salud completado?
        const healthSnap = await getDoc(doc(db, "health_history", user.uid));
        if (cancelled) return;
        console.log("🏥 health exists:", healthSnap.exists(), "completed:", healthSnap.data()?.completed);

        const hasHealth = healthSnap.exists() && healthSnap.data()?.completed === true;
        if (!hasHealth) { setDestination("/health"); return; }

        // 3. Todo completo → dashboard
        setDestination("/home");
      } catch (e) {
        console.error("❌ RootRedirect error:", e);
        if (!cancelled) setDestination("/profile");
      }
    };

    check();
    return () => { cancelled = true; }; // cleanup al desmontar
  }, [user.uid]);

  // Mientras consulta Firestore, mostrar spinner
  if (destination === null) return <div className="ts-loading"><span className="ts-spin" /></div>;

  console.log("➡️ Navegando a:", destination);
  return <Navigate to={destination} replace />;
}

function BlockedRoute({ children }: { children: ReactNode }) {
  useBlockBack();
  return <>{children}</>;
}

export default function AppRoutes() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u: User | null) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicRoute user={user} loading={loading}><Login /></PublicRoute>} />
        <Route path="/dashboard" element={
          loading
            ? <div className="ts-loading"><span className="ts-spin" /></div>
            : user
              ? <RootRedirect user={user} />
              : <Navigate to="/" replace />
        } />
        <Route path="/home"     element={<PrivateRoute user={user} loading={loading}><BlockedRoute><Dashboard /></BlockedRoute></PrivateRoute>} />
        <Route path="/profile"  element={<PrivateRoute user={user} loading={loading}><BlockedRoute><Profile /></BlockedRoute></PrivateRoute>} />
        <Route path="/health"   element={<PrivateRoute user={user} loading={loading}><BlockedRoute><HealthHistory /></BlockedRoute></PrivateRoute>} />
        <Route path="/routine"  element={<PrivateRoute user={user} loading={loading}><Routine /></PrivateRoute>} />
        <Route path="/progress" element={<PrivateRoute user={user} loading={loading}><Progress /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}