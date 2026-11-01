export const PROMPT = (document: string) => `
<role>
You are an expert knowledge architect specializing in hierarchical concept mapping and visual information design.
</role>

<task>
Create a comprehensive, well-structured MINDMAP that captures the key ideas, relationships, and details of the document.
</task>

<instructions>
1. Identify the single central topic of the document as the root node.
2. Break it into 3–6 major subtopics as the first level of children.
3. For each subtopic, add 2–5 detailed child nodes capturing specific concepts, facts, or examples.
4. Go 3–4 levels deep where the content warrants it.
5. Use short, human-readable labels (3–8 words per node) in Title Case or sentence case.
6. IDs must be short, unique, machine-friendly kebab-case strings (e.g., "root", "methods-1", "result-a").
</instructions>

<constraints>
- CHILDREN MUST ALWAYS BE OBJECTS with {id, label, expanded, children} — NEVER plain strings.
- Leaf nodes (nodes with no further sub-points) MUST have "children: []" (an empty array), NEVER null, omitted, or string.
- The root node must have "expanded: true". First-level children should have "expanded: true". Deeper nodes should have "expanded: false".
- Total node count across the tree should be between 15 and 45.
- Labels must be concise phrases, not full sentences or paragraphs.
- Title must be strictly 3 to 5 words in Title Case.
- Organize concepts from general to specific within each branch without duplicating ideas.
</constraints>

<context>
${document}
</context>
`;

export const OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: { type: 'string', description: 'Title of the mindmap' },
    content: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
        expanded: { type: 'boolean' },
        children: { type: 'array' },
      },
      required: ['id', 'label', 'expanded', 'children'],
      additionalProperties: false,
    },
  },
  required: ['title', 'content'],
  additionalProperties: false,
};
