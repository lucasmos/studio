
'use client';

import type { TradeRecord, UserInfo } from '@/types';

const MAX_HISTORY_LENGTH = 100; // Limit the number of trades stored

export function addTradeToHistory(tradeRecord: TradeRecord, userInfo: UserInfo | null): void {
  if (typeof window === 'undefined') return;

  const historyKey = `derivAiTradeHistory_${userInfo ? userInfo.id : 'guest'}`;
  try {
    const storedHistory = localStorage.getItem(historyKey);
    let history: TradeRecord[] = [];
    if (storedHistory) {
      history = JSON.parse(storedHistory);
    }
    history.push(tradeRecord);
    
    // Keep history sorted and trimmed
    history.sort((a, b) => b.timestamp - a.timestamp); // Newest first
    if (history.length > MAX_HISTORY_LENGTH) {
      history = history.slice(0, MAX_HISTORY_LENGTH);
    }

    localStorage.setItem(historyKey, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save trade to history:", error);
  }
}

export function getTradeHistory(userInfo: UserInfo | null): TradeRecord[] {
  if (typeof window === 'undefined') return [];

  const historyKey = `derivAiTradeHistory_${userInfo ? userInfo.id : 'guest'}`;
  try {
    const storedHistory = localStorage.getItem(historyKey);
    if (storedHistory) {
      const parsedHistory: TradeRecord[] = JSON.parse(storedHistory);
      return parsedHistory.sort((a, b) => b.timestamp - a.timestamp); // Ensure sorted newest first
    }
  } catch (error) {
    console.error("Failed to load trade history:", error);
  }
  return [];
}
