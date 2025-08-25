
import React, { useState, useEffect, useCallback } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { getResilienceCoaching } from '../services/geminiService.ts';
import PageTitle from '../components/PageTitle.tsx';
import Spinner from '../components/Spinner.tsx';
import SkeletonLoader from '../components/SkeletonLoader.tsx';
import MarkdownRenderer from '../components/MarkdownRenderer.tsx';
import EmptyState from '../components/EmptyState.tsx';

const RefinementControls = ({ onSelect, activeFocus, isLoading }) => {
    const topics = [
        "Feeling Overwhelmed",
        "Worried About the Future",
        "Stuck on Past Events",
        "Dealing with Conflict"
    ];

    return React.createElement('div', { className: 'mt-6 border-t border-border-primary pt-4' },
        React.createElement('h3', { className: 'text-sm font-semibold text-text-secondary mb-3' }, 'Refine Your Focus'),
        React.createElement('div', { className: 'flex flex-wrap gap-2' },
            topics.map(topic => {
                const isActive = activeFocus === topic;
                return React.createElement('button', {
                    key: topic,
                    onClick: () => onSelect(topic),
                    disabled: isLoading,
                    className: `btn btn-sm text-xs ${isActive ? 'btn-primary' : 'btn-secondary'}`
                }, topic)
            })
        )
    );
};

export default function MindsetResilience() {
    const { geminiApiKey, wellnessLogs, actionItems, familyData, promptSettings } = useSpudHub();
    const { addToast } = useToast();
    const [coaching, setCoaching] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [refinementFocus, setRefinementFocus] = useState('');

    const handleGetCoaching = useCallback(async (focus = '') => {
        setRefinementFocus(focus);
        if (!geminiApiKey) {
            setCoaching("Add your Gemini API Key in **System Settings** to enable resilience coaching from SpudBud.");
            return;
        }
        setIsLoading(true);
        try {
            const result = await getResilienceCoaching(geminiApiKey, wellnessLogs, actionItems, familyData, promptSettings.getResilienceCoaching, focus);
            setCoaching(result);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Coaching Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [geminiApiKey, wellnessLogs, actionItems, familyData, promptSettings, addToast]);

    useEffect(() => {
        handleGetCoaching();
    }, []); // Run only on initial mount

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Mindset & Resilience', icon: 'fa-spa' },
            React.createElement('button', {
                onClick: () => handleGetCoaching(),
                disabled: isLoading,
                className: 'btn btn-secondary'
            }, isLoading ? React.createElement(Spinner, {}) : 'Get General Coaching')
        ),
        React.createElement('div', { className: 'max-w-3xl mx-auto' },
            React.createElement('div', { className: 'glass-card p-8' },
                isLoading && !coaching ? React.createElement(SkeletonLoader) :
                coaching ? React.createElement(React.Fragment, null, 
                    React.createElement(MarkdownRenderer, { markdownText: coaching }),
                    React.createElement(RefinementControls, { onSelect: handleGetCoaching, activeFocus: refinementFocus, isLoading })
                ) :
                React.createElement(EmptyState, { icon: 'fa-comment-question', title: 'Ready for Coaching', message: 'Click the button to get your first piece of resilience coaching. Requires API Key.'})
            )
        )
    );
}