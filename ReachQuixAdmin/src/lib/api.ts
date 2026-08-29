import { getAccessToken } from './getAccessToken';

const API_BASE_URL = 'http://localhost:5000/api';

const customFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed with status ${response.status}`);
  }

  return response.json();
};

export const api = {
  admin: {
    stats: () => customFetch('/admin/stats'),
    users: () => customFetch('/admin/users'),
    campaigns: () => customFetch('/admin/campaigns'),
    system: () => customFetch('/admin/system'),
  },
  profile: {
    get: () => customFetch('/profile'),
    save: (data: any) => customFetch('/profile', { method: 'POST', body: JSON.stringify(data) }),
  }
};
