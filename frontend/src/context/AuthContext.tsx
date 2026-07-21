import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { clearApiClientState, setApiAccessTokenGetter } from "../lib/api";
import { playLogoutFarewell } from "../lib/logoutFarewell";
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigError,
} from "../lib/supabaseClient";

interface AuthOperationResult {
  warning?: string;
  redirected?: boolean;
  requiresEmailVerification?: boolean;
  email?: string;
}

interface SignUpOptions {
  displayName?: string;
}

interface SignOutOptions {
  farewell?: boolean;
}

interface AuthContextValue {
  loading: boolean;
  supabaseUser: SupabaseUser | null;
  signUp: (
    email: string,
    password: string,
    options?: SignUpOptions,
  ) => Promise<AuthOperationResult>;
  signIn: (email: string, password: string) => Promise<AuthOperationResult>;
  signInWithGoogle: () => Promise<AuthOperationResult>;
  resetPassword: (email: string) => Promise<void>;
  signOut: (options?: SignOutOptions) => Promise<void>;
  getSupabaseAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function requireSupabaseClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError);
  }

  return supabase;
}

async function readSupabaseAccessToken() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const currentSession = data.session;
  const expiresAtMs = (currentSession?.expires_at ?? 0) * 1000;
  const isExpiringSoon =
    expiresAtMs > 0 && expiresAtMs - Date.now() < 60_000;

  if (currentSession?.access_token && !isExpiringSoon) {
    return currentSession.access_token;
  }

  const refreshResult = await supabase.auth.refreshSession();

  if (refreshResult.error) {
    if (currentSession?.access_token) {
      return currentSession.access_token;
    }

    throw refreshResult.error;
  }

  return refreshResult.data.session?.access_token ?? null;
}

async function ensureOperationalSupabaseSession() {
  const token = await readSupabaseAccessToken();

  if (!token) {
    throw new Error("Supabase no devolvio una sesion operativa.");
  }

  return token;
}

function isSupabaseGoogleProviderDisabled(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    message.includes("unsupported provider") ||
    message.includes("provider is not enabled")
  );
}

function getOAuthRedirectUrl() {
  const configuredRedirectUrl = import.meta.env.VITE_OAUTH_REDIRECT_URL?.trim();

  if (configuredRedirectUrl) {
    return configuredRedirectUrl;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }

  return undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      if (!isSupabaseConfigured || !supabase) {
        setSupabaseUser(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        console.error("Failed to bootstrap Supabase session", error);
      }

      setSupabaseUser(data.session?.user ?? null);
      setLoading(false);
    }

    void initializeAuth();

    const supabaseSubscription = supabase
      ? supabase.auth.onAuthStateChange((_event, session) => {
          if (!active) {
            return;
          }

          setSupabaseUser(session?.user ?? null);
        }).data
      : null;

    setApiAccessTokenGetter(readSupabaseAccessToken);

    return () => {
      active = false;
      supabaseSubscription?.subscription.unsubscribe();
    };
  }, []);

  async function signUp(
    email: string,
    password: string,
    options?: SignUpOptions,
  ): Promise<AuthOperationResult> {
    clearApiClientState();
    const supabaseClient = requireSupabaseClient();
    const signUpResult = await supabaseClient.auth.signUp({
      email,
      password,
      options: options?.displayName
        ? {
            data: {
              display_name: options.displayName.trim(),
              full_name: options.displayName.trim(),
            },
          }
        : undefined,
    });

    if (signUpResult.error) {
      throw signUpResult.error;
    }

    if (
      signUpResult.data.user &&
      Array.isArray(signUpResult.data.user.identities) &&
      signUpResult.data.user.identities.length === 0
    ) {
      throw new Error(
        "Ese correo ya esta registrado. Verifica tu bandeja de entrada o inicia sesion.",
      );
    }

    if (!signUpResult.data.session) {
      return {
        requiresEmailVerification: true,
        email,
      };
    }

    await ensureOperationalSupabaseSession();

    return {};
  }

  async function signIn(email: string, password: string): Promise<AuthOperationResult> {
    clearApiClientState();
    const supabaseClient = requireSupabaseClient();
    const signInResult = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInResult.error) {
      throw signInResult.error;
    }

    await ensureOperationalSupabaseSession();

    return {};
  }

  async function signInWithGoogle(): Promise<AuthOperationResult> {
    clearApiClientState();
    const supabaseClient = requireSupabaseClient();
    const oauthResult = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectUrl(),
      },
    });

    if (oauthResult.error) {
      if (isSupabaseGoogleProviderDisabled(oauthResult.error)) {
        throw new Error(
          "Google no esta habilitado en Supabase Auth. Activalo en Supabase Dashboard -> Authentication -> Providers -> Google y configura su cliente OAuth web.",
        );
      }

      throw oauthResult.error;
    }

    return {
      redirected: true,
    };
  }

  async function resetPassword(email: string): Promise<void> {
    const supabaseClient = requireSupabaseClient();
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: getOAuthRedirectUrl(),
    });

    if (error) {
      throw error;
    }
  }

  async function signOut(options?: SignOutOptions) {
    if (options?.farewell) {
      await playLogoutFarewell();
    }

    if (supabase) {
      await supabase.auth.signOut();
    }

    clearApiClientState();
  }

  async function getSupabaseAccessToken() {
    return readSupabaseAccessToken();
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        supabaseUser,
        signUp,
        signIn,
        signInWithGoogle,
        resetPassword,
        signOut,
        getSupabaseAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
