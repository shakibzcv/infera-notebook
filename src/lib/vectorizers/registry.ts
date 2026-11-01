import { AllowedSourceType } from '@/generated/prisma/enums';
import type { SourceVectorizer } from './utils';

import { pdfToVector } from './pdf-to-vector';
import { csvToVector } from './csv-to-vector';
import { youtubeToVector } from './youtube-to-vector';
import { websiteToVector } from './website-to-vector';
import { audioToVector } from './audio-to-vector';
import { githubToVector } from './github-to-vector';
import { jsonToVector } from './json-to-vector';
import { jsonLinesToVector } from './json-lines-to-vector';
import { txtToVector } from './txt-to-vector';
import { docxToVector } from './docx-to-vector';
import { epubToVector } from './epub-to-vector';
import { pptxToVector } from './pptx-to-vector';
import { srtToVector } from './srt-to-vector';

/**
 * Source Vectorizer Registry
 * Maps source types to their respective vectorization methods.
 */
export const sourceVectorizers: Record<AllowedSourceType, SourceVectorizer> = {
  APPLICATION_PDF: pdfToVector,
  CSV: csvToVector,
  YOUTUBE: youtubeToVector,
  WEBSITE: websiteToVector,
  VIDEO_MP4: audioToVector,
  VIDEO_WEBM: audioToVector,
  AUDIO_MP3: audioToVector,
  AUDIO_M4A: audioToVector,
  GITHUB: githubToVector,
  JSON: jsonToVector,
  JSONLINES: jsonLinesToVector,
  TEXT: txtToVector,
  DOCX: docxToVector,
  EPUB: epubToVector,
  PPTX: pptxToVector,
  SUBTITLES: srtToVector,
};
