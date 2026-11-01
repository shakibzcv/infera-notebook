import { Document } from '@langchain/core/documents';

/**
 * YouTube Vectorizer
 * Adding sources via YouTube URL has been disabled in favor of directly pasting transcripts.
 */
export async function youtubeToVector(_url: string): Promise<Document[]> {
  throw new Error(
    'Adding sources via YouTube URL is disabled. Please paste the video transcript directly.'
  );
}
