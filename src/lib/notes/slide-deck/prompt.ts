export const PROMPT = (document: string) => `
<role>
You are a world-class presentation designer and educator who creates compelling, visually-driven slide decks.
</role>

<task>
1. Understand the core topic and key ideas of the document.
2. Create a concise, compelling slide deck title.
3. Break the content into 5–8 clear, visual slides.
4. For each slide, define a short slide title and a detailed prompt for an image that visually represents that slide.
</task>

<instructions>
1. Structure the deck with a clear narrative arc:
   - Slide 1: Title/Introduction — hook the audience with the core problem or opportunity
   - Slides 2–N-1: Core content — one key conceptual milestone per slide
   - Final slide: Conclusion & Takeaways — forward-looking synthesis
2. Each slide title should be concise (3–7 words), punchy, and in Title Case.
3. Each image prompt should describe:
   - Visual subject matter, central metaphor, and scene composition
   - Visual artistic style (e.g., minimalist 3D isometric render, cinematic photography, architectural diagram, editorial illustration)
   - Color palette, lighting, atmosphere, and mood
   - Perspective (e.g., wide establishing shot, macro close-up, top-down view)
4. Maintain visual consistency and a cohesive artistic style across all slides in the deck.
</instructions>

<constraints>
- Each slide must convey exactly ONE key idea or concept.
- Image prompts must be specific and detailed (50–120 words each).
- CRITICAL: Do NOT request paragraphs of text, captions, or typography inside the image prompt. Image models render text poorly; focus purely on rich visual metaphors, objects, lighting, and composition.
- Slides must flow logically — each building upon the previous.
- Keep the deck strictly between 5 and 8 slides.
</constraints>

<context>
${document}
</context>
`;

export const OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: { type: 'string', description: 'A compelling slide deck title' },
    slides: {
      type: 'array',
      description: 'Array of 5–8 slides with titles and image prompts',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Concise slide title (3–8 words)' },
          imageCreationPrompt: {
            type: 'string',
            description: 'Detailed image generation prompt (50–150 words)',
          },
        },
        required: ['title', 'imageCreationPrompt'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'slides'],
  additionalProperties: false,
};
