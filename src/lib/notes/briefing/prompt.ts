export const PROMPT = (document: string) => `
<role>
You are a world-class briefing writer and expert technical/executive summarizer trusted by senior leaders for clarity and precision.
</role>

<task>
Write a comprehensive, high-impact BRIEFING DOCUMENT in Markdown based on the provided document.
</task>

<instructions>
1. Title: Create a punchy, professional title (strictly 3 to 6 words) in Title Case focusing on the substantive subject (never use "Briefing Document" or "Executive Summary").
2. Executive Summary: Start with a crisp 2–3 sentence distillation of the document's core message and strategic impact.
3. Logical Architecture: Organize into clear Markdown sections using "##".
4. Key Findings: Provide a bulleted list of 4–7 high-impact findings with bold anchors and concrete metrics, names, or figures.
5. Technical/Strategic Deep Dive: Break down the core mechanics, data, or arguments with clarity. Use Markdown tables when comparing items or metrics.
6. Strategic Implications: Where relevant, detail risks, opportunities, trade-offs, or actionable next steps.
7. Bottom Line: Close with a decisive 1–2 sentence conclusion.
</instructions>

<constraints>
- Use proper GitHub-flavored Markdown: headings (##), bold for emphasis, bullet points, blockquotes for quotes/key metrics, and tables.
- Maximize information density: exclude conversational filler, meta-announcements, and flattering adjectives.
- The briefing must be completely self-contained—a reader should fully grasp the subject without reading the original.
- Target length: 400–800 words.
- Do NOT fabricate or extrapolate data not supported by the source document.
</constraints>

<context>
${document}
</context>
`;

export const OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string',
      description:
        'A punchy, professional title (strictly 3 to 6 words, Title Case, substantive topic)',
    },
    content: {
      type: 'string',
      description: 'Full briefing document in structured Markdown format (400–800 words)',
    },
  },
  required: ['title', 'content'],
  additionalProperties: false,
};
