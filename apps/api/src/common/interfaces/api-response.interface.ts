export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T | null;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp: string;
  requestId: string;
}
