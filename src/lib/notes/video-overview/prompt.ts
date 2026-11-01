import { auraSpeakers } from '@/lib/characters';

const charactersList = auraSpeakers
  .map((s) => `- Name: ${s.name} (voice model: "${s.model}") - ${s.gender}, ${s.description}`)
  .join('\n');

export const SCRIPT_PROMPT = (document: string) => `
# AUDIO PROFILE: Expert Narrator
The narrator is knowledgeable, clear, and engaging. They command attention while maintaining a conversational and accessible tone.

## THE SCENE: Professional Recording Booth
A dead-quiet acoustic environment. The narrator is speaking directly into a high-end condenser microphone, delivering a polished and professional performance.

### DIRECTOR'S NOTES
Style:
* Clarity and Precision: Every word should be clearly articulated.
* Dynamic Inflection: Use varied pitch to maintain engagement.
* Pacing: Measured and deliberate (slightly slow to allow visual absorption).

Accent: Neutral, clear, and professional.

<role>
You are a world-class video script generator who specializes in creating concise, visually-rich narration scripts optimized for Gemini TTS.
</role>

<task>
Transform the provided source document into a compelling video narration script. If the context suggests a dialogue or dual-perspective is better, use two voices. Otherwise, use a single expert narrator.
</task>

<instructions>
1. Craft an attention-grabbing, substantive title (strictly 3 to 6 words, Title Case, never generic "Video Overview").
2. Select 1 or 2 voices from the available speakers.
3. Write a narration script suitable for TTS:
   - Hook: Start immediately with an intriguing premise or question in the first sentence.
   - Core Story: Deliver the main insight with high clarity and narrative momentum.
   - Conclusion: End with a resonant takeaway.
   - If using two voices, format as: SpeakerName: [audio tag] Text.
   - If using one voice, format as: [audio tags] Text.
4. Keep the total script under 1000 characters.
5. Identify 3-5 key terms (specialized terminology, names, or brands) mentioned in the script.
</instructions>

<constraints>
- The script MUST be under 1000 characters total.
- Use short, punchy sentences tailored for spoken video delivery.
- Avoid unnecessary jargon or dense written syntax.
- Do NOT invent information not present in the document.
</constraints>

<context>
AVAILABLE VOICES:
${charactersList}

DOCUMENT:
${document}
</context>
`;

export const SCRIPT_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string',
      description:
        'An attention-grabbing title (strictly 3 to 6 words, Title Case, focusing on the substantive subject)',
    },
    participants: {
      type: 'array',
      description: 'The selected 1-2 voices for this video',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Speaker name' },
          voice: { type: 'string', description: 'Voice model identifier' },
        },
        required: ['name', 'voice'],
      },
    },
    videoScript: {
      type: 'string',
      description: 'The full narration script (under 1000 characters)',
    },
    keyterms: {
      type: 'array',
      description: '3-5 key terms (terminology, names, brands) to boost in transcription',
      items: { type: 'string' },
    },
  },
  required: ['title', 'participants', 'videoScript', 'keyterms'],
  additionalProperties: false,
};

export const IMAGES_PROMPT = (scriptText: string) => `
<role>
You are an expert AI image prompt generator and visual storytelling director.
</role>

<task>
Generate scene descriptions and detailed image prompts that visually accompany the video narration script.
</task>

<instructions>
1. Break the script into 3–5 distinct visual scenes.
2. For each scene, provide:
   - A detailed image generation prompt describing composition, style, color palette, and mood
   - The exact line(s) from the script that this scene illustrates
3. Ensure visual variety — vary compositions, perspectives, and visual styles across scenes.
4. Each image should be visually striking and directly relevant to its script segment.
</instructions>

<constraints>
- Image prompts must be 50–150 words each, highly specific and vivid.
- Avoid generic descriptions. Each scene must be unique and topic-specific.
- Scenes must cover the entire script in order — no gaps in the narrative.
- Style should be consistent across scenes (e.g., all photorealistic, or all illustrated).
- Do NOT include text overlays in image prompts — the narration handles the text.
</constraints>

<context>
${scriptText}
</context>
`;

export const IMAGES_SCHEMA = {
  type: 'array' as const,
  items: {
    type: 'object',
    properties: {
      imagePrompt: {
        type: 'string',
        description: 'Detailed image generation prompt (50–150 words)',
      },
      sceneContent: {
        type: 'string',
        description: 'The exact script lines this scene illustrates',
      },
    },
    required: ['imagePrompt', 'sceneContent'],
    additionalProperties: false,
  },
};
