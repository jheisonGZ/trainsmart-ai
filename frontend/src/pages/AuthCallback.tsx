import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { supabase, supabaseConfigError } from "../lib/supabaseClient";

const SESSION_WAIT_TIMEOUT_MS = 10_000;

export default function AuthCallback() {
  const [status, setStatus] = useState<"waiting" | "done" | "error">("waiting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError(supabaseConfigError);
      setStatus("error");
      return;
    }

    let settled = false;

    const finish = (ok: boolean, message?: string) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();

      if (ok) {
        setStatus("done");
      } else {
        setError(message ?? "No se pudo completar el inicio de sesion con Google.");
        setStatus("error");
      }
    };

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) {
          finish(false, sessionError.message);
          return;
        }

        if (data.session) {
          finish(true);
        }
      })
      .catch((sessionError: unknown) => {
        finish(
          false,
          sessionError instanceof Error ? sessionError.message : undefined,
        );
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        finish(true);
      }
    });

    const timeoutId = setTimeout(() => {
      finish(
        false,
        "El inicio de sesion con Google tardo demasiado. Intenta de nuevo.",
      );
    }, SESSION_WAIT_TIMEOUT_MS);

    return () => {
      settled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  if (status === "done") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="ts-loading">
      <div style={{ textAlign: "center", color: "#f0f0f0" }}>
        <span className="ts-spin" />
        <p style={{ marginTop: 12 }}>
          {status === "error"
            ? error
            : "Completando autenticacion con Supabase..."}
        </p>
      </div>
    </div>
  );
}
