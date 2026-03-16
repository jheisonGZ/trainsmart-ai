import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as signOutFirebaseAuth,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser,
} from "firebase/auth";

import { auth as firebaseAuth } from "../firebase";
import { clearApiClientState, setApiAccessTokenGetter } from "../lib/api";
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

interface AuthContextValue {
  loading: boolean;
  supabaseUser: SupabaseUser | null;
  firebaseUser: FirebaseUser | null;
  signUp: (
    email: string,
    password: string,
    options?: SignUpOptions,
  ) => Promise<AuthOperationResult>;
  signIn: (email: string, password: string) => Promise<AuthOperationResult>;
  signInWithGooglePopupFirebase: () => Promise<AuthOperationResult>;
  signOut: () => Promise<void>;
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      const initialFirebaseUser = await new Promise<FirebaseUser | null>((resolve) => {
        const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });

      if (!active) {
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setSupabaseUser(null);
        setFirebaseUser(initialFirebaseUser);
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
      setFirebaseUser(initialFirebaseUser);
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

    const unsubscribeFirebase = onAuthStateChanged(firebaseAuth, (user) => {
      if (!active) {
        return;
      }

      setFirebaseUser(user);
    });

    setApiAccessTokenGetter(readSupabaseAccessToken);

    return () => {
      active = false;
      supabaseSubscription?.subscription.unsubscribe();
      unsubscribeFirebase();
    };
  }, []);

  async function syncFirebaseEmailPasswordAccount(
    email: string,
    password: string,
    displayName?: string,
  ) {
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);

      if (displayName?.trim()) {
        await updateFirebaseProfile(credential.user, {
          displayName: displayName.trim(),
        });
      }

      return {};
    } catch (error) {
      console.warn("Firebase sign-up best-effort sync failed", error);
      return {
        warning:
          "La cuenta quedo creada correctamente, pero Firebase no se sincronizo automaticamente.",
      };
    }
  }

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
      await syncFirebaseEmailPasswordAccount(email, password, options?.displayName);
      await signOutFirebaseAuth(firebaseAuth).catch((error) => {
        console.warn("Firebase sign-out after email-verification sign-up failed", error);
      });

      return {
        requiresEmailVerification: true,
        email,
      };
    }

    await ensureOperationalSupabaseSession();

    const firebaseSyncResult = await syncFirebaseEmailPasswordAccount(
      email,
      password,
      options?.displayName,
    );

    if (firebaseSyncResult.warning) {
      return {
        warning:
          "La cuenta quedo operativa en Supabase, pero Firebase no se sincronizo automaticamente.",
      };
    }

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

    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      return {};
    } catch (error) {
      console.warn("Firebase sign-in best-effort sync failed", error);
      return {
        warning:
          "La sesion operativa quedo abierta en Supabase, pero Firebase no se sincronizo automaticamente.",
      };
    }
  }

  async function signInWithGooglePopupFirebase(): Promise<AuthOperationResult> {
    clearApiClientState();
    const supabaseClient = requireSupabaseClient();
    const provider = new GoogleAuthProvider();
    provider.addScope("openid");
    provider.addScope("email");
    provider.addScope("profile");
    const result = await signInWithPopup(firebaseAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const googleIdToken = (credential as { idToken?: string } | null)?.idToken;

    if (googleIdToken) {
      const idTokenResult = await supabaseClient.auth.signInWithIdToken({
        provider: "google",
        token: googleIdToken,
      });

      if (!idTokenResult.error) {
        await ensureOperationalSupabaseSession();
        return {};
      }

      console.warn(
        "Supabase signInWithIdToken failed, falling back to OAuth",
        idTokenResult.error,
      );

      if (isSupabaseGoogleProviderDisabled(idTokenResult.error)) {
        throw new Error(
          "Google no esta habilitado en Supabase Auth. Activalo en Supabase Dashboard -> Authentication -> Providers -> Google.",
        );
      }
    }

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

  async function signOut() {
    const supabaseSignOut = supabase ? supabase.auth.signOut() : Promise.resolve();

    await Promise.allSettled([
      supabaseSignOut,
      signOutFirebaseAuth(firebaseAuth),
    ]);

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
        firebaseUser,
        signUp,
        signIn,
        signInWithGooglePopupFirebase,
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
