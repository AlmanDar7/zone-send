import { getAccessToken } from './getAccessToken';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : (typeof window !== 'undefined' && window.location.hostname.endsWith('reachquix.com')
        ? 'https://backend.reachquix.com/api'
        : '/api'));

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
    settings: {
      get: () => customFetch('/admin/settings'),
      update: (settings: Record<string, string>) =>
        customFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) }),
    },
    auditLogs: {
      list: (search?: string) =>
        customFetch(`/admin/audit-logs${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    },
    events: {
      list: (type?: string) =>
        customFetch(`/admin/events${type && type !== 'all' ? `?type=${type}` : ''}`),
    },
    users: {
      list: (search?: string) => customFetch(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
      getDetails: (userId: string) => customFetch(`/admin/users/${userId}/details`),
      updateProfile: (userId: string, data: { full_name?: string; avatar_url?: string }) =>
        customFetch(`/admin/users/${userId}/profile`, { method: 'PUT', body: JSON.stringify(data) }),
      updateLimits: (userId: string, max_per_day: number) =>
        customFetch(`/admin/users/${userId}/limits`, { method: 'PUT', body: JSON.stringify({ max_per_day }) }),
      updateSmtp: (userId: string, smtpData: any) =>
        customFetch(`/admin/users/${userId}/smtp`, { method: 'PUT', body: JSON.stringify(smtpData) }),
      delete: (userId: string) => customFetch(`/admin/users/${userId}`, { method: 'DELETE' }),
    },
    contacts: {
      list: (search?: string) => customFetch(`/admin/contacts${search ? `?search=${encodeURIComponent(search)}` : ''}`),
      create: (contact: any) => customFetch('/admin/contacts', { method: 'POST', body: JSON.stringify(contact) }),
      update: (id: string, contact: any) => customFetch(`/admin/contacts/${id}`, { method: 'PUT', body: JSON.stringify(contact) }),
      bulkStatus: (contactIds: string[], status: string) =>
        customFetch('/admin/contacts-bulk/status', { method: 'PUT', body: JSON.stringify({ contactIds, status }) }),
      delete: (id: string) => customFetch(`/admin/contacts/${id}`, { method: 'DELETE' }),
    },
    campaigns: {
      list: () => customFetch('/admin/campaigns'),
      updateStatus: (id: string, status: string) =>
        customFetch(`/admin/campaigns/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
      delete: (id: string) => customFetch(`/admin/campaigns/${id}`, { method: 'DELETE' }),
    },
    queue: {
      list: (status?: string) => customFetch(`/admin/queue${status && status !== 'all' ? `?status=${status}` : ''}`),
      retry: (id: string) => customFetch(`/admin/queue/${id}/retry`, { method: 'PUT' }),
      delete: (id: string) => customFetch(`/admin/queue/${id}`, { method: 'DELETE' }),
    },
    templates: {
      list: (category?: string) => customFetch(`/admin/templates${category && category !== 'all' ? `?category=${category}` : ''}`),
      delete: (id: string) => customFetch(`/admin/templates/${id}`, { method: 'DELETE' }),
    },
    broadcast: {
      send: (data: { recipientType: 'users' | 'contacts'; subject: string; bodyHtml: string; senderName?: string }) =>
        customFetch('/admin/broadcast', { method: 'POST', body: JSON.stringify(data) }),
    },
    maintenance: {
      bulkRetryQueue: () => customFetch('/admin/maintenance/bulk-retry-queue', { method: 'POST' }),
      purgeFailedQueue: () => customFetch('/admin/maintenance/purge-failed-queue', { method: 'POST' }),
      purgeOldEvents: (days: number = 30) =>
        customFetch('/admin/maintenance/purge-old-events', { method: 'POST', body: JSON.stringify({ days }) }),
    },
    system: {
      getDiagnostics: () => customFetch('/admin/system'),
      triggerWorker: () => customFetch('/admin/system/trigger-worker', { method: 'POST' }),
    },
  },
  profile: {
    get: () => customFetch('/profile'),
    save: (data: any) => customFetch('/profile', { method: 'POST', body: JSON.stringify(data) }),
  },
};
