/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';
import './WelcomeScreen.css';
import {
  useGuestLanguageSetup,
  useLogStore,
} from '../../../lib/state';

const WelcomeScreen: React.FC = () => {
  const turns = useLogStore(state => state.turns);
  const { guestLanguage, message, phase } = useGuestLanguageSetup();
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadRef.current) {
      return;
    }

    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [turns]);

  if (turns.length === 0) {
    return (
      <div className="welcome-screen">
        <div className="welcome-content empty">
          <h1>Translator</h1>
          {message ? (
            <div className={`guest-language-banner ${phase}`}>
              {message}
            </div>
          ) : null}
          <div className="status-indicator">
            <span className="dot"></span> Ready to translate
          </div>
          <p className="welcome-hint">
            {phase === 'playing_intro'
              ? 'Playing setup...'
              : phase === 'listening'
                ? 'Listening for language...'
                : guestLanguage
                  ? 'Ready to translate.'
                  : 'Start speaking to begin...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={threadRef} className="welcome-screen chat-layout">
      {message ? (
        <div className={`guest-language-banner inline ${phase}`}>
          {message}
        </div>
      ) : null}

      <div className="chat-thread">
        {turns.map((turn, index) => (
          <div
            key={`${turn.role}-${index}-${turn.timestamp?.getTime() ?? index}`}
            className={`turn-block ${turn.role} ${turn.isFinal ? 'final' : 'interim'}`}
          >
            <div className="turn-inner">
              <span className="turn-label">
                {turn.role === 'user' ? 'Guest' : 'Staff'}
              </span>
              <div className="turn-text-wrapper">
                <p className="turn-text">
                  {turn.text}
                  {!turn.isFinal && index === turns.length - 1 ? (
                    <span className="cursor" />
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeScreen;
