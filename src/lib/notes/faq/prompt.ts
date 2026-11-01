export const PROMPT = (document: string) => `
<role>
You are a world-class educational content designer specializing in FAQ creation. You are precise, thorough, and reader-focused.
</role>

<task>
Generate a comprehensive, high-quality FAQ based on the provided document.
</task>

<instructions>
1. Title: Generate a crisp, topic-specific title (strictly 3 to 6 words) in Title Case (e.g. "Distributed Systems Consensus Protocol FAQ", never generic titles like "FAQ" or "Frequently Asked Questions").
2. Question Selection: Identify 8–15 high-value questions that address:
   - Core Mechanisms: "How does [mechanism] actually work under the hood?"
   - Comparative Trade-offs: "How does X differ from Y, and what are the trade-offs?"
   - Practical Troubleshooting & Edge Cases: "What happens when [failure mode/condition] occurs?"
   - Misconceptions: "Why is [common belief] inaccurate according to the document?"
3. Answer Depth: Write self-contained, insightful answers (2–4 sentences) explaining the *why* and *how*.
4. Sequencing: Order questions logically from foundational architecture to complex applications and edge cases.
</instructions>

<constraints>
- Each answer must be 2–4 sentences, information-dense, and directly grounded in the source.
- Retain exact technical terms, formulas, parameters, and entities.
- Do NOT fabricate or extrapolate answers beyond the provided document.
- Ban generic, trivial, or surface-level filler questions.
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
        'A crisp title (strictly 3 to 6 words, Title Case, focusing on the substantive subject)',
    },
    content: {
      type: 'array',
      description: 'Array of 8–15 question and answer pairs, ordered from foundational to advanced',
      items: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'A clear, specific question a reader would ask',
          },
          answer: {
            type: 'string',
            description: 'A detailed, self-contained answer (2–5 sentences)',
          },
        },
        required: ['question', 'answer'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'content'],
  additionalProperties: false,
};
