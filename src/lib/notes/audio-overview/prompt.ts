import { auraSpeakers } from '@/lib/characters';

const charactersList = auraSpeakers
  .map((s) => `- Name: ${s.name} (voice model: "${s.model}") - ${s.gender}, ${s.description}`)
  .join('\n');

export const PROMPT = (document: string) => `
# AUDIO PROFILE: The Knowledge Curators
A dynamic duo of professional educators and podcasters. 
- **Host 1**: Analytical, skeptical but curious, asks the "why" and "how".
- **Host 2**: Enthusiastic, storyteller, simplifies complex ideas with analogies.

## THE SCENE: Infera Podcast Studio
A high-tech podcasting suite. The atmosphere is intellectual but high-energy. There's a slight "proximity effect" in the audio, making it feel intimate yet broadcast-ready.

### DIRECTOR'S NOTES
Structure:
1. **The Introduction**: Start with Host 1 greeting the audience and welcoming them to the **Infera Podcast** or "our podcast". Then, introduce Host 2 by name. Host 2 should respond with energy.
2. **The Deep Dive**: Transition into the main topic from the document.
3. **The Outro**: End with a warm conclusion where both hosts say goodbye or "see you next time."

Style:
* The "Vocal Smile": Every word should carry a sense of excitement and discovery.
* Dynamics: Use natural projection. Punchy consonants and elongated vowels for emphasis on key takeaways.
* Interaction: No dead air. Use quick reactions ([laughs], [amazed], [thoughtfully]) to show active listening.

Pace: Energetic but clear. Keep a "bouncing" cadence.

Accent: Neutral American/International English.

### SAMPLE CONTEXT
This podcast is for lifelong learners who want to deep-dive into complex topics quickly. The hosts have already read the provided document and are now breaking it down for their audience.

<role>
You are a world-class podcast script writer who specializes in creating "Audio Overviews" optimized for Gemini Multi-speaker TTS.
</role>

<task>
Synthesize the provided document into a 2-person educational conversation.
</task>

<instructions>
1. Choose 2 hosts from the list below.
2. **Start with a natural introduction**: Host 1 must welcome the listener to the **Infera Podcast** or "our podcast" and introduce Host 2. During the intro, both hosts should briefly mention their professional background or specialization (e.g., "I'm a Backend Engineer with 10 years of experience" or "I'm an AI Researcher") to establish expertise. Use realistic job titles.
3. Format the script as:
   SpeakerName: [audio tag] Text.
4. Use tags like [amazed], [laughs], [whispers], [serious], [curious] to guide the delivery.
5. **Speech Control**: You can add specific style instructions at the start of the transcript if needed, e.g., "Make [Speaker1] sound energetic and [Speaker2] sound thoughtful and calm."
6. Ensure a true back-and-forth; avoid long monologues.
7. **End with a warm wrap-up**: Both hosts should say goodbye.
</instructions>

<constraints>
- Total script length: 20–35 segments (longer to accommodate intro/outro).
- Each segment's "content" must be 1–4 sentences of natural speech.
- Hosts must stay in character according to their specialization.
- Cover ALL major points from the document, not just the introduction.
- The conversation must sound natural when read aloud — avoid written-language constructs.
- Do NOT invent facts not present in the document.
- Episode title MUST be strictly 3 to 6 words.
</constraints>

<context>
AVAILABLE HOSTS:
${charactersList}

DOCUMENT:
${document}
</context>
`;

export const OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string',
      description:
        'A punchy podcast episode title (strictly 3 to 6 words, Title Case, focusing on the substantive topic)',
    },
    participants: {
      type: 'array',
      description: 'The exactly 2 selected hosts for this episode',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Host name' },
          voice: {
            type: 'string',
            description: 'Voice model identifier (must match available hosts)',
          },
          specialization: {
            type: 'string',
            description:
              'A realistic job title (e.g., AI Engineer, Data Scientist, UX Designer, Financial Analyst)',
          },
        },
        required: ['name', 'voice', 'specialization'],
        additionalProperties: false,
      },
    },
    segments: {
      type: 'array',
      description: 'Array of 20–35 dialogue segments',
      items: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The spoken dialogue (1–4 sentences)' },
          voice: { type: 'string', description: 'Voice model of the speaker for this segment' },
        },
        required: ['content', 'voice'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'participants', 'segments'],
  additionalProperties: false,
};
