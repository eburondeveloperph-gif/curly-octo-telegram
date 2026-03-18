import { LiveConnectConfig, Modality } from '@google/genai';

export function buildLiveConfig(
  systemPrompt: string,
  voice: string,
): LiveConnectConfig {
  const config: any = {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: voice,
        },
      },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    systemInstruction: {
      parts: [
        {
          text: systemPrompt,
        },
      ],
    },
  };

  return config;
}
