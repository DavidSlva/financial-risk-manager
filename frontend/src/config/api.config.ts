const rawBase: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** URL base del API, sin barra final. */
export const API_BASE_URL: string = rawBase.replace(/\/+$/, '');

/** Une la base y el path con una sola barra. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
}
