import { db } from './db';

export interface SoundRequest {
  id: string;
  name: string;
  email?: string;
  description: string;
  createdAt: string;
  fulfilled: boolean;
}

export async function addRequest(name: string, email: string | undefined, description: string): Promise<SoundRequest> {
  const request = await db.soundRequest.create({
    data: {
      name,
      email: email || null,
      description,
    },
  });
  return {
    id: request.id,
    name: request.name,
    email: request.email || undefined,
    description: request.description,
    createdAt: request.createdAt.toISOString(),
    fulfilled: request.fulfilled,
  };
}

export async function getRequests(): Promise<SoundRequest[]> {
  const requests = await db.soundRequest.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return requests.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email || undefined,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
    fulfilled: r.fulfilled,
  }));
}

export async function markRequestFulfilled(id: string): Promise<SoundRequest | null> {
  try {
    const request = await db.soundRequest.update({
      where: { id },
      data: { fulfilled: true },
    });
    return {
      id: request.id,
      name: request.name,
      email: request.email || undefined,
      description: request.description,
      createdAt: request.createdAt.toISOString(),
      fulfilled: request.fulfilled,
    };
  } catch {
    return null;
  }
}
