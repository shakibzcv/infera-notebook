import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { IMAGE_MODEL_ID } from '@/lib/constants';
import { GenerateImageOptions, GenerateImageResult } from '@/types/ai';

/**
 * Utility to convert various image inputs to Base64
 */
export async function toBase64(input: Blob | Buffer | File | string): Promise<string> {
  if (typeof input === 'string') {
    // If it's already a data URL, strip the prefix
    return input.replace(/^data:image\/\w+;base64,/, '');
  }
  if (Buffer.isBuffer(input)) {
    return input.toString('base64');
  }
  if (input instanceof Blob) {
    const arrayBuffer = await input.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  }
  return '';
}

/**
 * Nano Banana Image Generation (Gemini 3 Image Models)
 * Supports Text-to-Image, Image Editing, and Reasoning (Thinking).
 */
export async function generateImage(
  options: GenerateImageOptions,
  config: { apiKey: string }
): Promise<GenerateImageResult> {
  const {
    prompt,
    images = [],
    aspectRatio = '1:1',
    imageSize = '1K',
    thinkingLevel = 'Minimal',
    includeThoughts = false,
  } = options;
  const { apiKey } = config;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const contents: any[] = [];

    // Add prompt text
    contents.push({ text: prompt });

    // Handle reference images (Up to 14 for Gemini 3.1 Flash Image)
    if (images.length > 0) {
      const base64Images = await Promise.all(
        images.slice(0, 14).map(async (img) => {
          const data = await toBase64(img);
          const mimeType = img instanceof Blob || img instanceof File ? img.type : 'image/png';

          return {
            inlineData: {
              data,
              mimeType: mimeType || 'image/png',
            },
          };
        })
      );
      contents.push(...base64Images);
    }

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_ID,
      contents,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          aspectRatio,
          imageSize,
        },
        thinkingConfig: {
          thinkingLevel: thinkingLevel === 'High' ? ThinkingLevel.HIGH : ThinkingLevel.MINIMAL,
          includeThoughts,
        },
      },
    });

    // Extract the final generated image
    // Gemini returns multiple parts; the final image is usually the last non-thought image part.
    let generatedImageBase64 = '';
    const parts = response.candidates?.[0]?.content?.parts || [];

    // Iterate backwards to find the final rendered image
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (
        part.inlineData?.data &&
        part.inlineData.mimeType?.startsWith('image/') &&
        !part.thought
      ) {
        generatedImageBase64 = part.inlineData.data;
        break;
      }
    }

    if (!generatedImageBase64) {
      // Fallback: Check if any image part exists if no "non-thought" one was found
      const anyImagePart = parts.find(
        (p) => p.inlineData?.data && p.inlineData.mimeType?.startsWith('image/')
      );
      if (anyImagePart) {
        generatedImageBase64 = anyImagePart.inlineData!.data!;
      }
    }

    if (!generatedImageBase64) {
      throw new Error('Nano Banana: No image returned from model');
    }

    return {
      success: true,
      image: `data:image/png;base64,${generatedImageBase64}`,
      prompt,
      model: IMAGE_MODEL_ID,
    };
  } catch (error: any) {
    console.error('Nano Banana Error:', error);
    return {
      success: false,
      prompt,
      model: IMAGE_MODEL_ID,
      error: error.message || 'Failed to generate image',
    };
  }
}
