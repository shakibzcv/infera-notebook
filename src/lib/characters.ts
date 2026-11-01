/**
 * Gemini TTS Voice Registry
 * Contains all 30 available Gemini TTS voices with their characteristics.
 */
export interface SpeakerCharacter {
  name: string;
  model: string; // The voice_name in Gemini API
  gender: 'male' | 'female' | 'neutral';
  description: string;
}

export const geminiVoices: SpeakerCharacter[] = [
  // BRIGHT & UPBEAT
  { name: 'Sarah Jenkins', model: 'Zephyr', gender: 'female', description: 'Bright and clear' },
  { name: 'Michael Davis', model: 'Puck', gender: 'male', description: 'Upbeat and energetic' },
  { name: 'Emily Chen', model: 'Autonoe', gender: 'female', description: 'Bright and articulate' },
  {
    name: 'Jessica Taylor',
    model: 'Laomedeia',
    gender: 'female',
    description: 'Upbeat and positive',
  },
  {
    name: 'Rachel Adams',
    model: 'Sadachbia',
    gender: 'female',
    description: 'Lively and engaging',
  },

  // INFORMATIVE & FIRM
  { name: 'David Miller', model: 'Charon', gender: 'male', description: 'Informative and steady' },
  {
    name: 'Laura Robinson',
    model: 'Kore',
    gender: 'female',
    description: 'Firm and authoritative',
  },
  { name: 'James Wilson', model: 'Orus', gender: 'male', description: 'Firm and commanding' },
  {
    name: 'Robert Martinez',
    model: 'Rasalgethi',
    gender: 'male',
    description: 'Informative and professional',
  },
  { name: 'William Anderson', model: 'Alnilam', gender: 'male', description: 'Firm and steady' },

  // SMOOTH & GENTLE
  { name: 'Maria Garcia', model: 'Algieba', gender: 'female', description: 'Smooth and pleasant' },
  {
    name: 'Sophia Thompson',
    model: 'Despina',
    gender: 'female',
    description: 'Smooth and consistent',
  },
  { name: 'John Lewis', model: 'Achernar', gender: 'male', description: 'Soft and gentle' },
  { name: 'Olivia White', model: 'Vindemiatrix', gender: 'female', description: 'Gentle and kind' },
  { name: 'Isabella Clark', model: 'Sulafat', gender: 'female', description: 'Warm and inviting' },

  // CASUAL & FRIENDLY
  {
    name: 'Chloe Walker',
    model: 'Callirrhoe',
    gender: 'female',
    description: 'Easy-going and natural',
  },
  {
    name: 'Christopher Hall',
    model: 'Umbriel',
    gender: 'male',
    description: 'Easy-going and relaxed',
  },
  {
    name: 'Daniel Young',
    model: 'Achird',
    gender: 'male',
    description: 'Friendly and approachable',
  },
  {
    name: 'Matthew Allen',
    model: 'Zubenelgenubi',
    gender: 'male',
    description: 'Casual and relatable',
  },

  // UNIQUE & CHARACTERFUL
  { name: 'Ryan King', model: 'Fenrir', gender: 'male', description: 'Excitable and high-energy' },
  { name: 'Lily Wright', model: 'Leda', gender: 'female', description: 'Youthful and energetic' },
  { name: 'Ava Scott', model: 'Aoede', gender: 'female', description: 'Breezy and light' },
  { name: 'Andrew Green', model: 'Enceladus', gender: 'male', description: 'Breathy and intimate' },
  { name: 'Joseph Baker', model: 'Iapetus', gender: 'male', description: 'Clear and resonant' },
  { name: 'Mia Nelson', model: 'Erinome', gender: 'female', description: 'Clear and distinct' },
  { name: 'Thomas Carter', model: 'Algenib', gender: 'male', description: 'Gravelly and mature' },
  { name: 'Anthony Mitchell', model: 'Schedar', gender: 'male', description: 'Even and balanced' },
  { name: 'Richard Perez', model: 'Gacrux', gender: 'male', description: 'Mature and wise' },
  {
    name: 'Victoria Roberts',
    model: 'Pulcherrima',
    gender: 'female',
    description: 'Forward and direct',
  },
  {
    name: 'Charles Turner',
    model: 'Sadaltager',
    gender: 'male',
    description: 'Knowledgeable and academic',
  },
];

// Re-export for compatibility
export const auraSpeakers = geminiVoices;
