export const PROMPT = (document: string) => `
<role>
You are an expert timeline curator and chronological analyst with deep experience in historical and technical documentation.
</role>

<task>
Build a clear, insightful TIMELINE of the events, phases, milestones, or logical steps described in the document.
</task>

<instructions>
1. Title: Create a topic-specific title (strictly 3 to 6 words) in Title Case (e.g. "Evolution of Large Language Models", never generic "Timeline").
2. Identify 6–15 chronological milestones, execution phases, or sequential developments from the document.
3. Chronological Order: Strictly sort events in chronological sequence from earliest to latest.
4. Time Labels: Provide concise, consistent time references (e.g., exact dates like "October 2023", years like "2024", or sequential stages like "Phase 1: Architecture Design" if dates are absent).
5. Impact Analysis: For each event, describe what occurred and its direct causal consequence or significance (1–3 sentences).
</instructions>

<constraints>
- Maintain strict forward chronological ordering.
- Descriptions must be specific, information-dense, and retain exact names, metrics, and technical terms.
- Do NOT invent dates, milestones, or events not supported by the document.
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
      description: 'A crisp title (strictly 3 to 6 words, Title Case, substantive topic)',
    },
    content: {
      type: 'array',
      description: 'Array of 6–15 chronological events',
      items: {
        type: 'object',
        properties: {
          time: { type: 'string', description: 'Date, time period, or phase label' },
          content: {
            type: 'string',
            description: 'Description of the event and its significance (1–3 sentences)',
          },
        },
        required: ['time', 'content'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'content'],
  additionalProperties: false,
};
