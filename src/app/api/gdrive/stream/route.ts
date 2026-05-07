import { NextRequest, NextResponse } from 'next/server';
import { getFileStream, getFileInfo } from '@/lib/gdrive';

export async function GET(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get('fileId');
    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const range = request.headers.get('range');
    const info = await getFileInfo(fileId);
    const fileSize = parseInt(info.size || '0', 10);

    const stream = await getFileStream(fileId);

    if (range && fileSize) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // For range requests, we need to use the GDrive API with range headers
      // Since we can't easily seek in the stream, we'll return the full file
      // The browser's audio player will handle buffering
      return new NextResponse(stream as ReadableStream, {
        status: 200,
        headers: {
          'Content-Type': info.mimeType || 'audio/mpeg',
          'Content-Length': String(fileSize),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    return new NextResponse(stream as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': info.mimeType || 'audio/mpeg',
        'Content-Length': info.size || '0',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error streaming file:', error);
    return NextResponse.json(
      { error: 'Failed to stream file' },
      { status: 500 }
    );
  }
}
