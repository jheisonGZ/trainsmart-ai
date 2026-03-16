export interface AuthUser {
  userId: string;
  email: string;
  provider?: string;
  accessToken: string;
  appMetadata: Record<string, unknown>;
  userMetadata: Record<string, unknown>;
}

export interface AuthMeResponse {
  user_id: string;
  email: string;
  provider?: string;
  has_profile: boolean;
  has_health_history: boolean;
  profile_completed: boolean;
  health_completed: boolean;
  profile_confirmed: boolean;
}
