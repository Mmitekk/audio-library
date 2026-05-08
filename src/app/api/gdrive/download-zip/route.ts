import { NextRequest, NextResponse } from 'next/server';
import { getFileStream } from '@/lib/gdrive';
import JSZip from 'jszip';

/**
 * Converts a Node.js Readable stream to a Buffer.
 * Used because archiver streaming doesn't work reliably in Vercel serverless.
 */
function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const nodeStream = stream as import('stream').Readable;

    nodeStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    nodeStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    nodeStream.on('error', (err: Error) => {
      reject(err);
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { files } = body as { files: { id: string; name: string }[] };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'No files specified' }, { status: 400 });
    }

    if (files.length > 200) {
      return NextResponse.json({ error: 'Too many files (max 200)' }, { status: 400 });
    }

    const zip = new JSZip();

    // Fetch each file from GDrive and add to zip
    for (const file of files) {
      try {
        const fileStream = await getFileStream(file.id);
        const buffer = await streamToBuffer(fileStream);
        zip.file(file.name, buffer, { binary: true });
      } catch (err) {
        console.error(`Failed to add ${file.name} to archive:`, err);
        // Continue with other files
      }
    }

    // Generate the zip as a buffer (fully in-memory, reliable in serverless)
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 1 }, // Fast compression for already-compressed audio
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`audioteka_${timestamp}.zip`)}`,
        'Content-Length': String(zipBuffer.length),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error creating ZIP:', error);
    return NextResponse.json(
      { error: 'Failed to create ZIP archive' },
      { status: 500 }
    );
  }
}
