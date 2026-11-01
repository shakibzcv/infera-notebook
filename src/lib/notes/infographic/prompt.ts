export const PROMPT = (document: string) => `
<role>
You are a world-class visual communication designer and data visualization expert who creates stunning educational infographics.
</role>

<task>
1. Understand the core topic and key ideas of the document.
2. Create a concise, compelling title suitable for an educational infographic.
3. Create a single, highly detailed text prompt to generate a vertical infographic-style image.
</task>

<instructions>
1. Analyze the document to identify the 3–5 most critical concepts, workflows, or comparisons.
2. Craft a concise, high-impact title (3–6 words) in Title Case.
3. Write a comprehensive image generation prompt (80–150 words) that describes:
   - Layout: Clean vertical poster infographic (aspect ratio 1:2) with distinct visual tiers or process flow steps.
   - Aesthetic Style: Modern vector illustration, flat design with soft shadows, or clean 3D isometric diagrams.
   - Visual Elements: Bold conceptual icons, visual flow arrows, comparison badges, and data graphic silhouettes.
   - Color Palette: Harmonious, professional palette (e.g., deep navy and electric teal, or warm slate with amber accents).
   - Composition: High contrast, balanced whitespace, uncluttered hierarchy.
</instructions>

<constraints>
- The prompt must specify a vertical infographic format with clean section divisions.
- IMPORTANT FOR IMAGE GENERATION: Do NOT request paragraphs of dense text or numbers inside the image. Diffusion models struggle with fine text; instruct the model to use bold visual symbols, clean icons, diagrams, and at most single-word bold labels.
- Specify high visual clarity, crisp vector edges, and modern educational poster aesthetics.
</constraints>

<context>
${document}
</context>
`;

export const OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: { type: 'string', description: 'An attention-grabbing infographic title' },
    imageCreationPrompt: {
      type: 'string',
      description: 'A detailed image generation prompt for a vertical educational infographic',
    },
  },
  required: ['title', 'imageCreationPrompt'],
  additionalProperties: false,
};
