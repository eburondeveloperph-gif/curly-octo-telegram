
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE } from './constants';
import {
  FunctionResponse,
  FunctionResponseScheduling,
  GroundingChunk as LiveGroundingChunk,
  LiveServerToolCall,
} from '@google/genai';

export const generateSystemPrompt = (
  lang1: string,
  lang2: string,
  topic: string,
) => {
  const topicInstruction = topic ? `The conversation is about: ${topic}. Please use appropriate terminology and context.` : '';
  return `You are a real-time interpreter between a staff member and a guest.

LANGUAGE SETTINGS:
- Staff language: ${lang1}
- Guest language: ${lang2}

YOUR JOB:
Translate every incoming message into the OTHER party's language, always vice versa.

TRANSLATION RULES:
1. FIRST: Detect the source language of the incoming message.
2. IF source language is ${lang1} (Staff language) → translate to ${lang2} (Guest language).
3. IF source language is ${lang2} (Guest language) → translate to ${lang1} (Staff language).
4. IF source language is NEITHER ${lang1} nor ${lang2}:
   - Assume it's from the GUEST and translate to ${lang1} (Staff language)
   - This handles cases where guest speaks other languages (Thai, Japanese, etc.)
5. Always translate toward the LISTENER's language:
   - Staff speaking → output in guest language (${lang2})
   - Guest speaking → output in staff language (${lang1})
6. Preserve meaning, tone, politeness, and intent.
7. Keep names, codes, room numbers, dates, times, and identifiers unchanged.
8. If message contains mixed-language fragments, translate the full message into the appropriate target language naturally.

LANGUAGE DETECTION PRIORITY:
- ${lang1}: Staff language
- ${lang2}: Guest language  
- Any other language: Treat as Guest speaking, translate to ${lang1}

CRITICAL OUTPUT RULES:
- Output ONLY the translation.
- Do NOT add prefixes, labels, or explanations.
- Do NOT have a conversation.
- Do NOT ask questions.
- Do NOT add commentary.
- Do NOT repeat the original text.
- Do NOT identify the source language.

Your response must always be only the translated message in the target language.
${topicInstruction}
`;
};


/**
 * Settings
 */
export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice: string;
  language1: string;
  language2: string;
  topic: string;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setLanguage1: (language: string) => void;
  setLanguage2: (language: string) => void;
  setTopic: (topic: string) => void;
}>((set, get) => ({
  systemPrompt: generateSystemPrompt('Dutch', 'Tagalog (Filipino)', ''),
  model: DEFAULT_LIVE_API_MODEL,
  voice: DEFAULT_VOICE,
  language1: 'Dutch',
  language2: 'Tagalog (Filipino)',
  topic: '',
  setSystemPrompt: prompt => set({ systemPrompt: prompt }),
  setModel: model => set({ model }),
  setVoice: voice => set({ voice }),
  setLanguage1: language => set({
    language1: language,
    systemPrompt: generateSystemPrompt(language, get().language2, get().topic)
  }),
  setLanguage2: language => set({
    language2: language,
    systemPrompt: generateSystemPrompt(get().language1, language, get().topic)
  }),
  setTopic: topic => set({
    topic: topic,
    systemPrompt: generateSystemPrompt(get().language1, get().language2, topic)
  }),
}));

/**
 * UI
 */
export const useUI = create<{
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}>(set => ({
  isSidebarOpen: false,
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

export type GuestLanguageSetupPhase =
  | 'idle'
  | 'playing_intro'
  | 'listening'
  | 'configured'
  | 'error';

export const useGuestLanguageSetup = create<{
  guestLanguage: string | null;
  message: string;
  phase: GuestLanguageSetupPhase;
  setConfiguredLanguage: (language: string) => void;
  setStatus: (phase: GuestLanguageSetupPhase, message: string) => void;
  clearStatus: () => void;
}>((set, get) => ({
  guestLanguage: null,
  message: '',
  phase: 'idle',
  setConfiguredLanguage: language =>
    set({
      guestLanguage: language,
      message: `Guest Language is set to ${language}`,
      phase: 'configured',
    }),
  setStatus: (phase, message) =>
    set({
      guestLanguage: get().guestLanguage,
      message,
      phase,
    }),
  clearStatus: () =>
    set(state => ({
      guestLanguage: state.guestLanguage,
      message: state.guestLanguage
        ? `Guest Language is set to ${state.guestLanguage}`
        : '',
      phase: state.guestLanguage ? 'configured' : 'idle',
    })),
}));

export const useAudioActivity = create<{
  inputSpeaking: boolean;
  inputVolume: number;
  outputSpeaking: boolean;
  outputVolume: number;
  reset: () => void;
  setInputActivity: (volume: number, speaking: boolean) => void;
  setOutputActivity: (volume: number, speaking: boolean) => void;
}>(set => ({
  inputSpeaking: false,
  inputVolume: 0,
  outputSpeaking: false,
  outputVolume: 0,
  reset: () =>
    set({
      inputSpeaking: false,
      inputVolume: 0,
      outputSpeaking: false,
      outputVolume: 0,
    }),
  setInputActivity: (volume, speaking) =>
    set({
      inputSpeaking: speaking,
      inputVolume: volume,
    }),
  setOutputActivity: (volume, speaking) =>
    set({
      outputSpeaking: speaking,
      outputVolume: volume,
    }),
}));

/**
 * Tools
 */
export interface FunctionCall {
  name: string;
  description: string;
  parameters: any;
  isEnabled: boolean;
  scheduling: FunctionResponseScheduling;
}

/**
 * Logs
 */
export interface LiveClientToolResponse {
  functionResponses?: FunctionResponse[];
}
export type GroundingChunk = LiveGroundingChunk;

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  toolUseRequest?: LiveServerToolCall;
  toolUseResponse?: LiveClientToolResponse;
  groundingChunks?: GroundingChunk[];
}

// Generate unique timestamps for turns
let turnCounter = 0;
const getUniqueTimestamp = () => {
  turnCounter++;
  return new Date(Date.now() + turnCounter);
};

export const useLogStore = create<{
  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  clearTurns: () => void;
}>((set, get) => ({
  turns: [],
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) =>
    set(state => ({
      turns: [...state.turns, { ...turn, timestamp: getUniqueTimestamp() }],
    })),
  updateLastTurn: (update: Partial<Omit<ConversationTurn, 'timestamp'>>) => {
    set(state => {
      if (state.turns.length === 0) {
        return state;
      }
      const newTurns = [...state.turns];
      const lastTurn = { ...newTurns[newTurns.length - 1], ...update };
      newTurns[newTurns.length - 1] = lastTurn;
      return { turns: newTurns };
    });
  },
  clearTurns: () => set({ turns: [] }),
}));
