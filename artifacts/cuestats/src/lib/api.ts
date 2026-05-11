const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function apiUrl(path: string) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}/api${cleanPath}`;
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || 'An error occurred');
  }
  return res.json();
}
