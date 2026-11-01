import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github';
import type { Document } from '@langchain/core/documents';

export async function githubToVector(url: string): Promise<Document[]> {
  try {
    const loader = new GithubRepoLoader(url, {
      branch: 'main',
      recursive: false,
      unknown: 'warn',
      maxConcurrency: 5,
    });
    return await loader.load();
  } catch (error) {
    throw new Error(`Failed to convert GitHub to vector: ${error}`);
  }
}
