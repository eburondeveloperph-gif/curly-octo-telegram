/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cn from 'classnames';
import React, { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import {
  generateSystemPrompt,
  useAudioActivity,
  useGuestLanguageSetup,
  useLogStore,
  useSettings,
} from '../../../lib/state';
import { useAuth, clearUserConversations } from '../../../lib/auth';

import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import MicVisualizer from '../../MicVisualizer';
import { AVAILABLE_LANGUAGES } from '../../../lib/constants';
import { buildLiveConfig } from '../../../lib/live-config';

const introAudioUrl = new URL('../../../intro.mp3', import.meta.url).href;
const SETUP_VAD_THRESHOLD = 0.045;
const SETUP_SILENCE_MS = 850;

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
  length: number;
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
  message?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type LanguageMatcher = {
  aliases: string[];
  name: string;
  value: string;
};

const normalizeSpokenText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const LANGUAGE_ALIAS_OVERRIDES: Record<string, string[]> = {
  Arabic: ['arabic', 'al arabiya', 'arabiyya'],
  Chinese: ['chinese', 'mandarin'],
  'Chinese (Simplified)': ['chinese simplified', 'simplified chinese', 'mandarin'],
  'Chinese (Traditional)': ['chinese traditional', 'traditional chinese', 'mandarin'],
  Dutch: ['dutch', 'nederlands'],
  'Dutch (Flemish)': ['dutch flemish', 'flemish', 'vlaams'],
  'English (UK)': ['english uk', 'uk english', 'british english', 'english'],
  'English (US)': ['english us', 'us english', 'american english', 'english'],
  French: ['french', 'francais', 'francais language'],
  German: ['german', 'deutsch'],
  Greek: ['greek', 'ellinika'],
  Hindi: ['hindi'],
  Italian: ['italian', 'italiano'],
  Japanese: ['japanese', 'nihongo'],
  Korean: ['korean', 'hanguk eo', 'hangugo'],
  'Portuguese (Brazil)': ['brazilian portuguese', 'portuguese brazil', 'portugues brasil'],
  'Portuguese (Portugal)': ['portuguese portugal', 'european portuguese', 'portugues'],
  Russian: ['russian', 'russkiy'],
  Spanish: ['spanish', 'espanol', 'castellano'],
  'Tagalog (Filipino)': ['tagalog', 'filipino', 'pilipino'],
  Turkish: ['turkish', 'turkce'],
  Vietnamese: ['vietnamese', 'tieng viet'],
};

const LANGUAGE_MATCHERS: LanguageMatcher[] = AVAILABLE_LANGUAGES
  .filter(language => language.value !== 'auto')
  .map(language => {
    const baseAliases = new Set<string>([
      normalizeSpokenText(language.name),
      normalizeSpokenText(language.value),
      normalizeSpokenText(language.name.replace(/[()]/g, ' ')),
      normalizeSpokenText(language.value.replace(/[()]/g, ' ')),
    ]);

    for (const alias of LANGUAGE_ALIAS_OVERRIDES[language.value] || []) {
      baseAliases.add(normalizeSpokenText(alias));
    }

    return {
      aliases: Array.from(baseAliases).filter(Boolean).sort(
        (left, right) => right.length - left.length,
      ),
      name: language.name,
      value: language.value,
    };
  });

const detectGuestLanguage = (transcript: string): LanguageMatcher | null => {
  const normalizedTranscript = normalizeSpokenText(transcript);
  if (!normalizedTranscript) return null;

  for (const matcher of LANGUAGE_MATCHERS) {
    for (const alias of matcher.aliases) {
      if (
        normalizedTranscript === alias ||
        normalizedTranscript.includes(` ${alias} `) ||
        normalizedTranscript.startsWith(`${alias} `) ||
        normalizedTranscript.endsWith(` ${alias}`) ||
        normalizedTranscript.includes(alias)
      ) {
        return matcher;
      }
    }
  }

  return null;
};

export type ControlTrayProps = {
  children?: ReactNode;
};

function ControlTray({ children }: ControlTrayProps) {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const pendingDetectedLanguageRef = useRef<LanguageMatcher | null>(null);
  const setupHeardSpeechRef = useRef(false);
  const setupSilenceTimerRef = useRef<number | null>(null);
  const latestRecognitionTextRef = useRef('');
  const { session, user } = useAuth();
  const { language1, topic, voice, setLanguage2 } = useSettings();
  const { message, phase, setConfiguredLanguage, setStatus, clearStatus } =
    useGuestLanguageSetup();

  const {
    client,
    connected,
    connect,
    disconnect,
    isTtsMuted,
    setConfig,
    toggleTtsMute,
  } = useLiveAPIContext();

  const isSetupActive = phase === 'playing_intro' || phase === 'listening';
  const shouldCaptureAudio = (connected && !muted) || phase === 'listening';

  const cleanupSetupFlow = (clearMessage: boolean = false) => {
    shouldKeepListeningRef.current = false;
    pendingDetectedLanguageRef.current = null;
    setupHeardSpeechRef.current = false;
    latestRecognitionTextRef.current = '';

    if (setupSilenceTimerRef.current !== null) {
      window.clearTimeout(setupSilenceTimerRef.current);
      setupSilenceTimerRef.current = null;
    }

    if (introAudioRef.current) {
      introAudioRef.current.onended = null;
      introAudioRef.current.pause();
      introAudioRef.current.currentTime = 0;
    }

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.onend = null;
      speechRecognitionRef.current.onerror = null;
      speechRecognitionRef.current.onresult = null;
      speechRecognitionRef.current.onstart = null;
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }

    if (clearMessage) {
      clearStatus();
    }
  };

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    if (!connected) {
      setMuted(false);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      cleanupSetupFlow();
    };
  }, []);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
    };
    const onVolume = (vol: number) => {
      setMicVolume(vol);
      useAudioActivity.getState().setInputActivity(vol, vol > 0.015);

      if (phase !== 'listening') {
        return;
      }

      if (vol > SETUP_VAD_THRESHOLD) {
        setupHeardSpeechRef.current = true;
        if (setupSilenceTimerRef.current !== null) {
          window.clearTimeout(setupSilenceTimerRef.current);
          setupSilenceTimerRef.current = null;
        }
        return;
      }

      if (!setupHeardSpeechRef.current || setupSilenceTimerRef.current !== null) {
        return;
      }

      setupSilenceTimerRef.current = window.setTimeout(() => {
        setupSilenceTimerRef.current = null;

        if (pendingDetectedLanguageRef.current) {
          finalizeGuestLanguage(pendingDetectedLanguageRef.current);
          return;
        }

        if (latestRecognitionTextRef.current.trim()) {
          setStatus(
            'listening',
            'I heard the guest, but could not identify the language. Please say the preferred language again.',
          );
          latestRecognitionTextRef.current = '';
          setupHeardSpeechRef.current = false;
        }
      }, SETUP_SILENCE_MS);
    };

    if (connected && !muted && audioRecorder) {
      audioRecorder.on('data', onData);
    }

    if (shouldCaptureAudio && audioRecorder) {
      audioRecorder.on('volume', onVolume);
      void audioRecorder.start();
    } else {
      setMicVolume(0);
      useAudioActivity.getState().setInputActivity(0, false);
      audioRecorder.stop();
    }

    return () => {
      audioRecorder.off('data', onData);
      audioRecorder.off('volume', onVolume);
    };
  }, [audioRecorder, client, connected, muted, phase, shouldCaptureAudio]);

  const finalizeGuestLanguage = (language: LanguageMatcher) => {
    cleanupSetupFlow();
    setLanguage2(language.value);
    setConfiguredLanguage(language.name);
    setConfig(
      buildLiveConfig(
        generateSystemPrompt(language1, language.value, topic),
        voice,
      ),
    );

    window.setTimeout(() => {
      void connect();
    }, 150);
  };

  const startGuestLanguageRecognition = () => {
    const recognitionWindow = window as Window &
      typeof globalThis & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };

    const RecognitionCtor =
      recognitionWindow.SpeechRecognition ||
      recognitionWindow.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setStatus(
        'error',
        'Voice language setup is not supported in this browser. Select the guest language manually.',
      );
      return;
    }

    const recognition = new RecognitionCtor();
    speechRecognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setupHeardSpeechRef.current = false;
      latestRecognitionTextRef.current = '';
      pendingDetectedLanguageRef.current = null;
      setStatus(
        'listening',
        'Listening for the guest preferred language. Please say it now.',
      );
    };

    recognition.onresult = event => {
      let combinedTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index++) {
        combinedTranscript += `${event.results[index][0].transcript} `;
      }

      latestRecognitionTextRef.current = combinedTranscript.trim();
      const detectedLanguage = detectGuestLanguage(combinedTranscript);
      if (detectedLanguage) {
        pendingDetectedLanguageRef.current = detectedLanguage;
        setStatus(
          'listening',
          `Detected ${detectedLanguage.name}. Waiting for the guest to finish speaking...`,
        );
      }
    };

    recognition.onerror = event => {
      shouldKeepListeningRef.current = false;
      setStatus(
        'error',
        `Unable to detect the guest language from voice input (${event.error}).`,
      );
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setStatus(
            'error',
            'The microphone listener stopped unexpectedly. Try tapping Start again.',
          );
        }
      }
    };

    try {
      recognition.start();
    } catch {
      setStatus(
        'error',
        'The microphone listener could not start. Try tapping Start again.',
      );
    }
  };

  const startGuestLanguageSetup = () => {
    cleanupSetupFlow();
    setStatus(
      'playing_intro',
      'Playing the guest setup prompt.',
    );

    if (!introAudioRef.current) {
      introAudioRef.current = new Audio(introAudioUrl);
    }

    introAudioRef.current.onended = () => {
      startGuestLanguageRecognition();
    };
    introAudioRef.current.currentTime = 0;
    void introAudioRef.current.play().catch(() => {
      setStatus(
        'error',
        'The setup prompt audio could not play. Tap Start again to retry.',
      );
    });
  };

  const handleMicClick = () => {
    if (!session) return;
    if (isSetupActive) {
      cleanupSetupFlow(true);
      return;
    }
    if (connected) {
      setMuted(!muted);
    } else {
      startGuestLanguageSetup();
    }
  };

  const connectButtonAction = () => {
    if (!session) return;
    if (isSetupActive) {
      cleanupSetupFlow(true);
      return;
    }
    if (connected) {
      disconnect();
    } else {
      startGuestLanguageSetup();
    }
  };

  const handleReset = () => {
    cleanupSetupFlow(true);
    useLogStore.getState().clearTurns();
    if (user) {
      void clearUserConversations(user.id);
    }
  };

  const micButtonTitle = session
    ? connected
      ? muted
        ? 'Unmute microphone'
        : 'Mute microphone'
      : isSetupActive
        ? 'Listening for guest language'
        : 'Start setup and microphone'
    : 'Please sign in to use the translator';

  const connectButtonTitle = session
    ? isSetupActive
      ? 'Cancel guest language setup'
      : connected
      ? 'Stop streaming'
      : 'Start streaming'
    : 'Please sign in to use the translator';

  const isMicActive = connected && !muted;

  return (
    <section className="control-tray">
      <MicVisualizer volume={micVolume} isActive={isMicActive} />
      <div className="control-tray-buttons">
        <nav className={cn('actions-nav')}>
          <button
            className={cn('action-button mic-button', { active: isMicActive })}
            onClick={handleMicClick}
            title={micButtonTitle}
            disabled={!session}
            style={{ '--mic-volume': micVolume } as React.CSSProperties}
          >
            {!muted ? (
              <span className="material-symbols-outlined filled">mic</span>
            ) : (
              <span className="material-symbols-outlined filled">mic_off</span>
            )}
          </button>
          <button
            className={cn('action-button')}
            onClick={toggleTtsMute}
            aria-label={isTtsMuted ? 'Unmute audio output' : 'Mute audio output'}
            title={isTtsMuted ? 'Unmute audio output' : 'Mute audio output'}
          >
            <span className="icon">{isTtsMuted ? 'volume_off' : 'volume_up'}</span>
          </button>
          <button
            className={cn('action-button')}
            onClick={handleReset}
            aria-label="Reset Chat"
            title="Reset session logs"
          >
            <span className="icon">refresh</span>
          </button>
          {children}
        </nav>

        <div className={cn('connection-container', { connected })}>
          <div className="connection-button-container">
            <button
              ref={connectButtonRef}
              className={cn('action-button connect-toggle', { connected })}
              onClick={connectButtonAction}
              title={connectButtonTitle}
              disabled={!session}
            >
              <span className="material-symbols-outlined filled">
                {isSetupActive ? 'hearing' : connected ? 'pause' : 'play_arrow'}
              </span>
            </button>
          </div>
          <span className="text-indicator">
            {isSetupActive
              ? 'Listening'
              : connected
                ? 'Streaming'
                : message
                  ? 'Ready'
                  : 'Standby'}
          </span>
        </div>
      </div>
    </section>
  );
}

export default memo(ControlTray);
