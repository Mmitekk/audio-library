import { NextRequest, NextResponse } from 'next/server';
import { getFileStream } from '@/lib/gdrive';
import archiver from 'archiver';

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

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const archive = archiver('zip', {
          zlib: { level: 1 }, // Fast compression for already-compressed audio
        });

        // Pipe archive data to the response stream
        archive.on('data', (chunk: Buffer) => {
          controller.enqueue(encoder.encode(chunk));
        });

        archive.on('end', () => {
          controller.close();
        });

        archive.on('error', (err: Error) => {
          console.error('Archive error:', err);
          controller.error(err);
        });

        // Add each file from GDrive
        for (const file of files) {
          try {
            const fileStream = await getFileStream(file.id);
            archive.append(fileStream as NodeJS.ReadableStream, {
              name: file.name,
            });
          } catch (err) {
            console.error(`Failed to add ${file.name} to archive:`, err);
            // Continue with other files
          }
        }

        archive.finalize();
      },
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`audioteka_${timestamp}.zip`)}`,
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
