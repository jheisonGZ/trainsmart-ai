export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  environment: string;
  timestamp: string;
  uptime_seconds: number;
  database: {
    connected: boolean;
  };
  llm: {
    configured: boolean;
    model: string;
  };
}
