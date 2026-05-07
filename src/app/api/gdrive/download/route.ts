import { NextRequest, NextResponse } from 'next/server';
import { getFileStream, getFileInfo } from '@/lib/gdrive';

export async function GET(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get('fileId');
    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const info = await getFileInfo(fileId);
    const stream = await getFileStream(fileId);

    // Get a clean filename without extension issues
    const filename = request.nextUrl.searchParams.get('filename') || info.name;

    return new NextResponse(stream as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': info.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': info.size || '0',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
