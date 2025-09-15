

import React, { useState, useEffect, useCallback } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { getResilienceCoaching } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import Spinner from './Spinner.tsx';
import SkeletonLoader from './SkeletonLoader.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import EmptyState from './EmptyState.tsx';

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
    const { isAiAvailable, wellnessLogs, actionItems, familyData, promptSettings } = useSpudHub();
    const { addToast } = useToast();
    const [coaching, setCoaching] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [refinementFocus, setRefinementFocus] = useState('');

    const handleGetCoaching = useCallback(async (focus = '') => {
        setRefinementFocus(focus);
        if (!isAiAvailable) {
            setCoaching("AI features are disabled. Set the API_KEY environment variable to enable resilience coaching from SpudBud.");
            return;
        }
        setIsLoading(true);
        try {
            const result = await getResilienceCoaching(wellnessLogs, actionItems, familyData, promptSettings.getResilienceCoaching, focus);
            setCoaching(result);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Coaching Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [isAiAvailable, wellnessLogs, actionItems, familyData, promptSettings, addToast]);

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