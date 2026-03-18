
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect } from 'react';
import { LiveServerContent } from '@google/genai';
import WelcomeScreen from '../welcome-screen/WelcomeScreen';

import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import {
  ConversationTurn,
  useLogStore,
  useSettings,
} from '../../../lib/state';
import { useHistoryStore } from '../../../lib/history';
import { useAuth, updateUserConversations } from '../../../lib/auth';
import { buildLiveConfig } from '../../../lib/live-config';

export default function StreamingConsole() {
  const { client, setConfig } = useLiveAPIContext();
  const { systemPrompt, voice, language1, language2 } = useSettings();
  const { addHistoryItem } = useHistoryStore();
  const { user } = useAuth();

  const sanitizeTurnText = (text: string) =>
    text
      .replace(/<thinking[\s\S]*?<\/thinking>/gi, ' ')
      .replace(/<audio[\s\S]*?<\/audio>/gi, ' ')
      .replace(/<\/?(thinking|audio)[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\[\/?(thinking|audio)[^\]]*\]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const mergeTranscriptText = (previous: string, incoming: string) => {
    const nextText = sanitizeTurnText(incoming);
    const currentText = sanitizeTurnText(previous);

    if (!nextText) {
      return currentText;
    }

    if (!currentText) {
      return nextText;
    }

    if (nextText.startsWith(currentText)) {
      return nextText;
    }

    if (currentText.startsWith(nextText)) {
      return currentText;
    }

    const maxOverlap = Math.min(currentText.length, nextText.length);
    for (let overlap = maxOverlap; overlap > 0; overlap--) {
      if (currentText.endsWith(nextText.slice(0, overlap))) {
        return `${currentText}${nextText.slice(overlap)}`.trim();
      }
    }

    return `${currentText} ${nextText}`.trim();
  };

  // Set the configuration for the Live API
  useEffect(() => {
    setConfig(buildLiveConfig(systemPrompt, voice));
  }, [setConfig, systemPrompt, voice]);

  useEffect(() => {
    const { addTurn, updateLastTurn } = useLogStore.getState();

    const handleInputTranscription = (text: string, isFinal: boolean) => {
      const sanitizedText = sanitizeTurnText(text);
      if (!sanitizedText) return;

      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      if (last && last.role === 'user' && !last.isFinal) {
        updateLastTurn({
          text: mergeTranscriptText(last.text, sanitizedText),
          isFinal,
        });
      } else {
        addTurn({ role: 'user', text: sanitizedText, isFinal });
      }
    };

    const handleOutputTranscription = (text: string, isFinal: boolean) => {
      const sanitizedText = sanitizeTurnText(text);
      if (!sanitizedText) return;

      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      if (last && last.role === 'agent' && !last.isFinal) {
        updateLastTurn({
          text: mergeTranscriptText(last.text, sanitizedText),
          isFinal,
        });
      } else {
        addTurn({ role: 'agent', text: sanitizedText, isFinal });
      }
    };

    const handleTurnComplete = () => {
      const { turns, updateLastTurn } = useLogStore.getState();
      // FIX: Replaced .at(-1) with standard index access to resolve potential compatibility issues.
      const last = turns[turns.length - 1];

      if (last && !last.isFinal) {
        updateLastTurn({ isFinal: true });
        const updatedTurns = useLogStore.getState().turns;

        if (user) {
          updateUserConversations(user.id, updatedTurns);
        }

        // FIX: Replaced .at(-1) with standard index access to resolve potential compatibility issues.
        const finalAgentTurn = updatedTurns[updatedTurns.length - 1];

        if (finalAgentTurn?.role === 'agent' && finalAgentTurn?.text) {
          const agentTurnIndex = updatedTurns.length - 1;
          let correspondingUserTurn = null;
          for (let i = agentTurnIndex - 1; i >= 0; i--) {
            if (updatedTurns[i].role === 'user') {
              correspondingUserTurn = updatedTurns[i];
              break;
            }
          }

          if (correspondingUserTurn?.text) {
            const translatedText = finalAgentTurn.text.trim();
            addHistoryItem({
              sourceText: correspondingUserTurn.text.trim(),
              translatedText: translatedText,
              lang1: language1,
              lang2: language2
            });
          }
        }
      }
    };

    client.on('inputTranscription', handleInputTranscription);
    client.on('outputTranscription', handleOutputTranscription);
    client.on('turncomplete', handleTurnComplete);

    return () => {
      client.off('inputTranscription', handleInputTranscription);
      client.off('outputTranscription', handleOutputTranscription);
      client.off('turncomplete', handleTurnComplete);
    };
  }, [client, addHistoryItem, user, language1, language2]);

  return (
    <div className="transcription-container">
      <WelcomeScreen />
    </div>
  );
}
