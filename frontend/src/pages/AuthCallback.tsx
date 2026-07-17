import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { playLoginGreeting } from "../lib/loginGreeting";
import { supabase, supabaseConfigError } from "../lib/supabaseClient";

const SESSION_WAIT_TIMEOUT_MS = 10_000;
const SESSION_POLL_INTERVAL_MS = 400;

function getOAuthErrorFromUrl(): string | null {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const errorDescription =
    hashParams.get("error_description") ?? queryParams.get("error_description");
  const errorCode = hashParams.get("error") ?? queryParams.get("error");

  if (!errorCode && !errorDescription) {
    return null;
  }

  return (errorDescription ?? errorCode ?? "").replace(/\+/g, " ");
}

export default function AuthCallback() {
  const [status, setStatus] = useState<"waiting" | "done" | "error">("waiting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError(supabaseConfigError);
      setStatus("error");
      return;
    }

    const oauthError = getOAuthErrorFromUrl();

    if (oauthError) {
      setError(`El proveedor de inicio de sesion devolvio un error: ${oauthError}`);
      setStatus("error");
      return;
    }

    const client = supabase;
    let settled = false;

    const finish = (ok: boolean, message?: string) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutId);
      clearInterval(pollId);
      subscription.unsubscribe();

      if (ok) {
        void playLoginGreeting();
        setStatus("done");
      } else {
        setError(message ?? "No se pudo completar el inicio de sesion con Google.");
        setStatus("error");
      }
    };

    // Supabase's client-side code exchange (detectSessionInUrl) can finish
    // before this component mounts and subscribes, so onAuthStateChange
    // alone can miss the event. Poll getSession() as the source of truth
    // and treat the auth-state listener as a faster, best-effort shortcut.
    const checkSession = () => {
      client.auth
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
    };

    checkSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        finish(true);
      }
    });

    const pollId = setInterval(checkSession, SESSION_POLL_INTERVAL_MS);

    const timeoutId = setTimeout(() => {
      finish(
        false,
        "El inicio de sesion con Google tardo demasiado. Intenta de nuevo.",
      );
    }, SESSION_WAIT_TIMEOUT_MS);

    return () => {
      settled = true;
      clearTimeout(timeoutId);
      clearInterval(pollId);
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
