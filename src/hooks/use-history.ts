'use client';

import { useState, useEffect } from 'react';

export interface HistoryItem {
    id: string;
    fen: string;
    timestamp: number;
    preview?: string; // base64 or url if we persist images (optional, expensive)
}

export function useHistory() {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('chess-ai-history');
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse history', e);
            }
        }
    }, []);

    const saveToHistory = (fen: string) => {
        const newItem: HistoryItem = {
            id: crypto.randomUUID(),
            fen,
            timestamp: Date.now(),
        };

        // Avoid duplicates at top
        if (history.length > 0 && history[0].fen === fen) return;

        const newHistory = [newItem, ...history].slice(0, 50); // Keep last 50
        setHistory(newHistory);
        localStorage.setItem('chess-ai-history', JSON.stringify(newHistory));
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('chess-ai-history');
    };

    return { history, saveToHistory, clearHistory };
}
