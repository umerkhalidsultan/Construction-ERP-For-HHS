export interface ApiResponse<T> {
  status: 'success' | 'error';
  success?: boolean;
  code?: string;
  message: string;
  data: T | null;
  fields?: Record<string, string>;
  errors?: string[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp: string;
  requestId: string;
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    requestId: string;
  };
}
