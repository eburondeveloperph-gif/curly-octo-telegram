
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
  
  // Create comprehensive language mappings with regional dialects
  const getLanguageMappings = (language: string) => {
    const mappings: { [key: string]: string[] } = {
      // Philippines - Comprehensive dialects and variations
      'Tagalog (Filipino)': [
        'Tagalog', 'Filipino', 'Filipino language', 'Wikang Tagalog', 'Filipinong wika',
        // Major regional dialects
        'Ilocano', 'Ilokano', 'Ilocos', 'Iluko', 'Samtoy',
        'Cebuano', 'Bisaya', 'Bisayan', 'Kabisayan', 'Sugboanon', 'Binisaya',
        'Kapampangan', 'Pampango', 'Kapampangan language', 'Amanung Sisuan',
        'Bikolano', 'Bicolano', 'Bikol', 'Bicol language', 'Bikol Central',
        'Hiligaynon', 'Ilonggo', 'Kinaray-a', 'Capiznon',
        'Waray', 'Waray-Waray', 'Winaray', 'Lineyte-Samarnon',
        'Pangasinan', 'Pangasinense', 'Pangalatok',
        'Maguindanao', 'Maguindanaon', 'Iranun',
        'Maranao', 'Maranaw', 'Maranao language',
        'Tausug', 'Sama', 'Suluk', 'Tausug language',
        'Chavacano', 'Chabacano', 'Zamboangueño', 'Bol-anon',
        // Other Philippine languages
        'Kankanaey', 'Ibaloi', 'Ifugao', 'Kalinga', 'Apayao', 'Ybanag', 'Gaddang'
      ],
      
      // Netherlands - Comprehensive Dutch variations
      'Dutch': [
        'Dutch', 'Nederlands', 'Nederlandse taal', 'Hollands',
        // Regional dialects
        'Flemish', 'Vlaams', 'Belgian Dutch', 'Vlaams-Nederlands',
        'Brabantic', 'Brabants', 'Hollands', 'Limburgish', 'Limburgs',
        'Zeelandic', 'Zeeuws', 'Dutch Low Saxon', 'Nedersaksisch',
        'West Frisian', 'Frisian', 'Frysk', 'Fries',
        'Surinamese Dutch', 'Surinaams-Nederlands',
        'Afrikaans', 'Kaaps', 'Cape Dutch'
      ],
      
      // France - Comprehensive French variations
      'French': [
        'French', 'Français', 'Francais', 'Langue française', 'Französisch',
        // Regional dialects and languages
        'Occitan', 'Langue d\'oc', 'Provençal', 'Languedocien', 'Gascon', 'Limousin',
        'Breton', 'Brezhoneg', 'Breizh',
        'Corsican', 'Corsu', 'Corse',
        'Alsatian', 'Elsässisch', 'Alsatian German',
        'Basque', 'Euskara', 'Euskal herria',
        'Catalan', 'Català', 'Catalan language', 'Northern Catalan',
        'Picard', 'Ch\'ti', 'Rouchi',
        'Norman', 'Normand', 'Jèrriais', 'Guernésiais',
        'Walloon', 'Walloon language', 'Waals', 'Wallon',
        'Franco-Provençal', 'Arpitan', 'Arpitan language'
      ],
      
      // Germany - Comprehensive German variations
      'German': [
        'German', 'Deutsch', 'Deutsche Sprache', 'Allemand',
        // Major dialects
        'Bavarian', 'Bairisch', 'Austrian German', 'Österreichisches Deutsch',
        'Swiss German', 'Schweizerdeutsch', 'Schwyzertütsch',
        'Low German', 'Plattdeutsch', 'Niederdeutsch',
        'Alemannic', 'Alemannisch', 'Swabian', 'Schwäbisch',
        'Hessian', 'Hessisch', 'Palatinate German', 'Pfälzisch',
        'Saxon', 'Sächsisch', 'Thuringian', 'Thüringisch',
        'Brandenburgish', 'Märkisch', 'Mecklenburgish', 'Plautdietsch',
        'Luxembourgish', 'Lëtzebuergesch', 'Luxemburgisch'
      ],
      
      // Spain - Comprehensive Spanish variations
      'Spanish': [
        'Spanish', 'Español', 'Castellano', 'Lengua española', 'Espagnol',
        // Regional languages and dialects
        'Catalan', 'Català', 'Valencian', 'Valencià', 'Balearic', 'Mallorquí',
        'Galician', 'Galego', 'Gallego', 'Galician language',
        'Basque', 'Euskara', 'Euskal', 'Basque language', 'Euskal herria',
        'Andalusian Spanish', 'Andaluz', 'Extremeño', 'Murcian',
        'Canarian Spanish', 'Canario', 'Leonese', 'Llionés', 'Aragonese', 'Aragonés',
        'Asturian', 'Asturianu', 'Bable', 'Ladino', 'Judeo-Spanish', 'Sefardí'
      ],
      
      // Italy - Comprehensive Italian variations
      'Italian': [
        'Italian', 'Italiano', 'Lingua italiana', 'Italien',
        // Regional languages and dialects
        'Sicilian', 'Sicilianu', 'Siciliano', 'Sicilian language',
        'Neapolitan', 'Nnapulitano', 'Neapolitan language',
        'Venetian', 'Vèneto', 'Venetian language',
        'Lombard', 'Lombard', 'Lombardo', 'Western Lombard', 'Eastern Lombard',
        'Piedmontese', 'Piemontèis', 'Piedmontese language',
        'Sardinian', 'Sardu', 'Sardo', 'Sardinian language', 'Logudorese', 'Campidanese',
        'Ligurian', 'Ligure', 'Genoese', 'Zeneize',
        'Emilian-Romagnol', 'Emilian', 'Romagnol',
        'Friulian', 'Furlan', 'Friulian language',
        'Ladin', 'Ladino', 'Dolomitic Ladin'
      ],
      
      // Portugal - Comprehensive Portuguese variations
      'Portuguese': [
        'Portuguese', 'Português', 'Língua portuguesa', 'Portugais',
        // Regional dialects
        'Brazilian Portuguese', 'Português brasileiro', 'Português do Brasil',
        'European Portuguese', 'Português europeu', 'Português de Portugal',
        'African Portuguese', 'Angolan Portuguese', 'Mozambican Portuguese',
        'Galician', 'Galego', 'Gallego', 'Mirandese', 'Mirandês',
        'Azorean Portuguese', 'Madeiran Portuguese',
        'Alentejan Portuguese', 'Algarvian Portuguese', 'Beiran Portuguese',
        'Estremenho Portuguese', 'Minhoto Portuguese', 'Trasmontano Portuguese'
      ],
      
      // China - Comprehensive Chinese variations
      'Chinese': [
        'Chinese', '中文', '汉语', '中文语言', 'Chinois',
        // Major dialect groups
        'Mandarin', '普通话', '官话', 'Putonghua', 'Guoyu', 'Huayu',
        'Cantonese', '广东话', '粤语', 'Yue', 'Yue Chinese', 'Gwongdung Wa',
        'Wu Chinese', '吴语', 'Shanghainese', '上海话', 'Suzhounese', '宁波话',
        'Min Chinese', '闽语', 'Hokkien', '福建话', 'Taiwanese', '台语', 'Teochew', '潮州话',
        'Hakka', '客家话', 'Kejia', 'Hakka Chinese',
        'Gan Chinese', '赣语', 'Jiangxinese', 'Jiangxi Chinese',
        'Xiang Chinese', '湘语', 'Hunanese',
        'Jin Chinese', '晋语', 'Shanxinese',
        'Hui Chinese', '徽语', 'Huizhou',
        'Ping Chinese', '平话', 'Guangxi',
        // Regional variations
        'Sichuanese', '四川话', 'Chuanese', 'Dongbei', '东北话',
        'Hainanese', '海南话', 'Hainam Wa',
        'Fuzhounese', '福州话', 'Foochow', 'Hokchia'
      ],
      
      // Japan - Comprehensive Japanese variations
      'Japanese': [
        'Japanese', '日本語', 'にほんご', 'Japanese language', 'Japonais',
        // Regional dialects
        'Kansai Japanese', 'Kansai-ben', 'Osaka-ben', 'Kyoto-ben', 'Kobe-ben',
        'Kanto Japanese', 'Kanto-ben', 'Tokyo-ben', 'Edo-ben',
        'Tohoku Japanese', 'Tohoku-ben', 'Zuzu-ben', 'Tsugaru-ben',
        'Kyushu Japanese', 'Kyushu-ben', 'Hakata-ben', 'Nagasaki-ben', 'Kagoshima-ben',
        'Hokkaido Japanese', 'Hokkaido-ben',
        'Okinawan Japanese', 'Okinawa-ben', 'Uchinaaguchi', 'Ryukyuan',
        'Kagoshima Japanese', 'Satsuma-ben',
        'Hiroshima Japanese', 'Hiroshima-ben', 'Aki-ben',
        'Nagoya Japanese', 'Nagoya-ben', 'Owari-ben', 'Mikawa-ben',
        'Shikoku Japanese', 'Shikoku-ben', 'Iyo-ben', 'Tosa-ben', 'Sanuki-ben',
        'Ryukyuan languages', 'Amami', 'Miyako', 'Yaeyama', 'Yonaguni'
      ],
      
      // Korea - Comprehensive Korean variations
      'Korean': [
        'Korean', '한국어', '조선말', 'Korean language', 'Coréen',
        // Regional dialects
        'Seoul Korean', 'Gyeonggi dialect', 'Standard Korean', 'Pyongyang dialect',
        'Gyeongsang dialect', 'Southeastern Korean', 'Busan dialect', 'Daegu dialect', 'Ulsan dialect',
        'Jeolla dialect', 'Southwestern Korean', 'Gwangju dialect', 'Jeonju dialect', 'Mokpo dialect',
        'Chungcheong dialect', 'Central Korean', 'Daejeon dialect', 'Cheongju dialect',
        'Gangwon dialect', 'Yeongseo dialect', 'Yeongdong dialect',
        'Jeju dialect', 'Jeju language', 'Jejueo', 'Jeju-mal',
        'North Korean dialects', 'Hamgyong dialect', 'Pyongan dialect', 'Hwanghae dialect',
        'Korean in China', 'Chaoxianyu', 'Joseonmal',
        'Korean in Japan', 'Zainichi Korean', 'Kankokugo'
      ],
      
      // Arabic - Comprehensive Arabic variations
      'Arabic': [
        'Arabic', 'العربية', 'اللغة العربية', 'Arabe',
        // Major dialect groups
        'Egyptian Arabic', 'Egyptian', 'Masri', 'مصري', 'Cairene Arabic',
        'Levantine Arabic', 'Levantine', 'Shami', 'شامي', 'Syrian Arabic', 'Lebanese Arabic',
        'Jordanian Arabic', 'Palestinian Arabic',
        'Gulf Arabic', 'Khaliji', 'خليجي', 'Emirati Arabic', 'Saudi Arabic', 'Kuwaiti Arabic',
        'Bahraini Arabic', 'Qatari Arabic', 'Omani Arabic', 'Yemeni Arabic',
        'Iraqi Arabic', 'Mesopotamian Arabic', 'Baghdadi Arabic',
        'North African Arabic', 'Maghrebi Arabic', 'Darija', 'الدارجة',
        'Moroccan Arabic', 'Moroccan Darija', 'Algerian Arabic', 'Tunisian Arabic',
        'Libyan Arabic', 'Mauritanian Arabic',
        'Sudanese Arabic', 'Chadian Arabic', 'Nigerian Arabic',
        'Modern Standard Arabic', 'MSA', 'Fusha', 'فصحى', 'Classical Arabic',
        'Maltese', 'Malti', 'Maltese language'
      ],
      
      // Russia - Comprehensive Russian variations
      'Russian': [
        'Russian', 'Русский', 'Русский язык', 'Russe',
        // Regional dialects
        'Moscow Russian', 'St. Petersburg Russian', 'Northern Russian',
        'Southern Russian', 'Central Russian', 'Ural Russian',
        'Siberian Russian', 'Far Eastern Russian',
        // Russian in former Soviet states
        'Ukrainian Russian', 'Belarusian Russian', 'Kazakh Russian',
        'Baltic Russian', 'Caucasian Russian', 'Central Asian Russian',
        // Minority languages in Russian Federation
        'Tatar', 'Tatar language', 'Tatarça', 'Татар теле', 'Kazan Tatar',
        'Bashkir', 'Bashkir language', 'Башҡорт теле',
        'Chechen', 'Chechen language', 'Нохчийн мотт',
        'Chuvash', 'Chuvash language', 'Чăвашла',
        'Yakut', 'Sakha', 'Yakut language', 'Саха тыла',
        'Buryat', 'Buryat language', 'Буряад хэлэн',
        'Ingush', 'Ingush language', 'Гӏалгӏаи',
        'Kabardian', 'Adyghe', 'Circassian', 'Adyghe language',
        'Ossetian', 'Ossetic', 'Ossetian language', 'Ирон æвзаг',
        'Mordvin', 'Erzya', 'Moksha', 'Udmurt', 'Komi', 'Mari',
        'Karelian', 'Finnic', 'Veps', 'Izhorian', 'Votic'
      ],
      
      // English - Comprehensive English variations
      'English': [
        'English', 'English language', 'Anglais', 'Englisch', 'Inglés',
        // Major dialects
        'American English', 'US English', 'American', 'United States English',
        'British English', 'UK English', 'British', 'United Kingdom English',
        'Australian English', 'Australian', 'Aussie English', 'Strine',
        'Canadian English', 'Canadian', 'Canada English',
        'New Zealand English', 'New Zealand', 'Kiwi English',
        'Irish English', 'Irish', 'Hiberno-English',
        'Scottish English', 'Scottish', 'Scots English',
        'South African English', 'South African', 'SA English',
        'Indian English', 'Indian', 'Hinglish',
        'Singaporean English', 'Singlish', 'Singapore English',
        'Malaysian English', 'Manglish', 'Malaysian English',
        'Nigerian English', 'Nigerian', 'Naija English',
        'Philippine English', 'Filipino English', 'Taglish',
        'Jamaican English', 'Jamaican', 'Patois',
        'Caribbean English', 'West Indian English',
        'Pakistani English', 'Bangladeshi English',
        'Hong Kong English', 'Honglish',
        'Welsh English', 'Cornish English', 'Channel Islands English'
      ]
    };
    return mappings[language] || [language];
  };
  
  const lang1Mappings = getLanguageMappings(lang1);
  const lang2Mappings = getLanguageMappings(lang2);
  
  return `You are a real-time interpreter between a staff member and a guest.

LANGUAGE SETTINGS:
- Staff language: ${lang1}
- Guest language: ${lang2}

MULTILINGUAL LANGUAGE DETECTION:
- ${lang1} can be detected as: ${lang1Mappings.join(', ')}
- ${lang2} can be detected as: ${lang2Mappings.join(', ')}

PROACTIVE LANGUAGE SETUP RECOGNITION:
- ANTICIPATE user language setup attempts
- RECOGNIZE patterns like: "I speak...", "My language is...", "Can you speak..."
- IDENTIFY when users are trying to establish their language
- RESPOND appropriately to language setup requests
- GUIDE users to the correct language setup if needed

COMMON LANGUAGE SETUP PATTERNS TO RECOGNIZE:
1. Direct declarations: "I speak French", "My language is Deutsch", "Je parle Français"
2. Questions: "Can you speak Spanish?", "Do you understand Español?"
3. Preferences: "I prefer Tagalog", "I'd like to use Nederlands"
4. Context clues: "I'm from Germany", "I live in the Philippines"
5. Mixed patterns: "Hello, I speak Français", "Hola, Español por favor"

ANTICIPATORY RESPONSES:
- When language setup is detected, respond in the TARGET language
- For ${lang2} speakers: Respond in ${lang1} (Staff language)
- For ${lang1} speakers: Respond in ${lang2} (Guest language)
- If uncertain, ask for clarification in both languages
- Provide helpful guidance for language selection

YOUR JOB:
Translate every incoming message into the OTHER party's language, always vice versa.

TRANSLATION RULES:
1. FIRST: Detect if this is a LANGUAGE SETUP attempt or regular conversation.
2. IF LANGUAGE SETUP: Handle proactively (see ANTICIPATORY RESPONSES above).
3. IF REGULAR CONVERSATION: Detect the source language and translate.
4. IF source language is ${lang1} (Staff language) OR any of its variants (${lang1Mappings.join(', ')}) → translate to ${lang2} (Guest language).
5. IF source language is ${lang2} (Guest language) OR any of its variants (${lang2Mappings.join(', ')}) → translate to ${lang1} (Staff language).
6. IF source language is NEITHER ${lang1} nor ${lang2}:
   - Assume it's from the GUEST and translate to ${lang1} (Staff language)
   - This handles cases where guest speaks other languages (Thai, Japanese, etc.)
7. Always translate toward the LISTENER's language:
   - Staff speaking → output in guest language (${lang2})
   - Guest speaking → output in staff language (${lang1})
8. Preserve meaning, tone, politeness, and intent.
9. Keep names, codes, room numbers, dates, times, and identifiers unchanged.
10. If message contains mixed-language fragments, translate the full message into the appropriate target language naturally.

LANGUAGE DETECTION PRIORITY:
1. Language setup attempts (highest priority)
2. ${lang1} and its variants: Staff language
3. ${lang2} and its variants: Guest language  
4. Any other language: Treat as Guest speaking, translate to ${lang1}

MULTILINGUAL EXAMPLES:
- If French user says "Français" → detect as French, respond in ${lang1}
- If German user says "Deutsch" → detect as German, respond in ${lang2}
- If Spanish user says "Español" → detect as Spanish, respond in ${lang1}
- If Dutch user says "Nederlands" → detect as Dutch, respond in ${lang2}
- If Filipino user says "Wikang Tagalog" → detect as Tagalog, respond in ${lang1}
- If user says "I speak French" → anticipate setup, respond in ${lang1}
- If user asks "Can you speak Deutsch?" → anticipate setup, respond in ${lang2}

LANGUAGE SETUP EXAMPLE RESPONSES:
- French user: "Je parle Français" → "Bonjour! Je comprends le français. Comment puis-je vous aider?" (in ${lang1})
- German user: "Ich spreche Deutsch" → "Guten Tag! Ich verstehe Deutsch. Wie kann ich Ihnen helfen?" (in ${lang2})
- Spanish user: "¿Habla español?" → "¡Hola! Sí, hablo español. ¿En qué puedo ayudarle?" (in ${lang1})

CRITICAL OUTPUT RULES:
- For LANGUAGE SETUP: Respond appropriately in target language (may include brief confirmation)
- For REGULAR TRANSLATION: Output translation with SOURCE LANGUAGE IDENTIFICATION
- ALWAYS identify the source language for clarity and transparency
- Format: [Source Language] [Translated Text]
- Examples: [French] Bonjour, comment allez-vous? OR [Dutch] Goedemorgen, hoe gaat het?
- Do NOT add prefixes, labels, or explanations beyond language identification
- Do NOT have conversations unless it's language setup guidance.
- Do NOT ask questions unless clarifying language setup.
- Do NOT add commentary beyond language identification.
- Do NOT repeat the original text.
- ALWAYS identify the source language for user clarity.

Your response must always include source language identification: [Source Language] [Translation].
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
