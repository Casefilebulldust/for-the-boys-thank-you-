import React, { useState, useEffect, useCallback } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { getStrategySuggestion } from '../services/geminiService.ts';
import Spinner from './Spinner.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';

export default function StrategicAdvisor() {
    const spudHubData = useSpudHub();
    const { geminiApiKey, strategyData, promptSettings } = spudHubData;
    const { addToast } = useToast();
    const [advice, setAdvice] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchAdvice = useCallback(async () => {
        if (!geminiApiKey) {
            setAdvice("Add your Gemini API Key in System Settings to enable the Strategic Advisor.");
            return;
        }
        setIsLoading(true);
        try {
            const result = await getStrategySuggestion(geminiApiKey, strategyData, promptSettings.getStrategySuggestion);
            setAdvice(result);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Strategy Advice Error: ${error.message}`, 'error');
            setAdvice(`Failed to get advice: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [geminiApiKey, strategyData, promptSettings, addToast]);

    useEffect(() => {
        fetchAdvice();
    }, [fetchAdvice]);

    return React.createElement('div', { className: 'glass-card p-6' },
        React.createElement('div', { className: 'flex justify-between items-center mb-4' },
            React.createElement('h2', { className: 'text-lg font-semibold flex items-center' }, 
                React.createElement('i', { className: 'fa-solid fa-chess-queen mr-3 text-accent-primary' }),
                'Strategic Advisor'
            ),
            React.createElement('button', { onClick: fetchAdvice, disabled: isLoading, className: 'btn btn-secondary btn-sm' }, 
                React.createElement('i', { className: 'fa-solid fa-sync' })
            )
        ),
        isLoading 
            ? React.createElement(Spinner, {}) 
            : React.createElement(MarkdownRenderer, { markdownText: advice })
    );
}
