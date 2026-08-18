import { apiRequest } from '../lib/api-client';
import type { LoginResult } from '../types/api';

export async function login(email: string, password: string, companyId?: string) {
  return apiRequest<LoginResult>('/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: { email, password, companyId },
  });
}

export async function logout() {
  return apiRequest<null>('/auth/logout', {
    method: 'POST',
    body: {},
  });
}
