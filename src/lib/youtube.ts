/**
 * YouTube Utility
 * Provides helpers for interacting with YouTube metadata.
 */

/**
 * Fetches the video title for a given YouTube URL using oEmbed.
 * This is a lightweight way to get the title without needing an API key.
 *
 * @param url - The full YouTube video URL.
 * @returns The video title or the original URL if fetching fails.
 */
export async function getYouTubeTitle(url: string): Promise<string> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );
    if (!response.ok) {
      return url;
    }
    const data = await response.json();
    return data.title || url;
  } catch (error) {
    console.error('[YOUTUBE_INFO] Failed to fetch title:', error);
    return url;
  }
}
