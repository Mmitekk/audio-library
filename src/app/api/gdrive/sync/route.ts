import { NextResponse } from 'next/server';
import { listFiles, countItems } from '@/lib/gdrive';

export async function POST() {
  try {
    // Clear the cache by re-fetching
    const tree = await listFiles();
    const stats = countItems(tree);

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      timestamp: new Date().toISOString(),
      stats: {
        files: stats.files,
        folders: stats.folders,
      },
    });
  } catch (error) {
    console.error('Error syncing GDrive:', error);
    const message = error instanceof Error ? error.message : 'Failed to sync';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
