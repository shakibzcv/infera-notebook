import { deleteFile, uploadAsset, getSignedDownloadUrl, getPresignedUploadUrl } from '@/lib/s3';
import { AllowedNoteType } from '@/generated/prisma/enums';

/**
 * Note Content Asset Resolver
 *
 * Traverses AI-generated note content and transforms internal S3 keys (paths)
 * into temporary, public signed URLs for the client.
 */
export async function resolveNoteAssets(note: any): Promise<any> {
  if (!note || !note.content || note.content === '') {
    return note;
  }

  try {
    let parsedContent: any;
    try {
      parsedContent = JSON.parse(note.content);
    } catch (e) {
      // If NOT JSON, it's likely a simple text note (CHAT_NOTE, EDITABLE_NOTE, etc).
      return note;
    }

    const type = note.type as AllowedNoteType;

    // Route resolution remains empty for types that handle assets on the client
    // via the 'useSignedUrls' hook (Infographics, Slide Decks, Audio/Video Overviews).
    switch (type) {
      default:
        // No assets to resolve at the server layer for these types
        return note;
    }

    // Re-serialize with resolved URLs (transient)
    return {
      ...note,
      content: JSON.stringify(parsedContent),
    };
  } catch (error) {
    console.error(`[RESOLVE_NOTE_ASSETS_ERROR] Failed to resolve note ${note.id}:`, error);
    return note;
  }
}

/**
 * Traverses note content and deletes any associated assets (audio, images, slides) from S3.
 */
export async function deleteNoteAssets(
  type: AllowedNoteType,
  content: string | object | null | undefined
): Promise<void> {
  if (!content) return;

  try {
    let parsed: any;
    if (typeof content === 'string') {
      try {
        parsed = JSON.parse(content);
      } catch {
        return;
      }
    } else {
      parsed = content;
    }

    if (!parsed) return;

    const paths: string[] = [];

    if (type === AllowedNoteType.INFOGRAPHIC && parsed.path) {
      paths.push(parsed.path);
    } else if (type === AllowedNoteType.SLIDE_DECK && Array.isArray(parsed)) {
      parsed.forEach((s: any) => s?.path && paths.push(s.path));
    } else if (type === AllowedNoteType.AUDIO_OVERVIEW && parsed.path) {
      paths.push(parsed.path);
    } else if (type === AllowedNoteType.VIDEO_OVERVIEW) {
      if (parsed.path) paths.push(parsed.path);
      if (Array.isArray(parsed.images)) {
        parsed.images.forEach((img: any) => img?.path && paths.push(img.path));
      }
    }

    if (paths.length > 0) {
      await Promise.allSettled(paths.map((p) => deleteFile(p)));
    }
  } catch (e) {
    console.error('[DELETE_NOTE_ASSETS_ERROR]', e);
  }
}
