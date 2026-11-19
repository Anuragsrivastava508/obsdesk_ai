const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = (configuredApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:5000/api/v1' : ''))
  .replace(/\/+$/, '');

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL must be configured outside local development.');
}

export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export async function apiRequest(path, { method = 'GET', body, token, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? `Unable to reach the API: ${error.message}` : 'Unable to reach the API.',
      0
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(`The API returned an unreadable response (${response.status}).`, response.status);
  }

  if (!response.ok || payload.success === false) {
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event('opsdesk:unauthorized'));
    }
    throw new ApiError(
      payload.message || `Request failed (${response.status}).`,
      response.status,
      Array.isArray(payload.errors) ? payload.errors : []
    );
  }

  return payload.data;
}

export const authApi = {
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: credentials }),
  me: (token) => apiRequest('/auth/me', { token }),
};

export const dashboardApi = {
  summary: (token) => apiRequest('/dashboard/summary', { token }),
  analytics: (token) => apiRequest('/dashboard/analytics', { token }),
  workload: (token) => apiRequest('/dashboard/agent-workload', { token }),
};

export const ticketsApi = {
  list: (token, query = {}) => {
    const params = new URLSearchParams(
      Object.entries(query).filter(([, value]) => value !== '' && value !== undefined)
    );
    const queryString = params.toString();
    return apiRequest(`/tickets${queryString ? `?${queryString}` : ''}`, { token });
  },
  get: (token, id) => apiRequest(`/tickets/${id}`, { token }),
  create: (token, ticket) => apiRequest('/tickets', { method: 'POST', token, body: ticket }),
  update: (token, id, updates) =>
    apiRequest(`/tickets/${id}`, { method: 'PATCH', token, body: updates }),
  assign: (token, id, assignedTo) =>
    apiRequest(`/tickets/${id}/assign`, { method: 'PATCH', token, body: { assignedTo } }),
  updateStatus: (token, id, status) =>
    apiRequest(`/tickets/${id}/status`, { method: 'PATCH', token, body: { status } }),
  related: (token, id) => apiRequest(`/tickets/${id}/related`, { token }),
  conversations: (token, id) => apiRequest(`/tickets/${id}/conversations`, { token }),
  addConversation: (token, id, conversation) =>
    apiRequest(`/tickets/${id}/conversations`, { method: 'POST', token, body: conversation }),
};

export const conversationsApi = {
  decide: (token, id, decision) =>
    apiRequest(`/conversations/${id}/approve`, { method: 'PATCH', token, body: { decision } }),
};

export const slaApi = {
  overview: (token) => apiRequest('/sla/overview', { token }),
  breached: (token, query = {}) => {
    const params = new URLSearchParams(query);
    const queryString = params.toString();
    return apiRequest(`/sla/breached${queryString ? `?${queryString}` : ''}`, { token });
  },
};

export const usersApi = {
  list: (token, query = {}) => {
    const params = new URLSearchParams(query);
    const queryString = params.toString();
    return apiRequest(`/users${queryString ? `?${queryString}` : ''}`, { token });
  },
  create: (token, user) => apiRequest('/users', { method: 'POST', token, body: user }),
  update: (token, id, updates) =>
    apiRequest(`/users/${id}`, { method: 'PATCH', token, body: updates }),
};
