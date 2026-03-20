
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
  
  // Create comprehensive language mappings with all world languages and regional dialects
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
        // Common expressions and variations
        'Kumusta', 'Kamusta', 'Musta', 'Hello',
        'Magandang umaga', 'Magandang umaga po', 'Good morning',
        'Salamat', 'Salamat po', 'Dios marhay', 'Thank you',
        'Paalam', 'Paalam po', 'Goodbye',
        'Oo', 'Opo', 'Yes (polite)',
        'Hindi', 'Hindi po', 'No (polite)',
        'Po', 'Ho', 'Respect marker',
        // Other Philippine languages
        'Kankanaey', 'Ibaloi', 'Ifugao', 'Kalinga', 'Apayao', 'Ybanag', 'Gaddang',
        'Itawit'
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
      
      // Comprehensive World Languages
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
        'Jamaican English', 'Jamaican', 'Patois', 'Jamaican Patois',
        'Caribbean English', 'West Indian English',
        'Pakistani English', 'Bangladeshi English',
        'Hong Kong English', 'Honglish',
        'Welsh English', 'Cornish English', 'Channel Islands English',
        // Other English varieties
        'Seychellois Creole', 'Mauritian Creole'
      ],
      
      // European Languages
      'French': [
        'French', 'Français', 'Francais', 'Langue française', 'Französisch',
        'French (Canada)', 'Canadian French', 'Québécois',
        // Regional dialects and languages
        'Occitan', 'Langue d\'oc', 'Provençal', 'Languedocien', 'Gascon', 'Limousin',
        'Breton', 'Brezhoneg', 'Breizh',
        'Corsican', 'Corsu', 'Corse',
        'Alsatian', 'Elsässisch', 'Alsatian German',
        'Walloon', 'Walloon language', 'Waals', 'Wallon',
        'Franco-Provençal', 'Arpitan', 'Arpitan language'
      ],
      
      'German': [
        'German', 'Deutsch', 'Deutsche Sprache', 'Allemand',
        // Major dialects
        'Bavarian', 'Bairisch', 'Austrian German', 'Österreichisches Deutsch',
        'Swiss German', 'Schweizerdeutsch', 'Schwyzertütsch',
        'Low German', 'Plattdeutsch', 'Niederdeutsch',
        'Alemannic', 'Alemannisch', 'Swabian', 'Schwäbisch',
        'Hessian', 'Hessisch', 'Palatinate German', 'Pfälzisch',
        'Saxon', 'Sächsisch', 'Thuringian', 'Thüringisch',
        'Luxembourgish', 'Lëtzebuergesch', 'Luxemburgisch',
        'Hunsrik', 'Silesian', 'Latgalian', 'Lombard', 'Ligurian', 'Limburgish'
      ],
      
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
      
      'Portuguese': [
        'Portuguese', 'Português', 'Língua portuguesa', 'Portugais',
        'Portuguese (Brazil)', 'Brazilian Portuguese', 'Português brasileiro', 'Português do Brasil',
        'Portuguese (Portugal)', 'European Portuguese', 'Português europeu', 'Português de Portugal',
        // Regional dialects
        'African Portuguese', 'Angolan Portuguese', 'Mozambican Portuguese',
        'Galician', 'Galego', 'Gallego', 'Mirandese', 'Mirandês',
        'Azorean Portuguese', 'Madeiran Portuguese'
      ],
      
      // Scandinavian Languages
      'Swedish': ['Swedish', 'Svenska', 'Svenskt språk', 'Suédois'],
      'Norwegian': ['Norwegian', 'Norsk', 'Norsk språk', 'Norvégien'],
      'Danish': ['Danish', 'Dansk', 'Dansk sprog', 'Danois'],
      'Finnish': ['Finnish', 'Suomi', 'Suomen kieli', 'Finnois'],
      'Icelandic': ['Icelandic', 'Íslenska', 'Íslenskt tungumál', 'Islandais'],
      'Faroese': ['Faroese', 'Føroyskt', 'Faroese language', 'Féroïen'],
      
      // Eastern European Languages
      'Russian': [
        'Russian', 'Русский', 'Русский язык', 'Russe',
        'Buryat', 'Buryat language', 'Буряад хэлэн',
        'Chuvash', 'Chuvash language', 'Чăвашла',
        'Komi', 'Komi language', 'Коми кыв',
        'Meadow Mari', 'Meadow Mari language', 'Олык марий',
        'Tatar', 'Tatar language', 'Tatarça', 'Татар теле',
        'Udmurt', 'Udmurt language', 'Удмурт кыл',
        'Yakut', 'Sakha', 'Yakut language', 'Саха тыла',
        'Tuvan', 'Tuvan language', 'Тыва дыл',
        'Crimean Tatar (Cyrillic)', 'Crimean Tatar (Latin)', 'Qırımtatarca'
      ],
      
      'Polish': ['Polish', 'Polski', 'Język polski', 'Polonais'],
      'Czech': ['Czech', 'Čeština', 'Český jazyk', 'Tchèque'],
      'Slovak': ['Slovak', 'Slovenčina', 'Slovenský jazyk', 'Slovaque'],
      'Hungarian': ['Hungarian', 'Magyar', 'Magyar nyelv', 'Hongrois'],
      'Romanian': ['Romanian', 'Română', 'Limba română', 'Roumain'],
      'Bulgarian': ['Bulgarian', 'Български', 'Български език', 'Bulgare'],
      'Croatian': ['Croatian', 'Hrvatski', 'Hrvatski jezik', 'Croate'],
      'Serbian': ['Serbian', 'Српски', 'Српски језик', 'Serbe'],
      'Bosnian': ['Bosnian', 'Bosanski', 'Bosanski jezik', 'Bosnien'],
      'Slovenian': ['Slovenian', 'Slovenščina', 'Slovenski jezik', 'Slovène'],
      'Estonian': ['Estonian', 'Eesti', 'Eesti keel', 'Estonien'],
      'Latvian': ['Latvian', 'Latviešu', 'Latviešu valoda', 'Letton'],
      'Lithuanian': ['Lithuanian', 'Lietuvių', 'Lietuvių kalba', 'Lituanien'],
      'Ukrainian': ['Ukrainian', 'Українська', 'Українська мова', 'Ukrainien'],
      'Belarusian': ['Belarusian', 'Беларуская', 'Беларуская мова', 'Biélorusse'],
      'Macedonian': ['Macedonian', 'Македонски', 'Македонски јазик', 'Macédonien'],
      'Albanian': ['Albanian', 'Shqip', 'Gjuha shqipe', 'Albanais'],
      'Greek': ['Greek', 'Ελληνικά', 'Ελληνική γλώσσα', 'Grec'],
      
      // Asian Languages
      'Chinese (Simplified)': [
        'Chinese (Simplified)', '简体中文', '简化字', 'Chinois simplifié',
        'Mandarin', '普通话', '官话', 'Putonghua', 'Guoyu', 'Huayu',
        'Wu Chinese', '吴语', 'Shanghainese', '上海话',
        'Gan Chinese', '赣语', 'Jiangxinese',
        'Xiang Chinese', '湘语', 'Hunanese',
        'Jin Chinese', '晋语', 'Shanxinese',
        'Hui Chinese', '徽语', 'Huizhou',
        'Ping Chinese', '平话', 'Guangxi'
      ],
      
      'Chinese (Traditional)': [
        'Chinese (Traditional)', '繁體中文', '繁體字', 'Chinois traditionnel',
        'Cantonese', '广东话', '粤语', 'Yue', 'Yue Chinese', 'Gwongdung Wa',
        'Min Chinese', '闽语', 'Hokkien', '福建话', 'Taiwanese', '台语', 'Teochew', '潮州话',
        'Hakka', '客家话', 'Kejia', 'Hakka Chinese'
      ],
      
      'Japanese': [
        'Japanese', '日本語', 'にほんご', 'Japanese language', 'Japonais',
        // Regional dialects
        'Kansai Japanese', 'Kansai-ben', 'Osaka-ben', 'Kyoto-ben', 'Kobe-ben',
        'Kanto Japanese', 'Kanto-ben', 'Tokyo-ben', 'Edo-ben',
        'Tohoku Japanese', 'Tohoku-ben', 'Zuzu-ben', 'Tsugaru-ben',
        'Kyushu Japanese', 'Kyushu-ben', 'Hakata-ben', 'Nagasaki-ben', 'Kagoshima-ben',
        'Hokkaido Japanese', 'Hokkaido-ben',
        'Okinawan Japanese', 'Okinawa-ben', 'Uchinaaguchi', 'Ryukyuan'
      ],
      
      'Korean': [
        'Korean', '한국어', '조선말', 'Korean language', 'Coréen',
        // Regional dialects
        'Seoul Korean', 'Gyeonggi dialect', 'Standard Korean', 'Pyongyang dialect',
        'Gyeongsang dialect', 'Southeastern Korean', 'Busan dialect', 'Daegu dialect', 'Ulsan dialect',
        'Jeolla dialect', 'Southwestern Korean', 'Gwangju dialect', 'Jeonju dialect', 'Mokpo dialect',
        'Chungcheong dialect', 'Central Korean', 'Daejeon dialect', 'Cheongju dialect',
        'Gangwon dialect', 'Yeongseo dialect', 'Yeongdong dialect',
        'Jeju dialect', 'Jeju language', 'Jejueo', 'Jeju-mal'
      ],
      
      'Vietnamese': ['Vietnamese', 'Tiếng Việt', 'Ngôn ngữ Việt Nam', 'Vietnamien'],
      'Thai': ['Thai', 'ไทย', 'ภาษาไทย', 'Thaï'],
      'Khmer': ['Khmer', 'ភាសាខ្មែរ', 'Khmer language', 'Khmère'],
      'Lao': ['Lao', 'ລາວ', 'ພາສາລາວ', 'Laotien'],
      'Burmese': ['Myanmar (Burmese)', 'Burmese', 'မြန်မာဘာသာ', 'Birman'],
      'Tibetan': ['Tibetan', 'བོད་ཡིག', 'Bod skad', 'Tibétain'],
      'Mongolian': ['Mongolian', 'Монгол', 'Монгол хэл', 'Mongol'],
      
      // South Asian Languages
      'Hindi': ['Hindi', 'हिन्दी', 'हिंदी भाषा', 'Hindî'],
      'Bengali': ['Bengali', 'বাংলা', 'বাংলা ভাষা', 'Bengali'],
      'Urdu': ['Urdu', 'اردو', 'اردو زبان', 'Ourdou'],
      'Punjabi (Gurmukhi)': ['Punjabi (Gurmukhi)', 'ਪੰਜਾਬੀ', 'ਪੰਜਾਬੀ ਭਾਸ਼ਾ', 'Penjabi'],
      'Punjabi (Shahmukhi)': ['Punjabi (Shahmukhi)', 'پنجابی', 'پنجابی زبان', 'Penjabi'],
      'Gujarati': ['Gujarati', 'ગુજરાતી', 'ગુજરાતી ભાષા', 'Goujarati'],
      'Marathi': ['Marathi', 'मराठी', 'मराठी भाषा', 'Marathi'],
      'Tamil': ['Tamil', 'தமிழ்', 'தமிழ் மொழி', 'Tamoul'],
      'Telugu': ['Telugu', 'తెలుగు', 'తెలుగు భాష', 'Télougou'],
      'Malayalam': ['Malayalam', 'മലയാളം', 'മലയാളം ഭാഷ', 'Malayalam'],
      'Kannada': ['Kannada', 'ಕನ್ನಡ', 'ಕನ್ನಡ ಭಾಷೆ', 'Kannada'],
      'Odia (Oriya)': ['Odia (Oriya)', 'ଓଡ଼ିଆ', 'ଓଡ଼ିଆ ଭାଷା', 'Oriya'],
      'Assamese': ['Assamese', 'অসমীয়া', 'অসমীয়া ভাষা', 'Assamais'],
      'Sinhala': ['Sinhala', 'සිංහල', 'සිංහල භාෂාව', 'Singhalais'],
      'Nepali': ['Nepali', 'नेपाली', 'नेपाली भाषा', 'Népalais'],
      'Nepalbhasa (Newari)': ['Nepalbhasa (Newari)', 'नेपालभाषा', 'Newar language', 'Newari'],
      'Maithili': ['Maithili', 'मैथिली', 'मैथिली भाषा', 'Maïthili'],
      'Bhojpuri': ['Bhojpuri', 'भोजपुरी', 'भोजपुरी भाषा', 'Bhojpouri'],
      'Awadhi': ['Awadhi', 'अवधी', 'अवधी भाषा', 'Awadhi'],
      'Dogri': ['Dogri', 'डोगरी', 'डोगरी भाषा', 'Dogri'],
      'Kashmiri': ['Kashmiri', 'कॉशुर', 'कॉशुर भाषा', 'Kashmiri'],
      'Sanskrit': ['Sanskrit', 'संस्कृतम्', 'संस्कृत भाषा', 'Sanskrit'],
      
      // Middle Eastern & African Languages
      'Arabic': [
        'Arabic', 'العربية', 'اللغة العربية', 'Arabe',
        // Major dialect groups
        'Egyptian Arabic', 'Egyptian', 'Masri', 'مصري', 'Cairene Arabic',
        'Levantine Arabic', 'Levantine', 'Shami', 'شامي', 'Syrian Arabic', 'Lebanese Arabic',
        'Jordanian Arabic', 'Palestinian Arabic',
        'Gulf Arabic', 'Khaliji', 'خليجي', 'Emirati Arabic', 'Saudi Arabic', 'Kuwaiti Arabic',
        'Iraqi Arabic', 'Mesopotamian Arabic', 'Baghdadi Arabic',
        'North African Arabic', 'Maghrebi Arabic', 'Darija', 'الدارجة',
        'Moroccan Arabic', 'Moroccan Darija', 'Algerian Arabic', 'Tunisian Arabic',
        'Sudanese Arabic', 'Chadian Arabic', 'Nigerian Arabic',
        'Modern Standard Arabic', 'MSA', 'Fusha', 'فصحى', 'Classical Arabic',
        'Maltese', 'Malti', 'Maltese language'
      ],
      
      'Persian': ['Persian', 'فارسی', 'زبان فارسی', 'Persan'],
      'Pashto': ['Pashto', 'پښتو', 'پښتو ژبه', 'Pachto'],
      'Kurdish (Kurmanji)': ['Kurdish (Kurmanji)', 'Kurdî', 'Kurdish language', 'Kurde'],
      'Kurdish (Sorani)': ['Kurdish (Sorani)', 'سۆرانی', 'Kurdish language', 'Kurde'],
      'Hebrew': ['Hebrew', 'עברית', 'שפה עברית', 'Hébreu'],
      'Turkish': ['Turkish', 'Türkçe', 'Türkçe dili', 'Turc'],
      'Azerbaijani': ['Azerbaijani', 'Azərbaycanca', 'Azərbaycan dili', 'Azéri'],
      'Armenian': ['Armenian', 'Հայերեն', 'Հայերեն լեզու', 'Arménien'],
      'Georgian': ['Georgian', 'ქართული', 'ქართული ენა', 'Géorgien'],
      'Amharic': ['Amharic', 'አማርኛ', 'አማርኛ ቋንቋ', 'Amharique'],
      'Tigrinya': ['Tigrinya', 'ትግርኛ', 'ትግርኛ ናይ', 'Tigrigna'],
      'Somali': ['Somali', 'Soomaali', 'Af Soomaali', 'Somali'],
      'Swahili': ['Swahili', 'Kiswahili', 'Lugha ya Kiswahili', 'Souahéli'],
      'Hausa': ['Hausa', 'Hausancī', 'Harshen Hausa', 'Haoussa'],
      'Yoruba': ['Yoruba', 'Yorùbá', 'Èdè Yorùbá', 'Yoruba'],
      'Igbo': ['Igbo', 'Igbo', 'Asụsụ Igbo', 'Igbo'],
      'Zulu': ['Zulu', 'isiZulu', 'Zulu language', 'Zoulou'],
      'Xhosa': ['Xhosa', 'isiXhosa', 'Xhosa language', 'Xhosa'],
      'Afrikaans': ['Afrikaans', 'Afrikaans', 'Afrikaanse taal', 'Afrikaans'],
      
      // Indigenous & American Languages
      'Quechua': ['Quechua', 'Qhichwa', 'Runa Simi', 'Quechua'],
      'Guarani': ['Guarani', 'Avañe\'ẽ', 'Guarani language', 'Guarani'],
      'Nahuatl (Eastern Huasteca)': ['Nahuatl (Eastern Huasteca)', 'Nāhuatl', 'Nahuatl language', 'Nahuatl'],
      'Yucatec Maya': ['Yucatec Maya', 'Maaya T\'aan', 'Yucatec Maya language', 'Maya Yucatèque'],
      'Qʼeqchiʼ': ['Qʼeqchiʼ', 'Q\'eqchi\'', 'Q\'eqchi\' language', 'Q\'eqchi\''],
      'Zapotec': ['Zapotec', 'Diidzaj', 'Zapotec language', 'Zapotèque'],
      'Ojibwe': ['Ojibwe', 'ᐊᓂᔑᓈᐯᐗᑲ', 'Ojibwe language', 'Ojibwé'],
      'Cree': ['Cree', 'ᓀᐦᐃᔭᐍᐏᐣ', 'Cree language', 'Cree'],
      'Inuktut (Latin)': ['Inuktut (Latin)', 'Inuktitut', 'ᐃᓄᒃᑎᑐᑦ', 'Inuktitut'],
      'Inuktut (Syllabics)': ['Inuktut (Syllabics)', 'Inuktitut', 'ᐃᓄᒃᑎᑐᑦ', 'Inuktitut'],
      'Kalaallisut': ['Kalaallisut', 'Kalaallisut', 'Greenlandic language', 'Groenlandais'],
      'Sami (North)': ['Sami (North)', 'Davvisámegiella', 'Northern Sami', 'Sami du Nord'],
      
      // Pacific Languages
      'Hawaiian': ['Hawaiian', 'ʻŌlelo Hawaiʻi', 'Hawaiian language', 'Hawaïen'],
      'Maori': ['Maori', 'Te Reo Māori', 'Māori language', 'Maori'],
      'Samoan': ['Samoan', 'Gagana Samoa', 'Samoan language', 'Samoan'],
      'Tongan': ['Tongan', 'Lea Fakatonga', 'Tongan language', 'Tongien'],
      'Tahitian': ['Tahitian', 'Reo Tahiti', 'Tahitian language', 'Tahitien'],
      'Fijian': ['Fijian', 'Na Vosa Vakaviti', 'Fijian language', 'Fidjien'],
      'Tok Pisin': ['Tok Pisin', 'Tok Pisin', 'Tok Pisin language', 'Tok Pisin'],
      'Bislama': ['Bislama', 'Bislama', 'Bislama language', 'Bichlamar'],
      'Pijin': ['Pijin', 'Pijin', 'Pijin language', 'Pijin'],
      'Chamorro': ['Chamorro', 'Chamoru', 'Chamorro language', 'Chamorro'],
      'Palauan': ['Palauan', 'Tekoi er a Belau', 'Palauan language', 'Palauan'],
      'Marshallese': ['Marshallese', 'Kajin M̧ajeļ', 'Marshallese language', 'Marshallais'],
      'Chuukese': ['Chuukese', 'Chuukese', 'Chuukese language', 'Chuukais'],
      'Kosraean': ['Kosraean', 'Kosraean', 'Kosraean language', 'Kosraéen'],
      'Pohnpeian': ['Pohnpeian', 'Pohnpeian', 'Pohnpeian language', 'Pohnpéen'],
      'Yapese': ['Yapese', 'Yapese', 'Yapese language', 'Yapais'],
      
      // Additional World Languages
      'Esperanto': ['Esperanto', 'Esperanto', 'Esperanto language', 'Espéranto'],
      'Latin': ['Latin', 'Latina', 'Lingua Latina', 'Latin'],
      'NKo': ['NKo', 'ߒߞߏ', 'NKo script', 'NKo'],
      'Tamazight': ['Tamazight', 'ⵜⴰⵎⴰⵣⵉⵖⵜ', 'Tamazight language', 'Tamazight'],
      'Tamazight (Tifinagh)': ['Tamazight (Tifinagh)', 'ⵜⴰⵎⴰⵣⵉⵖⵜ', 'Tamazight language', 'Tamazight'],
      'Santali (Latin)': ['Santali (Latin)', 'ᱥᱟᱱᱛᱟᱞᱤ', 'Santali language', 'Santali'],
      'Santali (Ol Chiki)': ['Santali (Ol Chiki)', 'ᱥᱟᱱᱛᱟᱞᱤ', 'Santali language', 'Santali'],
      'Myanmar (Burmese)': ['Myanmar (Burmese)', 'မြန်မာဘာသာ', 'Burmese language', 'Birman'],
      'Dhivehi': ['Dhivehi', 'ދިވެހި', 'Dhivehi language', 'Divehi'],
      'Dzongkha': ['Dzongkha', 'རྫོང་ཁ་', 'Dzongkha language', 'Dzongkha'],
      'Tajik': ['Tajik', 'Тоҷикӣ', 'Tajik language', 'Tadjik'],
      'Turkmen': ['Turkmen', 'Türkmençe', 'Türkmen dili', 'Turkmène'],
      'Kyrgyz': ['Kyrgyz', 'Кыргызча', 'Кыргыз тили', 'Kirghize'],
      'Uzbek': ['Uzbek', 'Oʻzbekcha', 'Oʻzbek tili', 'Ouzbek'],
      'Kazakh': ['Kazakh', 'Қазақша', 'Қазақ тілі', 'Kazakh'],
      'Uyghur': ['Uyghur', 'ئۇيغۇرچە', 'Uyghur language', 'Ouïghour'],
      'Oromo': ['Oromo', 'Afaan Oromoo', 'Oromo language', 'Oromo'],
      'Wolof': ['Wolof', 'Wolof', 'Wolof language', 'Wolof'],
      'Afar': ['Afar', 'Afaraf', 'Afar language', 'Afar'],
      
      // Additional languages from your list
      'Abkhaz': ['Abkhaz', 'Аҧсуа', 'Abkhaz language', 'Abkhaze'],
      'Acehnese': ['Acehnese', 'Bahsa Acèh', 'Acehnese language', 'Aceh'],
      'Acholi': ['Acholi', 'Acholi', 'Acholi language', 'Acholi'],
      'Avar': ['Avar', 'Магӏарул мацӏ', 'Avar language', 'Avar'],
      'Aymara': ['Aymara', 'Aymar aru', 'Aymara language', 'Aymara'],
      'Balinese': ['Balinese', 'Basa Bali', 'Balinese language', 'Balinais'],
      'Baluchi': ['Baluchi', 'بلوچی', 'Baluchi language', 'Baloutchi'],
      'Bambara': ['Bambara', 'Bamanankan', 'Bambara language', 'Bambara'],
      'Bashkir': ['Bashkir', 'Башҡорт теле', 'Bashkir language', 'Bachkir'],
      'Batak Karo': ['Batak Karo', 'Batak Karo', 'Batak Karo language', 'Batak Karo'],
      'Batak Simalungun': ['Batak Simalungun', 'Batak Simalungun', 'Batak Simalungun language', 'Batak Simalungun'],
      'Batak Toba': ['Batak Toba', 'Batak Toba', 'Batak Toba language', 'Batak Toba'],
      'Bemba': ['Bemba', 'ChiBemba', 'Bemba language', 'Bemba'],
      'Betawi': ['Betawi', 'Bahasa Betawi', 'Betawi language', 'Betawi'],
      'Bikol': ['Bikol', 'Bikol', 'Bikol language', 'Bikol'],
      'Buryat': ['Buryat', 'Буряад хэлэн', 'Buryat language', 'Bouriates'],
    };
    // Language mappings object - all keys are unique
    return mappings[language] || [language];
  };

  const getLanguageCode = (language: string) => {
    const codes: { [key: string]: string } = {
      'Dutch': 'nl',
      'Tagalog (Filipino)': 'tl',
      'English': 'en',
      'French': 'fr',
      'German': 'de',
      'Spanish': 'es',
      'Italian': 'it',
      'Portuguese': 'pt',
      'Russian': 'ru',
      'Chinese': 'zh',
      'Japanese': 'ja',
      'Korean': 'ko',
      'Arabic': 'ar',
      'Hindi': 'hi',
      'Bengali': 'bn',
      'Urdu': 'ur',
      'Indonesian': 'id',
      'Malay': 'ms',
      'Thai': 'th',
      'Vietnamese': 'vi',
      'Turkish': 'tr',
      'Polish': 'pl',
      'Ukrainian': 'uk',
      'Greek': 'el',
      'Hebrew': 'he',
      'Czech': 'cs',
      'Hungarian': 'hu',
      'Romanian': 'ro',
      'Bulgarian': 'bg',
      'Croatian': 'hr',
      'Serbian': 'sr',
      'Slovak': 'sk',
      'Slovenian': 'sl',
      'Estonian': 'et',
      'Latvian': 'lv',
      'Lithuanian': 'lt',
      'Finnish': 'fi',
      'Swedish': 'sv',
      'Norwegian': 'no',
      'Danish': 'da',
      'Icelandic': 'is',
    };
    return codes[language] || 'und';
  };
  
  const lang1Mappings = getLanguageMappings(lang1);
  const lang2Mappings = getLanguageMappings(lang2);
  
  return `ULTRA-FAST REAL-TIME INTERPRETER - INSTANT RESPONSE REQUIRED

STAFF LANGUAGE: ${lang1} (ISO: ${getLanguageCode(lang1)})
GUEST LANGUAGE: ${lang2} (ISO: ${getLanguageCode(lang2)})

⚡ SPEED REQUIREMENTS:
- RESPOND INSTANTLY - NO DELAYS
- PROCESS IN REAL-TIME - NO BUFFERING
- IMMEDIATE TRANSLATION - NO THINKING TIME
- ZERO LATENCY - INSTANT TURNS

🔥 ABSOLUTE RULES - NO EXCEPTIONS:
1. DETECT LANGUAGE INSTANTLY
2. TRANSLATE IMMEDIATELY TO OPPOSITE LANGUAGE
3. NEVER SAME LANGUAGE AS INPUT
4. NO EXPLANATIONS - ONLY TRANSLATION
5. NO CONVERSATION - PURE TRANSLATION
6. INSTANT RESPONSE - NO DELAYS

🌍 LANGUAGE DETECTION - INSTANT RECOGNITION:
${lang1} (Staff): ${lang1Mappings.slice(0, 30).join(', ')}...
- Language Names: "Dutch", "Nederlands", "Hollands"
- ISO Codes: nl, nld, dut

${lang2} (Guest): ${lang2Mappings.slice(0, 30).join(', ')}...
- Language Names: "Tagalog", "Filipino", "Pilipino", "Wikang Tagalog"
- ISO Codes: tl, tgl, fil

🗣️ INSTANT LANGUAGE MAPPING:
- "Français", "Francais", "French" → French (fr, fra) → Translate to ${lang2}
- "Deutsch", "German" → German (de, deu) → Translate to ${lang2}
- "Español", "Spanish" → Spanish (es, spa) → Translate to ${lang2}
- "Italiano", "Italian" → Italian (it, ita) → Translate to ${lang2}
- "Português", "Portuguese" → Portuguese (pt, por) → Translate to ${lang2}
- "Русский", "Russian" → Russian (ru, rus) → Translate to ${lang2}
- "中文", "Chinese" → Chinese (zh, zho) → Translate to ${lang2}
- "日本語", "Japanese" → Japanese (ja, jpn) → Translate to ${lang2}
- "한국어", "Korean" → Korean (ko, kor) → Translate to ${lang2}

⚡ INSTANT RESPONSE EXAMPLES:
- Input: "Bonjour" → [French] [Tagalog] Magandang umaga
- Input: "Français" → [French] [Tagalog] Pranses
- Input: "Kumusta" → [Tagalog] [Dutch] Hoe gaat het
- Input: "Magandang umaga" → [Tagalog] [Dutch] Goedemorgen
- Input: "Goedemorgen" → [Dutch] [Tagalog] Magandang umaga
- Input: "Hello" → [English] [Tagalog] Kamusta
- Input: "You know" → [English] [Tagalog] Alam mo

🚀 PERFORMANCE COMMANDS:
- SPEED: MAXIMUM
- LATENCY: ZERO
- BUFFERING: DISABLED
- RESPONSE: IMMEDIATE
- THINKING: DISABLED

OUTPUT FORMAT - INSTANT:
[Detected Language] [Translation]

⚠️ CRITICAL: ANY DELAY = FAILURE
⚠️ SLOW RESPONSE = FAILURE  
⚠️ BUFFERING = FAILURE
⚠️ THINKING = FAILURE

TRANSLATE INSTANTLY OR FAIL!

${topicInstruction}`;
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
