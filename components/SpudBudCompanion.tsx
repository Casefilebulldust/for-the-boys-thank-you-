
import React, { useState, useEffect, useCallback } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { getContextualSuggestion } from '../services/geminiService.ts';
import Spinner from './Spinner.tsx';
import { ContextualSuggestion } from '../services/types.ts';

const SpudLogoIcon = () => React.createElement('svg', {
    width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true"
    },
    React.createElement('path', {
        d: "M17.3,3.7C14.3,2.2,10.2,2.9,7.5,5.6S4.2,12.7,5.7,16.4c1.5,3.7,5.6,5.5,8.9,4.2c3.3-1.3,5.1-5,4.2-8.5 C18.1,8.9,18.4,5.9,17.3,3.7z M14,5c0.6,0,1,0.4,1,1s-0.4,1-1,1s-1-0.4-1-1S13.4,5,14,5z M9,8c0.6,0,1,0.4,1,1s-0.4,1-1,1 s-1-0.4-1-1S8.4,8,9,8z M11,12c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S11.6,12,11,12z",
        className: 'fill-current text-accent-primary'
    })
);

export default function SpudBudCompanion() {
    const spudHub = useSpudHub();
    const { activeTab, geminiApiKey, executeInsightAction } = spudHub;
    const { addToast } = useToast();
    const [suggestion, setSuggestion] = useState<ContextualSuggestion | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const fetchSuggestion = useCallback(async () => {
        if (!geminiApiKey) return;
        setIsLoading(true);
        try {
            const { promptSettings, geminiApiKey, activeTheme, ...fullData } = spudHub;
            let contextData = {};
            // Tailor the data snapshot to the active tab for relevance and efficiency
            switch (activeTab) {
                case 'Accountability Citadel': contextData = { charges: fullData.accountabilityEntries.slice(0, 5) }; break;
                case 'Evidence Locker': contextData = { evidence: fullData.evidenceData.slice(0,5).map(e => e.description) }; break;
                case 'Family Hub': contextData = { children: fullData.familyData.children }; break;
                case 'Wellness Tracker': contextData = { latestLog: fullData.wellnessLogs[0] }; break;
                default: contextData = { openMissions: fullData.missions.filter(m => m.status === 'active').length }; break;
            }
            const result = await getContextualSuggestion(geminiApiKey, { activeTab, data: contextData }, promptSettings.getContextualSuggestion);
            setSuggestion(result);
            setIsOpen(true);
        } catch (e) {
            console.error(`Companion Error: ${e.message}`);
            // Don't show toast for this, as it's a background process
        } finally {
            setIsLoading(false);
        }
    }, [geminiApiKey, activeTab, spudHub]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchSuggestion();
        }, 3000); // Debounce fetching
        return () => clearTimeout(handler);
    }, [activeTab, fetchSuggestion]);

    const handleExecute = () => {
        if (suggestion) {
            executeInsightAction(suggestion.action);
            setSuggestion(null);
            setIsOpen(false);
        }
    };

    const handleDismiss = () => {
        setSuggestion(null);
        setIsOpen(false);
    }

    if (!geminiApiKey) return null;

    const showCompanion = isOpen && (suggestion || isLoading);

    return React.createElement('div', { className: `fixed bottom-6 right-6 z-40 transition-all duration-300 ${showCompanion ? 'w-80' : 'w-16'}` },
        React.createElement('div', {
            className: 'glass-card glow-border p-3 rounded-lg shadow-2xl flex items-start gap-3'
        },
            React.createElement('div', { className: 'flex-shrink-0 w-10 h-10 bg-bg-tertiary rounded-full flex items-center justify-center' },
                isLoading ? React.createElement(Spinner, { size: 'fa-lg' }) : React.createElement(SpudLogoIcon)
            ),
            showCompanion && suggestion && React.createElement('div', { className: 'flex-1 animate-fade-in' },
                React.createElement('p', { className: 'text-sm font-semibold text-text-primary' }, "SpudBud Suggests:"),
                React.createElement('p', { className: 'text-xs text-text-secondary mt-1' }, suggestion.text),
                React.createElement('div', { className: 'flex gap-2 mt-3' },
                    React.createElement('button', { onClick: handleExecute, className: 'btn btn-primary flex-1 text-xs py-1' }, 'Execute'),
                    React.createElement('button', { onClick: handleDismiss, className: 'btn btn-secondary flex-1 text-xs py-1' }, 'Dismiss')
                )
            )
        )
    );
}