import { authHeaders } from '@/lib/auth-token';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) =>
    fetchApi<T>(`${endpoint}${params ? buildQueryString(params) : ''}`),
  post: <T>(endpoint: string, data: any) =>
    fetchApi<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: any) =>
    fetchApi<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) =>
    fetchApi<T>(endpoint, { method: 'DELETE' }),
};

/**
 * Fetch a blob (e.g. CSV export) with auth headers included.
 * Use this instead of raw fetch() for authenticated file downloads.
 */
export async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
}
