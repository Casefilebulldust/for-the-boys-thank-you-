
import React, { useState, useEffect, useCallback } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { getProactiveInsight } from '../services/geminiService.ts';

export default function HeadsUpDisplay() {
    const spudHubData = useSpudHub();
    const { geminiApiKey, executeInsightAction } = spudHubData;
    const [insight, setInsight] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchInsight = useCallback(async () => {
        if (!geminiApiKey) return;
        setIsLoading(true);
        try {
            const { promptSettings, ...snapshot } = spudHubData;
            const result = await getProactiveInsight(geminiApiKey, snapshot, promptSettings.getProactiveInsight);
            setInsight(result);
        } catch (e) {
            console.error(`Insight Error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [geminiApiKey, spudHubData]);

    useEffect(() => { 
        const timer = setTimeout(fetchInsight, 2000); 
        return () => clearTimeout(timer); 
    }, [fetchInsight]);

    const handleAction = () => {
        if (!insight) return;
        executeInsightAction(insight.action);
        setInsight(null);
    };

    if (isLoading && !insight) return React.createElement('div', { className: 'h-8 w-full bg-neutral-800 skeleton' });
    if (!insight) return null;

    return React.createElement('div', { className: 'flex items-center justify-between p-2 pl-4 rounded-md bg-orange-900/30 border border-orange-700/50 text-sm animate-fade-in' },
        React.createElement('div', { className: 'flex items-center' },
            React.createElement('i', { className: 'fa-solid fa-lightbulb text-amber-300 mr-3' }),
            React.createElement('p', { className: 'text-gray-200' }, insight.text)
        ),
        React.createElement('button', { onClick: handleAction, className: 'btn btn-secondary text-xs px-2 py-1 ml-4' }, 'Take Action')
    );
}