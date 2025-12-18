const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export interface Conversation {
  id: string;
  title: string;
  azure_response_id?: string;
  created_at: number;
  updated_at: number;
  messages: any[];
}

// Get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

// Refresh access token helper
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) return false;

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}

// Fetch wrapper with automatic token refresh
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) }
  });

  // If unauthorized, try to refresh token and retry once
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return fetch(url, {
        ...options,
        headers: { ...getAuthHeaders(), ...(options.headers || {}) }
      });
    }
  }

  return response;
}

// Fetch all conversations from backend
export async function fetchConversations(): Promise<Conversation[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/conversations`);
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return response.json();
}

// Get single conversation
export async function fetchConversation(id: string): Promise<Conversation> {
  const response = await fetchWithAuth(`${API_BASE_URL}/conversations/${id}`);
  if (!response.ok) throw new Error('Failed to fetch conversation');
  return response.json();
}

// Create new conversation in backend
export async function createConversation(
  id: string, 
  title: string, 
  azureResponseId?: string
): Promise<Conversation> {
  const response = await fetchWithAuth(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    body: JSON.stringify({ id, title, azureResponseId })
  });
  if (!response.ok) throw new Error('Failed to create conversation');
  return response.json();
}

// Update conversation title
export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/conversations/${id}/title`, {
    method: 'PATCH',
    body: JSON.stringify({ title })
  });
  if (!response.ok) throw new Error('Failed to update conversation');
}

// Update conversation Azure response ID
export async function updateConversationResponse(id: string, azureResponseId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/conversations/${id}/response`, {
    method: 'PATCH',
    body: JSON.stringify({ azureResponseId })
  });
  if (!response.ok) throw new Error('Failed to update response ID');
}

// Delete conversation
export async function deleteConversation(id: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/conversations/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete conversation');
}

// Add message to conversation
export async function addMessage(
  conversationId: string,
  role: string,
  content: string,
  displayContent?: string,
  attachments?: any[]
): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      role,
      content,
      displayContent: displayContent || content,
      attachments: attachments || []
    })
  });
  if (!response.ok) throw new Error('Failed to add message');
}

// Delete last message from conversation
export async function deleteLastMessage(conversationId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/conversations/${conversationId}/messages/last`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete last message');
}

// Azure session management
export async function saveAzureSession(
  sessionId: string,
  conversationId: string,
  modelName?: string,
  totalTokens?: number
): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/azure-sessions`, {
    method: 'POST',
    body: JSON.stringify({ sessionId, conversationId, modelName, totalTokens })
  });
  if (!response.ok) throw new Error('Failed to save Azure session');
}

export async function getAzureSession(conversationId: string): Promise<any> {
  const response = await fetchWithAuth(`${API_BASE_URL}/conversations/${conversationId}/session`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch Azure session');
  }
  return response.json();
}
