const DEFAULT_API_BASE_URL = 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 10000;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

export async function fetchJson(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    const fallback = 'Unable to reach backend. Make sure the API server is running on port 8000.';
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. ${fallback}`);
    }
    throw new Error(fallback);
  } finally {
    window.clearTimeout(timeoutId);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.detail || data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export function postJson(path, body) {
  return fetchJson(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}