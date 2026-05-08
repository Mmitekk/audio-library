import { google } from 'googleapis';

// Types
export interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

export interface GDriveFolder {
  id: string;
  name: string;
  children: (GDriveFile | GDriveFolder)[];
}

function getAuth() {
  const keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyString) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }
  let credentials: Record<string, string>;
  try {
    credentials = JSON.parse(keyString);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON');
  }
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return auth;
}

function getDrive() {
  const auth = getAuth();
  return google.drive({ version: 'v3', auth });
}

const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/x-wav',
  'audio/webm',
  'audio/x-flac',
  'audio/aiff',
  'audio/x-aiff',
  'audio/wma',
  'audio/x-ms-wma',
  'audio/x-matroska',
  'video/mp4',
  'video/webm',
  'application/octet-stream',
]);

function isAudioFile(mimeType: string, name: string): boolean {
  if (mimeType === 'application/vnd.google-apps.folder') return false;
  if (AUDIO_MIME_TYPES.has(mimeType)) return true;
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.webm', '.opus', '.aiff', '.aif', '.mp4', '.mka'];
  return audioExtensions.some(ext => name.toLowerCase().endsWith(ext));
}

/**
 * List all files and folders recursively from a given folder ID
 */
export async function listFiles(folderId?: string): Promise<GDriveFolder> {
  const drive = getDrive();
  const rootId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is not set');
  }

  const folder = await buildFolderTree(drive, rootId, 'Аудиотека');
  return folder;
}

async function buildFolderTree(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  folderName: string
): Promise<GDriveFolder> {
  const children: (GDriveFile | GDriveFolder)[] = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size)',
      pageSize: 1000,
      pageToken,
      orderBy: 'name',
    });

    if (response.data.files) {
      for (const file of response.data.files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          // Recursively build subfolder
          const subFolder = await buildFolderTree(drive, file.id!, file.name!);
          children.push(subFolder);
        } else if (file.mimeType && file.name && isAudioFile(file.mimeType, file.name)) {
          children.push({
            id: file.id!,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size || undefined,
          });
        }
      }
    }
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return {
    id: folderId,
    name: folderName,
    children,
  };
}

/**
 * Get file download stream
 */
export async function getFileStream(fileId: string): Promise<NodeJS.ReadableStream> {
  const drive = getDrive();
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return response.data as unknown as NodeJS.ReadableStream;
}

/**
 * Get file metadata
 */
export async function getFileInfo(fileId: string): Promise<{ name: string; mimeType: string; size?: string }> {
  const drive = getDrive();
  const response = await drive.files.get({
    fileId,
    fields: 'name, mimeType, size',
  });
  return {
    name: response.data.name || 'unknown',
    mimeType: response.data.mimeType || 'application/octet-stream',
    size: response.data.size || undefined,
  };
}

/**
 * Count all files and folders in the tree
 */
export function countItems(folder: GDriveFolder): { files: number; folders: number } {
  let files = 0;
  let folders = 0;
  for (const child of folder.children) {
    if ('children' in child) {
      folders++;
      const sub = countItems(child);
      files += sub.files;
      folders += sub.folders;
    } else {
      files++;
    }
  }
  return { files, folders };
}

/**
 * Collect all audio files from a folder tree (flattened)
 */
export function collectAllFiles(folder: GDriveFolder): GDriveFile[] {
  const result: GDriveFile[] = [];
  for (const child of folder.children) {
    if ('children' in child) {
      result.push(...collectAllFiles(child));
    } else {
      result.push(child);
    }
  }
  return result;
}
