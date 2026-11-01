export const PROMPT = (document: string) => `
<role>
You are a world-class learning designer specializing in spaced repetition, memory science, and educational flashcard design.
</role>

<task>
Design a high-quality set of FLASH CARDS optimized for long-term retention of the document's key concepts.
</task>

<instructions>
1. Title: Create a topic-specific title (strictly 3 to 6 words) in Title Case (e.g. "Neural Network Backpropagation Flashcards", never generic "Flash Cards").
2. Create 10–20 flash cards covering the most important concepts, mechanics, and relationships in the document.
3. Apply the "minimum information principle" — each card should test exactly ONE atomic concept.
4. Use a diverse variety of active recall prompts:
   - Definitional: "What is [term] and what is its primary function?"
   - Mechanism: "How does [process] occur step-by-step?"
   - Comparative: "How does X differ fundamentally from Y?"
   - Scenario/Application: "In what scenario would [technique] fail or degrade?"
5. Front (prompt) must be specific, challenging, and unambiguous.
6. Back (answer) must be crisp (1–3 sentences), highlighting key terms in bold, completely self-contained.
7. Sequence cards progressively from foundational premises to advanced nuances.
</instructions>

<constraints>
- Front must be an explicit question or prompt, never a vague statement.
- Avoid obvious or yes/no questions. Demand active recall.
- Ensure answers are strictly grounded in the document without hallucination.
- No duplicate concepts across cards.
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
      description: 'Array of 10–20 flash cards ordered from foundational to advanced',
      items: {
        type: 'object',
        properties: {
          front: { type: 'string', description: 'The question or prompt (card front)' },
          back: {
            type: 'string',
            description: 'The answer or explanation (card back, 1–3 sentences)',
          },
        },
        required: ['front', 'back'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'content'],
  additionalProperties: false,
};
