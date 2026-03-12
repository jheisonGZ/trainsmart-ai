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

// ── Guard: solo usuarios autenticados ──────────────────────────────────────
function PrivateRoute({
  user,
  loading,
  children,
}: {
  user: User | null;
  loading: boolean;
  children: ReactNode;
}) {
  if (loading) return <div className="ts-loading"><span className="ts-spin" /></div>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ── Guard: si ya está logueado no vuelve al login ──────────────────────────
function PublicRoute({
  user,
  loading,
  children,
}: {
  user: User | null;
  loading: boolean;
  children: ReactNode;
}) {
  if (loading) return <div className="ts-loading"><span className="ts-spin" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ── Componente que decide: dashboard o perfil ──────────────────────────────
function RootRedirect({ user }: { user: User }) {
  const [checking, setChecking] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const snap = await getDoc(doc(db, "profiles", user.uid));
        setHasProfile(snap.exists() && snap.data()?.completed === true);
      } catch (_e) {
        setHasProfile(false);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, [user.uid]);

  if (checking) return <div className="ts-loading"><span className="ts-spin" /></div>;
  return <Navigate to={hasProfile ? "/home" : "/profile"} replace />;
}

export default function AppRoutes() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route
          path="/"
          element={
            <PublicRoute user={user} loading={loading}>
              <Login />
            </PublicRoute>
          }
        />

        {/* Redirige según si tiene perfil */}
        <Route
          path="/dashboard"
          element={
            loading ? (
              <div className="ts-loading"><span className="ts-spin" /></div>
            ) : user ? (
              <RootRedirect user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Rutas privadas */}
        <Route
          path="/home"
          element={
            <PrivateRoute user={user} loading={loading}>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute user={user} loading={loading}>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/health"
          element={
            <PrivateRoute user={user} loading={loading}>
              <HealthHistory />
            </PrivateRoute>
          }
        />
        <Route
          path="/routine"
          element={
            <PrivateRoute user={user} loading={loading}>
              <Routine />
            </PrivateRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <PrivateRoute user={user} loading={loading}>
              <Progress />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}