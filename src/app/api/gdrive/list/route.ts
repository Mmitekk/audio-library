import { NextResponse } from 'next/server';
import { listFiles } from '@/lib/gdrive';

let cachedTree: Awaited<ReturnType<typeof listFiles>> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();
    if (cachedTree && (now - cacheTimestamp) < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cachedTree,
        cached: true,
        timestamp: cacheTimestamp,
      });
    }

    const tree = await listFiles();
    cachedTree = tree;
    cacheTimestamp = now;

    return NextResponse.json({
      success: true,
      data: tree,
      cached: false,
      timestamp: now,
    });
  } catch (error) {
    console.error('Error listing GDrive files:', error);
    const message = error instanceof Error ? error.message : 'Failed to list files';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export function clearCache() {
  cachedTree = null;
  cacheTimestamp = 0;
}
