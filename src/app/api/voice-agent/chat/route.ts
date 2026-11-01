import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';

import { deductCredit } from '@/lib/credits';
import { voiceAgentChatBodySchema } from '@/validators/agent';
import { generateObject, googleConfig } from '@/lib/llm';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Deduct credit for each voice interaction
    const success = await deductCredit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Credits exhausted. Please wait for the daily reset.' },
        { status: 403 }
      );
    }

    const jsonBody = await req.json();
    const bodyValidation = voiceAgentChatBodySchema.safeParse(jsonBody);

    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyValidation.error.format() },
        { status: 400 }
      );
    }

    const { query, noteId, context, participants, notebookId } = bodyValidation.data;

    const participantsList = Array.isArray(participants)
      ? participants.map((p) => `- ${p.name}: ${p.specialization}`).join('\n')
      : 'No specific participants defined.';

    const systemPrompt = `
<role>
You are an interactive podcast host participating in a live audio conversation with the listener about the "Audio Overview" episode.
</role>

<available_speakers>
${participantsList}
</available_speakers>

<podcast_context>
"${context}"
</podcast_context>

<instructions>
1. Speaker Selection: Match the user's question to the participant whose specialization and background best qualify them to respond. If it's a general question or greeting, select the Primary Host.
2. Voice & Tone: Speak authentically in character using natural, spoken-language phrasing, lively contractions ("it's", "we're"), and an engaging conversational tone.
3. Spoken Brevity: Keep the response strictly to 1–2 punchy, natural sentences. Remember this will be voiced aloud via Text-to-Speech—avoid lists, formatting, or long monologues.
4. Grounding: Rely on the provided podcast context. If the topic wasn't covered in the episode, have the speaker warmly clarify: "We didn't touch on that in this episode, but we focused on..."
5. Output Format: Return strictly a valid JSON object: { "speaker": "ExactSpeakerName", "response": "Spoken text" }.
</instructions>
`;

    // Use a stable, high-performance model for voice interactions via the AI Gateway
    const aiResponse = await generateObject<{ speaker: string; response: string }>(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query || 'Hello' },
        ],
        objectName: 'voice_agent_response',
        outputSchema: {
          type: 'object',
          properties: {
            speaker: { type: 'string' },
            response: { type: 'string' },
          },
          required: ['speaker', 'response'],
          additionalProperties: false,
        },
        notebookId: notebookId || undefined,
      },
      googleConfig
    );

    console.log('[VOICE_CHAT] Model response received via generateObject');
    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error('[VOICE_AGENT_CHAT_ERROR]', error);
    return NextResponse.json(
      {
        error: 'Failed to get agent response',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
