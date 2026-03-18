/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type PersistedHistoryItem = Omit<HistoryItem, 'timestamp'> & {
  timestamp: Date | string;
};

let idCounter = Date.now();
const generateUniqueId = (): number => ++idCounter;

const normalizeHistory = (
  history: PersistedHistoryItem[],
): HistoryItem[] => {
  const usedIds = new Set<number>();

  return history.map(item => {
    const nextId =
      typeof item.id === 'number' && !usedIds.has(item.id)
        ? item.id
        : generateUniqueId();
    const parsedTimestamp = new Date(item.timestamp);

    usedIds.add(nextId);

    return {
      ...item,
      id: nextId,
      timestamp: Number.isNaN(parsedTimestamp.getTime())
        ? new Date()
        : parsedTimestamp,
    };
  });
};

export interface HistoryItem {
  id: number;
  sourceText: string;
  translatedText: string;
  lang1: string;
  lang2: string;
  timestamp: Date;
}

interface HistoryState {
  history: HistoryItem[];
  addHistoryItem: (item: {
    sourceText: string,
    translatedText: string,
    lang1: string,
    lang2: string,
  }) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      addHistoryItem: item => {
        const newItem = { ...item, id: generateUniqueId(), timestamp: new Date() };
        set(state => ({
          history: [newItem, ...state.history],
        }));
      },
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'translation-history-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.history) {
          state.history = normalizeHistory(
            state.history as PersistedHistoryItem[],
          );
        }
      },
    }
  )
);
