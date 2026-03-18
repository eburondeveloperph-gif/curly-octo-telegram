import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import cn from 'classnames';
import './EntryPage.css';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { AudioRecorder } from '../../../lib/audio-recorder';
import { AVAILABLE_LANGUAGES } from '../../../lib/constants';
import { useLogStore, useSettings, useUI } from '../../../lib/state';

type VisualBar = {
  delay: number;
  duration: number;
  height: number;
  opacity: number;
};

type Particle = {
  delay: number;
  duration: number;
  left: number;
  size: number;
  top: number;
};

const ROULETTE_LANGUAGES = AVAILABLE_LANGUAGES.filter(
  language => language.value !== 'auto',
);
const INTRO_AUDIO_URL = 'https://dual.eburon.ai/intro/play.mp3';

const createWaveBars = (count: number): VisualBar[] =>
  Array.from({ length: count }, (_, index) => {
    const distanceFromCenter =
      Math.abs(count / 2 - index) / Math.max(count / 2, 1);
    const intensity = 1 - distanceFromCenter;

    return {
      height: Math.max(3, intensity * 40 + Math.random() * 8),
      opacity: Math.max(0.12, intensity * 0.8),
      duration: 1 + Math.random(),
      delay: Math.random() * 2,
    };
  });

const createParticles = (count: number): Particle[] =>
  Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: 2 + Math.random() * 3,
    delay: Math.random() * 3,
  }));

const getAudioContext = (): AudioContext | null => {
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  return AudioContextCtor ? new AudioContextCtor() : null;
};

function VolumeIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16.5 12c0-.68-.12-1.34-.35-1.94l1.53-1.53A8.7 8.7 0 0 1 18.5 12c0 1.86-.58 3.6-1.57 5.03l-1.5-1.5c.68-1 1.07-2.2 1.07-3.53zm2.5 0c0-1.96-.7-3.75-1.86-5.14l1.43-1.43A9.9 9.9 0 0 1 21 12c0 2.73-1.1 5.22-2.88 7.02l-1.42-1.42A7.94 7.94 0 0 0 19 12zM3 9v6h4l5 5V4L7 9H3zm.27-5L21 21l-1.27 1.27L2 4.54 3.27 4z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.9 3.9L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.94 8.94 0 0 0 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17A15.2 15.2 0 0 1 9 11.35 16.05 16.05 0 0 1 6.69 8h-2a18.7 18.7 0 0 0 2.98 4.56L2.58 17.6 4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96a8.6 8.6 0 0 0-1.62-.94l-.36-2.54a.49.49 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.73 8.87c-.11.21-.07.47.12.61l2.03 1.58c-.04.3-.06.63-.06.94s.02.64.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6S10.02 8.4 12 8.4s3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}

export default function EntryPage() {
  const {
    language1,
    language2,
    setLanguage1,
    setLanguage2,
  } = useSettings();
  const { toggleSidebar } = useUI();
  const turns = useLogStore(state => state.turns);
  const {
    client,
    connected,
    connect,
    disconnect,
    isTtsMuted,
    toggleTtsMute,
  } = useLiveAPIContext();

  const [audioRecorder] = useState(() => new AudioRecorder());
  const [isSelecting, setIsSelecting] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const waveBars = useMemo(() => createWaveBars(80), []);
  const particles = useMemo(() => createParticles(40), []);

  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const synthAudioRef = useRef<AudioContext | null>(null);
  const rouletteListRef = useRef<HTMLUListElement>(null);
  const rouletteItemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const hasScrolledWhileSelectingRef = useRef(false);
  const lastTickedLanguageRef = useRef(language2);

  const isActive = isSelecting || connected;
  const visibleTurns = turns.slice(-4);
  const normalizedMicVolume = Math.max(0, Math.min(micVolume || 0, 1));

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
    };
    const onVolume = (volume: number) => {
      setMicVolume(volume);
    };

    if (!connected) {
      setMicVolume(0);
      audioRecorder.stop();
      return;
    }

    audioRecorder.on('data', onData);
    audioRecorder.on('volume', onVolume);
    void audioRecorder.start().catch(error => {
      console.error('Unable to start microphone capture:', error);
    });

    return () => {
      audioRecorder.off('data', onData);
      audioRecorder.off('volume', onVolume);
      audioRecorder.stop();
    };
  }, [audioRecorder, client, connected]);

  useEffect(() => {
    if (connected) {
      setIsSelecting(false);
    }
  }, [connected]);

  useEffect(() => {
    lastTickedLanguageRef.current = language2;
  }, [language2]);

  const ensureSynthAudio = () => {
    if (!synthAudioRef.current) {
      synthAudioRef.current = getAudioContext();
    }

    if (
      synthAudioRef.current &&
      synthAudioRef.current.state === 'suspended'
    ) {
      void synthAudioRef.current.resume();
    }

    return synthAudioRef.current;
  };

  const playTick = () => {
    const audioContext = ensureSynthAudio();
    if (!audioContext || audioContext.state !== 'running') {
      return;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      100,
      audioContext.currentTime + 0.03,
    );

    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.03,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.03);
  };

  const playChime = () => {
    const audioContext = ensureSynthAudio();
    if (!audioContext || audioContext.state !== 'running') {
      return;
    }

    const now = audioContext.currentTime;

    const firstOscillator = audioContext.createOscillator();
    const firstGain = audioContext.createGain();
    firstOscillator.connect(firstGain);
    firstGain.connect(audioContext.destination);
    firstOscillator.type = 'sine';
    firstOscillator.frequency.setValueAtTime(659.25, now);
    firstGain.gain.setValueAtTime(0, now);
    firstGain.gain.linearRampToValueAtTime(0.1, now + 0.02);
    firstGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    firstOscillator.start(now);
    firstOscillator.stop(now + 0.15);

    const secondOscillator = audioContext.createOscillator();
    const secondGain = audioContext.createGain();
    secondOscillator.connect(secondGain);
    secondGain.connect(audioContext.destination);
    secondOscillator.type = 'sine';
    secondOscillator.frequency.setValueAtTime(830.61, now + 0.1);
    secondGain.gain.setValueAtTime(0, now + 0.1);
    secondGain.gain.linearRampToValueAtTime(0.1, now + 0.12);
    secondGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    secondOscillator.start(now + 0.1);
    secondOscillator.stop(now + 0.5);
  };

  const scrollLanguageIntoView = (
    value: string,
    behavior: ScrollBehavior = 'smooth',
  ) => {
    rouletteItemRefs.current[value]?.scrollIntoView({
      behavior,
      block: 'center',
    });
  };

  useEffect(() => {
    if (!isSelecting || connected) {
      hasScrolledWhileSelectingRef.current = false;
      return;
    }

    const syncSelection = window.setTimeout(() => {
      scrollLanguageIntoView(language2, 'auto');
      hasScrolledWhileSelectingRef.current = true;
    }, 120);

    return () => window.clearTimeout(syncSelection);
  }, [connected, isSelecting, language2]);

  const updateRouletteSelection = () => {
    const list = rouletteListRef.current;
    if (!list || !isSelecting || connected) {
      return;
    }

    const containerRect = list.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestLanguage = language2;
    let minimumDistance = Number.POSITIVE_INFINITY;

    for (const language of ROULETTE_LANGUAGES) {
      const item = rouletteItemRefs.current[language.value];
      if (!item) continue;

      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.top + itemRect.height / 2;
      const distance = Math.abs(containerCenter - itemCenter);

      if (distance < minimumDistance) {
        minimumDistance = distance;
        closestLanguage = language.value;
      }
    }

    if (closestLanguage !== language2) {
      if (
        hasScrolledWhileSelectingRef.current &&
        lastTickedLanguageRef.current !== closestLanguage
      ) {
        playTick();
      }
      setLanguage2(closestLanguage);
    }
  };

  const handleOrbClick = () => {
    if (connected) {
      disconnect();
      setIsSelecting(true);
      return;
    }

    const nextSelectingState = !isSelecting;
    setIsSelecting(nextSelectingState);

    if (nextSelectingState) {
      ensureSynthAudio();

      if (!introAudioRef.current) {
        introAudioRef.current = new Audio(INTRO_AUDIO_URL);
      }

      introAudioRef.current.currentTime = 0;
      void introAudioRef.current.play().catch(error => {
        console.error('Intro audio playback failed:', error);
      });
    }
  };

  const handleConfirmSelection = (value: string) => {
    setLanguage2(value);
    playChime();
    setIsSelecting(false);
    void connect();
  };

  const handleGuestLanguageChange = (value: string) => {
    setLanguage2(value);
    if (isSelecting && !connected) {
      scrollLanguageIntoView(value);
    }
  };

  const handlePrimaryAction = () => {
    if (connected) {
      disconnect();
      return;
    }

    void connect();
  };

  const handleSwapLanguages = () => {
    const currentStaffLanguage = language1;
    setLanguage1(language2);
    setLanguage2(currentStaffLanguage);
  };

  return (
    <div className={cn('entry-page', { active: isActive, listening: connected })}>
      <header className="top-bar">
        <div className="user-panel staff-panel">
          <div className="user-info">
            <div className="avatar-box" aria-hidden="true" />
            <span className="user-name">The Staff</span>
          </div>
          <div className="lang-select-wrapper">
            <select
              className="lang-select"
              aria-label="Staff language"
              value={language1}
              onChange={event => setLanguage1(event.target.value)}
            >
              {ROULETTE_LANGUAGES.map(language => (
                <option key={language.value} value={language.value}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="user-panel guest-panel">
          <div className="user-info">
            <div className="avatar-box" aria-hidden="true" />
            <span className="user-name">Guest</span>
          </div>
          <div className="lang-select-wrapper">
            <select
              className="lang-select"
              aria-label="Guest language"
              value={language2}
              onChange={event => handleGuestLanguageChange(event.target.value)}
            >
              {ROULETTE_LANGUAGES.map(language => (
                <option key={language.value} value={language.value}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="orb-wrapper" id="orbWrapper">
        <button
          type="button"
          className="orb-container"
          id="mainOrb"
          onClick={handleOrbClick}
          aria-label={connected ? 'Change language target' : 'Open language selector'}
        >
          <div className="orb-grid" />
          <div className="orb-stars" />
          <div className="orb-reflection" />
          <span className="orb-text">{connected ? 'Live' : 'Start'}</span>
        </button>
        <div className="orb-base-glow" />
      </div>

      <main className="center-stage">
        <div className="waveform-container" id="waveform" aria-hidden="true">
          {waveBars.map((bar, index) => {
            const scale = connected ? 0.95 + normalizedMicVolume * 1.8 : 1;
            const height = Math.max(4, bar.height * scale);
            const style = {
              animationDelay: `${bar.delay}s`,
              animationDuration: `${bar.duration}s`,
              height: `${height}px`,
              opacity: bar.opacity,
            } satisfies CSSProperties;

            return <div key={index} className="wave-bar" style={style} />;
          })}
        </div>

        <div className="particles" id="particles" aria-hidden="true">
          {particles.map((particle, index) => {
            const style = {
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              height: `${particle.size}px`,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
            } satisfies CSSProperties;

            return <div key={index} className="particle" style={style} />;
          })}
        </div>

        <div className="roulette-container">
          <div className="roulette-highlight" />
          <ul
            ref={rouletteListRef}
            className="roulette-list"
            id="langRoulette"
            onScroll={() => window.requestAnimationFrame(updateRouletteSelection)}
          >
            {ROULETTE_LANGUAGES.map(language => {
              const isSelected = language.value === language2;

              return (
                <li
                  key={language.value}
                  ref={node => {
                    rouletteItemRefs.current[language.value] = node;
                  }}
                  className={cn('roulette-item', { selected: isSelected })}
                  onClick={() => {
                    setLanguage2(language.value);
                    scrollLanguageIntoView(language.value);
                  }}
                >
                  <span className="select-label">Select</span>
                  <span className="lang-name">{language.name}</span>
                  <button
                    type="button"
                    className="check-btn"
                    aria-label={`Confirm ${language.name}`}
                    onClick={event => {
                      event.stopPropagation();
                      handleConfirmSelection(language.value);
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <section
          className={cn('live-thread', { visible: visibleTurns.length > 0 })}
          aria-live="polite"
        >
          {visibleTurns.map(turn => (
            <article
              key={turn.timestamp.toISOString()}
              className={cn('thread-item', turn.role)}
            >
              <span className="thread-label">
                {turn.role === 'user' ? 'Input' : 'Translation'}
              </span>
              <p className="thread-text">{turn.text}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="bottom-bar">
        <div className="controls-pill">
          <button
            type="button"
            className="icon-btn"
            aria-label={isTtsMuted ? 'Unmute audio output' : 'Mute audio output'}
            onClick={toggleTtsMute}
          >
            <VolumeIcon muted={isTtsMuted} />
          </button>

          <button
            type="button"
            className="icon-btn"
            aria-label="Open history"
            onClick={toggleSidebar}
          >
            <HistoryIcon />
          </button>

          <button
            type="button"
            className="center-mic-btn"
            aria-label={connected ? 'Stop streaming' : 'Start streaming'}
            onClick={handlePrimaryAction}
          >
            <MicIcon />
          </button>

          <button
            type="button"
            className="icon-btn"
            aria-label="Swap languages"
            onClick={handleSwapLanguages}
          >
            <SwapIcon />
          </button>

          <button
            type="button"
            className="icon-btn"
            aria-label="Open settings"
            onClick={toggleSidebar}
          >
            <SettingsIcon />
          </button>
        </div>
      </footer>
    </div>
  );
}
