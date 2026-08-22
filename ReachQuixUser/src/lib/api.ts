import { getAccessToken } from './getAccessToken';

const API_BASE_URL = 'http://localhost:5000/api';

const customFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getAuthToken();
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
  templates: {
    list: (category?: string) => 
      customFetch(`/templates${category ? `?category=${category}` : ''}`),
    get: (id: string) => customFetch(`/templates/${id}`),
    create: (data: any) => customFetch('/templates', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => customFetch(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => customFetch(`/templates/${id}`, { method: 'DELETE' }),
    brandThemes: {
      list: () => customFetch('/templates/brand-themes/all'),
      create: (data: any) => customFetch('/templates/brand-themes', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: any) => customFetch(`/templates/brand-themes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => customFetch(`/templates/brand-themes/${id}`, { method: 'DELETE' }),
    },
    sections: {
      list: () => customFetch('/templates/sections/all'),
      create: (data: any) => customFetch('/templates/sections', { method: 'POST', body: JSON.stringify(data) }),
      delete: (id: string) => customFetch(`/templates/sections/${id}`, { method: 'DELETE' }),
    }
  },
  contacts: {
    list: () => customFetch('/contacts'),
    create: (data: any) => customFetch('/contacts', { method: 'POST', body: JSON.stringify(data) }),
    bulkCreate: (data: any[]) => customFetch('/contacts/bulk', { method: 'POST', body: JSON.stringify({ contacts: data }) }),
    bulkUpdate: (ids: string[], data: any) => customFetch('/contacts/bulk-update', { method: 'PUT', body: JSON.stringify({ ids, data }) }),
    delete: (id: string) => customFetch(`/contacts/${id}`, { method: 'DELETE' }),
    update: (id: string, data: any) => customFetch(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    folders: {
      list: () => customFetch('/contacts/folders'),
      create: (data: any) => customFetch('/contacts/folders', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: any) => customFetch(`/contacts/folders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => customFetch(`/contacts/folders/${id}`, { method: 'DELETE' }),
    },
    folderMembers: {
      list: () => customFetch('/contacts/folder-members'),
      assign: (data: any) => customFetch('/contacts/folder-members/assign', { method: 'POST', body: JSON.stringify(data) }),
      remove: (data: any) => customFetch('/contacts/folder-members/remove', { method: 'POST', body: JSON.stringify(data) }),
    },
    tags: {
      list: () => customFetch('/contacts/tags'),
      create: (data: any) => customFetch('/contacts/tags', { method: 'POST', body: JSON.stringify(data) }),
      delete: (id: string) => customFetch(`/contacts/tags/${id}`, { method: 'DELETE' }),
    },
    contactTags: {
      list: () => customFetch('/contacts/contact-tags'),
      assign: (data: any) => customFetch('/contacts/contact-tags/assign', { method: 'POST', body: JSON.stringify(data) }),
      remove: (contactId: string, tagId: string) => customFetch(`/contacts/contact-tags/${contactId}/${tagId}`, { method: 'DELETE' }),
    }
  },
  campaigns: {
    list: () => customFetch('/campaigns'),
    get: (id: string) => customFetch(`/campaigns/${id}`),
    create: (data: any) => customFetch('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => customFetch(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => customFetch(`/campaigns/${id}`, { method: 'DELETE' }),
    report: (id: string) => customFetch(`/campaigns/${id}/report`),
    steps: {
      listAll: () => customFetch('/campaigns/steps'),
      create: (campaignId: string, data: any) => customFetch(`/campaigns/${campaignId}/steps`, { method: 'POST', body: JSON.stringify(data) }),
      update: (campaignId: string, stepId: string, data: any) => customFetch(`/campaigns/${campaignId}/steps/${stepId}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (campaignId: string, stepId: string) => customFetch(`/campaigns/${campaignId}/steps/${stepId}`, { method: 'DELETE' }),
    }
  },
  settings: {
    smtp: {
      get: () => customFetch('/settings/smtp'),
      save: (data: any) => customFetch('/settings/smtp', { method: 'POST', body: JSON.stringify(data) }),
    },
    googleSheets: {
      get: () => customFetch('/settings/google-sheets'),
      save: (data: any) => customFetch('/settings/google-sheets', { method: 'POST', body: JSON.stringify(data) }),
    },
    sendingLimits: {
      get: () => customFetch('/settings/sending-limits'),
      save: (data: any) => customFetch('/settings/sending-limits', { method: 'POST', body: JSON.stringify(data) }),
    },
    testEmail: (data: any) => customFetch('/settings/test-email', { method: 'POST', body: JSON.stringify(data) }),
  },
  dashboard: {
    stats: () => customFetch('/dashboard/stats'),
  },
  analytics: {
    get: (campaignId?: string) => customFetch(`/analytics${campaignId && campaignId !== 'all' ? `?campaign=${campaignId}` : ''}`),
  },
  queue: {
    list: (params?: { status?: string; campaign_id?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.campaign_id) searchParams.set('campaign_id', params.campaign_id);
      const qs = searchParams.toString();
      return customFetch(`/queue${qs ? `?${qs}` : ''}`);
    },
    retry: (id: string) => customFetch(`/queue/${id}/retry`, { method: 'PUT' }),
    bulkCreate: (items: any[]) => customFetch('/queue/bulk', { method: 'POST', body: JSON.stringify({ items }) }),
  },
  profile: {
    get: () => customFetch('/profile'),
    save: (data: any) => customFetch('/profile', { method: 'POST', body: JSON.stringify(data) }),
    deleteAccount: () => customFetch('/profile/account', { method: 'DELETE' }),
  },
  ai: {
    writeEmail: (data: { prompt: string; type?: string; tone?: string }) =>
      customFetch('/ai/write-email', { method: 'POST', body: JSON.stringify(data) }),
    syncGoogleSheets: () => customFetch('/ai/sync-google-sheets', { method: 'POST' }),
  }
};
