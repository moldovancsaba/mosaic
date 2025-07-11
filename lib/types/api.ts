export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    timestamp: string;
    details?: unknown;
  };
}
