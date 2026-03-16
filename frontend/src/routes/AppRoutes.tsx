import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppShell from "../components/AppShell";
import RequestStateCard from "../components/RequestStateCard";
import { useAuth } from "../context/AuthContext";
import AuthCallback from "../pages/AuthCallback";
import Dashboard from "../pages/Dashboard";
import HealthHistory from "../pages/HealthHistory";
import Login from "../pages/Login";
import Profile from "../pages/Profile";
import Progress from "../pages/Progress";
import Routine from "../pages/Routine";
import { ApiClientError, api } from "../lib/api";
import type { AuthMeResponse } from "../types/api";

function LoadingScreen() {
  return (
    <div className="ts-loading">
      <span className="ts-spin" />
    </div>
  );
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { supabaseUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!supabaseUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { supabaseUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (supabaseUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { signOut } = useAuth();
  const [destination, setDestination] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function resolveDestination() {
      setErrorMessage(null);

      try {
        const authMe = await api.get<AuthMeResponse>("/auth/me");

        if (!active) {
          return;
        }

        if (!authMe.profile_completed) {
          setDestination("/profile");
          return;
        }

        if (!authMe.health_completed) {
          setDestination("/health");
          return;
        }

        setDestination("/home");
      } catch (error) {
        console.error("Failed to resolve root redirect", error);

        if (!active) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          await signOut().catch((signOutError) => {
            console.error("Failed to clear expired session", signOutError);
          });
          setDestination("/");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError && error.status === 429
            ? "La API alcanz\u00f3 temporalmente su l\u00edmite de peticiones. Reintenta en unos segundos."
            : "No pudimos validar tu sesi\u00f3n ni tu progreso inicial. Reintenta sin perder tu flujo actual.",
        );
      }
    }

    void resolveDestination();

    return () => {
      active = false;
    };
  }, [reloadKey, signOut]);

  if (!destination) {
    if (errorMessage) {
      return (
        <RequestStateCard
          title="No pudimos continuar tu sesi\u00f3n"
          description={errorMessage}
          primaryActionLabel="Reintentar"
          onPrimaryAction={() => setReloadKey((current) => current + 1)}
          secondaryActionLabel="Volver al inicio"
          onSecondaryAction={() => void signOut().then(() => setDestination("/"))}
        />
      );
    }

    return <LoadingScreen />;
  }

  return <Navigate to={destination} replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <RootRedirect />
            </PrivateRoute>
          }
        />
        <Route
          element={
            <PrivateRoute>
              <AppShell />
            </PrivateRoute>
          }
        >
          <Route path="/home" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/health" element={<HealthHistory />} />
          <Route path="/routine" element={<Routine />} />
          <Route path="/progress" element={<Progress />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
