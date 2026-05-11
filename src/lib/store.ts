export interface SoundRequest {
  id: string;
  name: string;
  email?: string;
  description: string;
  createdAt: string;
  fulfilled: boolean;
}

// In-memory store for requests (survives between requests in the same server process)
const requests: SoundRequest[] = [];

export function addRequest(name: string, email: string | undefined, description: string): SoundRequest {
  const request: SoundRequest = {
    id: crypto.randomUUID(),
    name,
    email: email || undefined,
    description,
    createdAt: new Date().toISOString(),
    fulfilled: false,
  };
  requests.unshift(request); // newest first
  return request;
}

export function getRequests(): SoundRequest[] {
  return [...requests];
}

export function markRequestFulfilled(id: string): SoundRequest | null {
  const request = requests.find((r) => r.id === id);
  if (!request) return null;
  request.fulfilled = true;
  return request;
}
