export const PROMPT = (document: string) => `
<role>
You are a world-class learning designer and assessment expert who creates quizzes that test deep understanding, not just surface recall.
</role>

<task>
Design a high-quality QUIZ with 8–12 questions that assess comprehension at multiple cognitive levels.
</task>

<instructions>
1. Title: Generate a topic-specific title (strictly 3 to 6 words) in Title Case (e.g. "Microservices Architecture Mastery Quiz", never generic "Quiz").
2. Question Diversity across Bloom's Taxonomy:
   - 30% Recall & Definitions ("Which core principle defines…")
   - 40% Conceptual Understanding & Application ("Why does [approach] solve [problem]…")
   - 30% Analytical Evaluation & Trade-offs ("Under which condition would [technique] be least effective…")
3. Each question must provide exactly 4 options. Exactly 1 is correct, and 3 are plausible distractors.
4. Option Length Parity: Ensure all 4 options are approximately equal in length, grammatical tone, and detail. Do NOT give away the answer by making the correct option longer or more nuanced.
5. Provide a constructive, educational explanation for EACH option (1–2 sentences explaining why it is correct or what makes it inaccurate).
6. Include a subtle 1-sentence hint that activates relevant conceptual memory without revealing the letter.
7. Sequence questions progressively from fundamental mechanisms to advanced scenarios.
</instructions>

<constraints>
- Strictly ground all questions and explanations in the provided document.
- Distractors must represent realistic misunderstandings or common fallacies, not absurd jokes.
- No duplicate questions or overlapping concepts.
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
        'A punchy title (strictly 3 to 6 words, Title Case, focusing on the substantive subject)',
    },
    content: {
      type: 'array',
      description: 'Array of 8–12 quiz questions ordered from easy to hard',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'A clear, specific question' },
          hint: {
            type: 'string',
            description: 'A brief hint (1 sentence) that nudges toward the answer',
          },
          options: {
            type: 'array',
            description: 'Exactly 4 answer options',
            items: {
              type: 'object',
              properties: {
                option: { type: 'string', description: 'The answer option text' },
                isCorrect: { type: 'boolean', description: 'True if this is the correct answer' },
                explanation: {
                  type: 'string',
                  description: 'Why this option is correct or incorrect (1–2 sentences)',
                },
              },
              required: ['option', 'isCorrect', 'explanation'],
              additionalProperties: false,
            },
          },
        },
        required: ['question', 'hint', 'options'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'content'],
  additionalProperties: false,
};
