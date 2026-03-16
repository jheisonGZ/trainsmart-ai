import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { supabase, supabaseConfigError } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;

    async function completeOAuthFlow() {
      try {
        if (!supabase) {
          throw new Error(supabaseConfigError);
        }

        const currentSession = await supabase.auth.getSession();

        if (currentSession.error) {
          throw currentSession.error;
        }

        if (currentSession.data.session) {
          if (active) {
            setCompleted(true);
            navigate("/dashboard", { replace: true });
          }
          return;
        }

        const code = new URL(window.location.href).searchParams.get("code");

        if (code) {
          const exchangeResult = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeResult.error) {
            throw exchangeResult.error;
          }
        }

        const finalSession = await supabase.auth.getSession();

        if (finalSession.error) {
          throw finalSession.error;
        }

        if (!finalSession.data.session) {
          throw new Error("Supabase no devolvio una sesion despues del callback OAuth.");
        }

        if (active) {
          setCompleted(true);
          navigate("/dashboard", { replace: true });
        }
      } catch (callbackError) {
        if (!active) {
          return;
        }

        setError(
          callbackError instanceof Error
            ? callbackError.message
            : "No se pudo completar el inicio de sesion con Google.",
        );
      }
    }

    void completeOAuthFlow();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (completed) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="ts-loading">
      <div style={{ textAlign: "center", color: "#f0f0f0" }}>
        <span className="ts-spin" />
        <p style={{ marginTop: 12 }}>
          {error ?? "Completando autenticacion con Supabase..."}
        </p>
      </div>
    </div>
  );
}
