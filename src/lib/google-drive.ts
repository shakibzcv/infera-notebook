import { AllowedSourceType } from '@/generated/prisma/enums';

export interface GoogleDriveMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  iconLink?: string;
  thumbnailLink?: string;
  isFolder?: boolean;
}

export interface ParsedGoogleDriveUrl {
  fileId: string;
  resourceType: 'document' | 'spreadsheet' | 'presentation' | 'file';
}

/**
 * Extracts the fileId and resourceType from various Google Drive and Docs URL formats.
 */
export function parseGoogleDriveUrl(rawUrl: string): ParsedGoogleDriveUrl | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const url = rawUrl.trim();

  // 1. Google Docs (/document/d/{fileId}/...)
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (docMatch && docMatch[1]) {
    return { fileId: docMatch[1], resourceType: 'document' };
  }

  // 2. Google Sheets (/spreadsheets/d/{fileId}/...)
  const sheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
  if (sheetMatch && sheetMatch[1]) {
    return { fileId: sheetMatch[1], resourceType: 'spreadsheet' };
  }

  // 3. Google Slides (/presentation/d/{fileId}/...)
  const slideMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i);
  if (slideMatch && slideMatch[1]) {
    return { fileId: slideMatch[1], resourceType: 'presentation' };
  }

  // 4. Drive file view/preview (/file/d/{fileId}/...)
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileMatch && fileMatch[1]) {
    return { fileId: fileMatch[1], resourceType: 'file' };
  }

  // 5. Query parameter id= (open?id= or uc?id=)
  const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (queryMatch && queryMatch[1]) {
    return { fileId: queryMatch[1], resourceType: 'file' };
  }

  // 6. Direct ID string (if user passed raw fileId)
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(url)) {
    return { fileId: url, resourceType: 'file' };
  }

  return null;
}

/**
 * Extracts clean filename from standard Content-Disposition header.
 */
export function extractFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  // Match filename*=UTF-8''...
  const utf8Match = header.match(/filename\*=(?:UTF-8''|utf-8'')([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ''));
    } catch {
      return utf8Match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  // Match filename="..." or filename=...
  const standardMatch = header.match(/filename=(?:["']([^"']+)["']|([^;\s]+))/i);
  if (standardMatch) {
    const val = standardMatch[1] || standardMatch[2];
    if (val) return val.trim();
  }
  return null;
}

/**
 * Maps a MIME type and/or filename to internal AllowedSourceType, file extension, and Content-Type.
 */
export function mapGoogleDriveMimeType(
  mimeType: string,
  fileName?: string
): {
  sourceType: AllowedSourceType;
  extension: string;
  contentType: string;
} {
  const normalizedMime = (mimeType || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();

  // Google Docs -> PDF
  if (normalizedMime === 'application/vnd.google-apps.document') {
    return {
      sourceType: 'APPLICATION_PDF',
      extension: 'pdf',
      contentType: 'application/pdf',
    };
  }

  // Google Sheets -> CSV
  if (normalizedMime === 'application/vnd.google-apps.spreadsheet') {
    return {
      sourceType: 'CSV',
      extension: 'csv',
      contentType: 'text/csv',
    };
  }

  // Google Slides -> PDF
  if (normalizedMime === 'application/vnd.google-apps.presentation') {
    return {
      sourceType: 'APPLICATION_PDF',
      extension: 'pdf',
      contentType: 'application/pdf',
    };
  }

  // Standard PDF
  if (normalizedMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return {
      sourceType: 'APPLICATION_PDF',
      extension: 'pdf',
      contentType: 'application/pdf',
    };
  }

  // Word Document
  if (
    normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    return {
      sourceType: 'DOCX',
      extension: 'docx',
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  // PowerPoint
  if (
    normalizedMime ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    lowerName.endsWith('.pptx')
  ) {
    return {
      sourceType: 'PPTX',
      extension: 'pptx',
      contentType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
  }

  // CSV
  if (normalizedMime === 'text/csv' || lowerName.endsWith('.csv')) {
    return {
      sourceType: 'CSV',
      extension: 'csv',
      contentType: 'text/csv',
    };
  }

  // Plain Text / Markdown
  if (
    normalizedMime === 'text/plain' ||
    normalizedMime === 'text/markdown' ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md')
  ) {
    return {
      sourceType: 'TEXT',
      extension: lowerName.endsWith('.md') ? 'md' : 'txt',
      contentType: lowerName.endsWith('.md') ? 'text/markdown' : 'text/plain',
    };
  }

  // JSON
  if (
    normalizedMime === 'application/json' ||
    normalizedMime === 'application/ld+json' ||
    lowerName.endsWith('.json')
  ) {
    return {
      sourceType: 'JSON',
      extension: 'json',
      contentType: 'application/json',
    };
  }

  // JSONLines
  if (lowerName.endsWith('.jsonl') || lowerName.endsWith('.jsonlines')) {
    return {
      sourceType: 'JSONLINES',
      extension: 'jsonl',
      contentType: 'application/x-ndjson',
    };
  }

  // EPUB
  if (normalizedMime === 'application/epub+zip' || lowerName.endsWith('.epub')) {
    return {
      sourceType: 'EPUB',
      extension: 'epub',
      contentType: 'application/epub+zip',
    };
  }

  // Audio MP3
  if (
    normalizedMime === 'audio/mpeg' ||
    normalizedMime === 'audio/mp3' ||
    lowerName.endsWith('.mp3')
  ) {
    return {
      sourceType: 'AUDIO_MP3',
      extension: 'mp3',
      contentType: 'audio/mpeg',
    };
  }

  // Audio M4A
  if (
    normalizedMime === 'audio/mp4' ||
    normalizedMime === 'audio/m4a' ||
    normalizedMime === 'audio/x-m4a' ||
    lowerName.endsWith('.m4a')
  ) {
    return {
      sourceType: 'AUDIO_M4A',
      extension: 'm4a',
      contentType: 'audio/mp4',
    };
  }

  // Video MP4
  if (normalizedMime === 'video/mp4' || lowerName.endsWith('.mp4')) {
    return {
      sourceType: 'VIDEO_MP4',
      extension: 'mp4',
      contentType: 'video/mp4',
    };
  }

  // Video WebM
  if (normalizedMime === 'video/webm' || lowerName.endsWith('.webm')) {
    return {
      sourceType: 'VIDEO_WEBM',
      extension: 'webm',
      contentType: 'video/webm',
    };
  }

  // Subtitles
  if (lowerName.endsWith('.vtt') || lowerName.endsWith('.srt')) {
    return {
      sourceType: 'SUBTITLES',
      extension: lowerName.endsWith('.vtt') ? 'vtt' : 'srt',
      contentType: 'text/vtt',
    };
  }

  // Fallback to text if unknown
  return {
    sourceType: 'TEXT',
    extension: 'txt',
    contentType: 'text/plain',
  };
}

/**
 * Downloads or exports a file from Google Drive into a Node Buffer with type mappings.
 * Tries direct public download first (fast, no OAuth requirement for public links or shared Docs),
 * and seamlessly falls back to authenticated Google Drive API v3 if the file is private.
 */
export async function downloadGoogleDriveFile(options: {
  fileId: string;
  resourceType?: 'document' | 'spreadsheet' | 'presentation' | 'file';
  knownFileName?: string;
  knownMimeType?: string;
  accessToken?: string;
}): Promise<{
  buffer: Buffer;
  fileName: string;
  contentType: string;
  sourceType: AllowedSourceType;
  extension: string;
}> {
  const { fileId, accessToken } = options;
  let fileName = options.knownFileName || '';
  let mimeType = options.knownMimeType || '';
  let resourceType = options.resourceType;

  // 1. If accessToken is provided and we don't have metadata yet, optionally query Google Drive API v3
  if (accessToken && (!fileName || !mimeType)) {
    try {
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (metaRes.ok) {
        const meta = (await metaRes.json()) as GoogleDriveMetadata;
        if (meta.name) fileName = meta.name;
        if (meta.mimeType) mimeType = meta.mimeType;

        if (mimeType === 'application/vnd.google-apps.document') {
          resourceType = 'document';
        } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
          resourceType = 'spreadsheet';
        } else if (mimeType === 'application/vnd.google-apps.presentation') {
          resourceType = 'presentation';
        }
      }
    } catch (metaErr) {
      console.warn('[GoogleDrive] Metadata lookup with token failed (falling back to direct download):', metaErr);
    }
  }

  // 2. Attempt direct public download first.
  // This succeeds for any public link or file shared with "Anyone with the link can view",
  // without needing Google Drive API enablement or OAuth consent.
  const publicUrlsToTry: string[] = [];
  if (resourceType === 'document' || mimeType === 'application/vnd.google-apps.document') {
    publicUrlsToTry.push(`https://docs.google.com/document/d/${fileId}/export?format=pdf`);
  } else if (resourceType === 'spreadsheet' || mimeType === 'application/vnd.google-apps.spreadsheet') {
    publicUrlsToTry.push(`https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`);
  } else if (resourceType === 'presentation' || mimeType === 'application/vnd.google-apps.presentation') {
    publicUrlsToTry.push(`https://docs.google.com/presentation/d/${fileId}/export/pdf`);
  } else {
    publicUrlsToTry.push(
      `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
      `https://drive.google.com/uc?export=download&id=${fileId}`
    );
  }

  let publicBuffer: Buffer | null = null;
  let publicContentType = '';
  let publicFileName = fileName;

  for (const pUrl of publicUrlsToTry) {
    try {
      const res = await fetch(pUrl, {
        redirect: 'follow',
      });

      if (!res.ok) continue;

      const cType = res.headers.get('content-type') || '';
      const cDisp = res.headers.get('content-disposition');
      const dispName = extractFilenameFromContentDisposition(cDisp);
      if (dispName) {
        publicFileName = dispName;
      }

      // Check if response is an HTML page (Google login or virus scan confirmation)
      if (cType.includes('text/html')) {
        const textContent = await res.text();
        const confirmMatch =
          textContent.match(/href="\/uc\?export=download&amp;confirm=([^"&]+)/i) ||
          textContent.match(/confirm=([a-zA-Z0-9_-]+)/i);

        if (confirmMatch && confirmMatch[1]) {
          const confirmToken = confirmMatch[1];
          const confirmRes = await fetch(
            `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`,
            { redirect: 'follow' }
          );
          if (confirmRes.ok) {
            const arr = await confirmRes.arrayBuffer();
            if (arr.byteLength > 0) {
              const confirmDispName = extractFilenameFromContentDisposition(
                confirmRes.headers.get('content-disposition')
              );
              if (confirmDispName) publicFileName = confirmDispName;
              publicBuffer = Buffer.from(arr);
              publicContentType = confirmRes.headers.get('content-type') || cType;
              break;
            }
          }
        }
        // If it's an HTML login/permission page, this public URL did not work
        continue;
      }

      const arr = await res.arrayBuffer();
      if (arr.byteLength > 0) {
        publicBuffer = Buffer.from(arr);
        publicContentType = cType;
        break;
      }
    } catch (pErr) {
      console.warn('[GoogleDrive] Public download try failed:', pErr);
    }
  }

  if (publicBuffer && publicBuffer.length > 0) {
    const finalName = publicFileName || fileName;
    const mapped = mapGoogleDriveMimeType(mimeType || publicContentType, finalName);
    let resolvedTitle = finalName;
    if (!resolvedTitle) {
      resolvedTitle = `Google-Drive-${fileId.slice(0, 8)}.${mapped.extension}`;
    } else if (!resolvedTitle.toLowerCase().endsWith(`.${mapped.extension}`)) {
      if (mapped.sourceType === 'APPLICATION_PDF' && !resolvedTitle.toLowerCase().endsWith('.pdf')) {
        resolvedTitle = `${resolvedTitle}.pdf`;
      } else if (mapped.sourceType === 'CSV' && !resolvedTitle.toLowerCase().endsWith('.csv')) {
        resolvedTitle = `${resolvedTitle}.csv`;
      }
    }

    return {
      buffer: publicBuffer,
      fileName: resolvedTitle,
      contentType: mapped.contentType,
      sourceType: mapped.sourceType,
      extension: mapped.extension,
    };
  }

  // 3. Fallback to authenticated Google Drive API v3 if accessToken is present
  if (accessToken) {
    let apiDownloadUrl = '';
    if (resourceType === 'document' || mimeType === 'application/vnd.google-apps.document') {
      apiDownloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
      if (!fileName) fileName = `Google-Doc-${fileId.slice(0, 8)}`;
      mimeType = 'application/vnd.google-apps.document';
    } else if (resourceType === 'spreadsheet' || mimeType === 'application/vnd.google-apps.spreadsheet') {
      apiDownloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
      if (!fileName) fileName = `Google-Sheet-${fileId.slice(0, 8)}`;
      mimeType = 'application/vnd.google-apps.spreadsheet';
    } else if (resourceType === 'presentation' || mimeType === 'application/vnd.google-apps.presentation') {
      apiDownloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
      if (!fileName) fileName = `Google-Slide-${fileId.slice(0, 8)}`;
      mimeType = 'application/vnd.google-apps.presentation';
    } else {
      apiDownloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    const authRes = await fetch(apiDownloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      redirect: 'follow',
    });

    if (authRes.ok) {
      const authArr = await authRes.arrayBuffer();
      const authBuffer = Buffer.from(authArr);
      if (authBuffer.length > 0) {
        const authCType = authRes.headers.get('content-type') || '';
        const mapped = mapGoogleDriveMimeType(mimeType || authCType, fileName);
        let resolvedTitle = fileName;
        if (!resolvedTitle) {
          resolvedTitle = `Google-Drive-${fileId.slice(0, 8)}.${mapped.extension}`;
        } else if (!resolvedTitle.toLowerCase().endsWith(`.${mapped.extension}`)) {
          if (mapped.sourceType === 'APPLICATION_PDF' && !resolvedTitle.toLowerCase().endsWith('.pdf')) {
            resolvedTitle = `${resolvedTitle}.pdf`;
          } else if (mapped.sourceType === 'CSV' && !resolvedTitle.toLowerCase().endsWith('.csv')) {
            resolvedTitle = `${resolvedTitle}.csv`;
          }
        }
        return {
          buffer: authBuffer,
          fileName: resolvedTitle,
          contentType: mapped.contentType,
          sourceType: mapped.sourceType,
          extension: mapped.extension,
        };
      }
    }
  }

  // 4. If neither public nor authenticated succeeded
  throw new Error(
    'Unable to access this Google Drive file. Please ensure the file sharing is set to "Anyone with the link can view", or click "Connect Google Drive" to grant access to private files.'
  );
}

/**
 * Checks whether a Google Drive item can be imported into Infera, or is a folder.
 * Folders are recognized and preserved for directory navigation.
 */
export function isSupportedGoogleDriveItem(mimeType: string, fileName?: string): boolean {
  if (mimeType === 'application/vnd.google-apps.folder') return true;

  const normalizedMime = (mimeType || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();

  // Google Workspace Docs/Sheets/Slides
  if (
    normalizedMime === 'application/vnd.google-apps.document' ||
    normalizedMime === 'application/vnd.google-apps.spreadsheet' ||
    normalizedMime === 'application/vnd.google-apps.presentation'
  ) {
    return true;
  }

  // PDF
  if (normalizedMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return true;
  }

  // Word Document
  if (
    normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    normalizedMime === 'application/msword' ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc')
  ) {
    return true;
  }

  // PowerPoint
  if (
    normalizedMime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    normalizedMime === 'application/vnd.ms-powerpoint' ||
    lowerName.endsWith('.pptx') ||
    lowerName.endsWith('.ppt')
  ) {
    return true;
  }

  // CSV
  if (
    normalizedMime === 'text/csv' ||
    normalizedMime === 'application/csv' ||
    lowerName.endsWith('.csv')
  ) {
    return true;
  }

  // Plain Text & Markdown
  if (
    normalizedMime === 'text/plain' ||
    normalizedMime === 'text/markdown' ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md')
  ) {
    return true;
  }

  // JSON / JSONL
  if (
    normalizedMime === 'application/json' ||
    normalizedMime === 'application/ld+json' ||
    lowerName.endsWith('.json') ||
    lowerName.endsWith('.jsonl') ||
    lowerName.endsWith('.jsonlines')
  ) {
    return true;
  }

  // EPUB
  if (normalizedMime === 'application/epub+zip' || lowerName.endsWith('.epub')) {
    return true;
  }

  // Audio
  if (
    normalizedMime.startsWith('audio/') ||
    lowerName.endsWith('.mp3') ||
    lowerName.endsWith('.m4a') ||
    lowerName.endsWith('.wav')
  ) {
    return true;
  }

  // Video
  if (
    normalizedMime.startsWith('video/') ||
    lowerName.endsWith('.mp4') ||
    lowerName.endsWith('.webm')
  ) {
    return true;
  }

  // Subtitles
  if (
    normalizedMime === 'text/vtt' ||
    lowerName.endsWith('.vtt') ||
    lowerName.endsWith('.srt')
  ) {
    return true;
  }

  return false;
}

/**
 * Lists files and folders from Google Drive API v3.
 * Supports navigating through folders (parent folderId) and only shows importable files.
 */
export async function listGoogleDriveFiles(options: {
  accessToken: string;
  query?: string;
  pageSize?: number;
  folderId?: string;
}): Promise<GoogleDriveMetadata[]> {
  const { accessToken, query, pageSize = 60, folderId = 'root' } = options;

  let q = 'trashed = false';

  if (query && query.trim()) {
    const escapedQuery = query.trim().replace(/'/g, "\\'");
    q += ` and name contains '${escapedQuery}'`;
  } else {
    // Navigate inside specific folder ('root' is My Drive top level)
    const targetFolder = folderId && folderId.trim() ? folderId.trim() : 'root';
    q += ` and '${targetFolder}' in parents`;
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('pageSize', pageSize.toString());
  url.searchParams.set(
    'fields',
    'files(id, name, mimeType, size, modifiedTime, iconLink, thumbnailLink)'
  );
  url.searchParams.set('orderBy', 'folder,modifiedTime desc');
  url.searchParams.set('supportsAllDrives', 'true');
  url.searchParams.set('includeItemsFromAllDrives', 'true');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let parsedMessage = '';
    try {
      const errJson = JSON.parse(errText);
      parsedMessage = errJson.error?.message || errText;
    } catch {
      parsedMessage = errText || res.statusText;
    }
    throw new Error(parsedMessage || `Google Drive API error (${res.status})`);
  }

  const data = (await res.json()) as { files: GoogleDriveMetadata[] };
  const rawFiles = data.files || [];

  // Filter: Keep all folders, and only keep supported files
  const filtered = rawFiles
    .filter((file) => isSupportedGoogleDriveItem(file.mimeType, file.name))
    .map((file) => ({
      ...file,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    }));

  // Ensure folders are always grouped at the top
  filtered.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return 0;
  });

  return filtered;
}
