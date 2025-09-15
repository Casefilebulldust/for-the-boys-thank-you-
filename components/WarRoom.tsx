

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import PageTitle from './PageTitle.tsx';
import StatCard from './StatCard.tsx';
import Spinner from './Spinner.tsx';
import { getStrategicAdvice, generateTimelineEventSummary } from '../services/geminiService.ts';
import { TimelineEvent } from '../services/types.ts';
import MarkdownRenderer from './MarkdownRenderer.tsx';

const MasterTimeline = () => {
    const { evidenceData, wellnessLogs, accountabilityEntries, actionItems, setActiveTab, isAiAvailable, promptSettings } = useSpudHub();
    const { addToast } = useToast();
    const [summaries, setSummaries] = useState({});
    const [activeTooltipId, setActiveTooltipId] = useState(null);
    const tooltipTriggerRefs = useRef({});

    const timelineEvents: TimelineEvent[] = useMemo(() => {
        const events = [
            ...evidenceData.map(e => ({
                id: `evidence-${e.id}`, date: e.date, type: 'Evidence',
                title: 'Evidence Logged', description: e.fileName,
                icon: 'fa-boxes-stacked', colorClass: 'bg-accent-secondary', targetTab: 'Evidence Locker'
            })),
            ...accountabilityEntries.map(a => ({
                id: `charge-${a.id}`, date: a.date, type: 'Charge',
                title: `Charge vs. ${a.agency}`, description: a.failure,
                icon: 'fa-gavel', colorClass: 'bg-danger-primary', targetTab: 'Accountability Citadel'
            })),
            ...wellnessLogs.map(w => ({
                id: `wellness-${w.id}`, date: w.date, type: 'Wellness',
                title: 'Wellness Check-in', description: `Stress: ${w.stress}, Pain: ${w.pain}`,
                icon: 'fa-heart-pulse', colorClass: 'bg-success-primary', targetTab: 'Wellness Tracker'
            })),
            ...actionItems.map(i => ({
                id: `action-${i.id}`, date: new Date(i.id).toISOString(), type: 'Action',
                title: 'Action Item Created', description: i.subject,
                icon: 'fa-tasks', colorClass: 'bg-info-primary', targetTab: 'Action Tracker'
            }))
        ];
        return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [evidenceData, accountabilityEntries, wellnessLogs, actionItems]);

    const handleSummaryHover = useCallback(async (event) => {
        if (!isAiAvailable) return;
        
        setActiveTooltipId(event.id);

        if (summaries[event.id]) return;

        setSummaries(prev => ({ ...prev, [event.id]: { summary: null, isLoading: true } }));
        try {
            const summaryText = await generateTimelineEventSummary(event, promptSettings.generateTimelineEventSummary);
            setSummaries(prev => ({ ...prev, [event.id]: { summary: summaryText, isLoading: false } }));
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Summary Error: ${error.message}`, 'error');
            setSummaries(prev => {
                const newSummaries = { ...prev };
                delete newSummaries[event.id];
                return newSummaries;
            });
        }
    }, [isAiAvailable, summaries, promptSettings, addToast]);

    const handleMouseLeave = () => {
        setActiveTooltipId(null);
    };

    if (timelineEvents.length === 0) {
        return React.createElement('div', { className: 'text-center p-8' },
            React.createElement('h3', { className: 'font-semibold' }, 'Timeline is Empty'),
            React.createElement('p', { className: 'text-sm text-text-secondary mt-2' }, 'As you log evidence, charges, and other items, they will appear here in chronological order.')
        );
    }
    
    const activeTooltipData = activeTooltipId ? {
        id: activeTooltipId,
        ref: tooltipTriggerRefs.current[activeTooltipId]
    } : null;

    const TooltipContent = () => {
        if (!activeTooltipData) return null;
        const summaryData = summaries[activeTooltipData.id];
        if (summaryData?.isLoading || !summaryData) {
            return React.createElement(Spinner, { size: 'fa-sm' });
        }
        if (summaryData.summary) {
            return React.createElement(MarkdownRenderer, { markdownText: summaryData.summary });
        }
        return null;
    }

    return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'relative pl-8' },
            timelineEvents.map((event) => 
                React.createElement('div', { key: event.id, className: 'timeline-item mb-8' },
                    React.createElement('div', { className: `timeline-icon ${event.colorClass}` },
                        React.createElement('i', { className: `fa-solid ${event.icon} text-xs text-white` })
                    ),
                    React.createElement('div', { className: 'pl-4' },
                        React.createElement('div', { className: 'flex items-center gap-2' },
                            React.createElement('p', { className: 'text-xs text-text-secondary' }, new Date(event.date).toLocaleString()),
                            isAiAvailable && React.createElement('button', {
                                ref: el => (tooltipTriggerRefs.current[event.id] = el),
                                onMouseEnter: () => handleSummaryHover(event),
                                onMouseLeave: handleMouseLeave,
                                className: 'text-text-secondary hover:text-accent-primary transition-colors'
                            }, React.createElement('i', { className: 'fa-solid fa-brain fa-xs' }))
                        ),
                        React.createElement('h4', { className: 'font-semibold' }, event.title),
                        React.createElement('p', { className: 'text-sm text-text-secondary mt-1' }, event.description)
                    )
                )
            )
        ),
        activeTooltipData && activeTooltipData.ref && ReactDOM.createPortal(
            React.createElement(() => {
                const [position, setPosition] = useState({ top: -9999, left: -9999, opacity: 0 });
                useEffect(() => {
                    const rect = activeTooltipData.ref.getBoundingClientRect();
                    setPosition({
                        top: rect.top + rect.height / 2,
                        left: rect.left + rect.width + 10,
                        opacity: 1,
                    });
                }, [activeTooltipData.id]);

                return React.createElement('div', {
                    className: 'fixed z-50 glass-card p-3 max-w-xs text-sm transition-opacity duration-200',
                    style: { ...position, transform: 'translateY(-50%)' }
                }, React.createElement(TooltipContent, null));
            }, { key: activeTooltipData.id }),
            document.body
        )
    );
};

const StrategicThreatAssessment = () => {
    const spudHubData = useSpudHub();
    const { isAiAvailable, promptSettings } = spudHubData;
    const [assessment, setAssessment] = useState({ threats: [], opportunities: [] });
    const [isLoading, setIsLoading] = useState(false);

    const fetchAssessment = useCallback(async () => {
        if (!isAiAvailable) return;
        setIsLoading(true);
        try {
            const { promptSettings, ...snapshot } = spudHubData;
            const result = await getStrategicAdvice(snapshot, promptSettings.getStrategicAdvice);
            setAssessment(result);
        } catch (e) {
            console.error("Failed to fetch strategic assessment:", e);
        } finally {
            setIsLoading(false);
        }
    }, [isAiAvailable, spudHubData]);
    
    useEffect(() => {
        fetchAssessment();
    }, [fetchAssessment]);
    
    const AssessmentList = ({ title, items, icon, color }) => (
        React.createElement('div', null,
            React.createElement('h3', { className: `font-semibold mb-2 flex items-center ${color}` },
                React.createElement('i', { className: `fa-solid ${icon} mr-3` }),
                title
            ),
            React.createElement('ul', { className: 'space-y-2 list-disc list-inside text-sm' },
                items.map((item, index) => React.createElement('li', { key: index }, item))
            )
        )
    );

    return React.createElement('div', { className: 'glass-card p-6' },
        React.createElement('div', { className: 'flex justify-between items-center mb-4' },
            React.createElement('h2', { className: 'text-lg font-semibold' }, 'Strategic Assessment'),
             React.createElement('button', { onClick: fetchAssessment, disabled: isLoading, className: 'btn btn-secondary btn-sm p-2 h-8 w-8' }, 
               isLoading ? React.createElement(Spinner, {size: 'fa-sm'}) : React.createElement('i', { className: 'fa-solid fa-sync' })
            )
        ),
        isLoading && assessment.threats.length === 0 ? React.createElement(Spinner, {}) :
        !isAiAvailable ? React.createElement('p', {className: 'text-sm text-center text-text-secondary'}, 'Add API Key in Settings to enable AI assessment.') :
        React.createElement('div', { className: 'space-y-4' },
            React.createElement(AssessmentList, { title: 'Threats', items: assessment.threats, icon: 'fa-triangle-exclamation', color: 'text-danger-primary' }),
            React.createElement(AssessmentList, { title: 'Opportunities', items: assessment.opportunities, icon: 'fa-lightbulb', color: 'text-success-primary' })
        )
    );
};

export default function WarRoom() {
    const { accountabilityEntries, strategyData, missions } = useSpudHub();
    const courtDate = new Date('2025-09-11T09:00:00');
    const daysUntilCourt = Math.ceil((courtDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    const evidenceStrength = useMemo(() => {
        const strengths = strategyData.flatMap(g => g.arguments.map(a => a.strength));
        if (strengths.length === 0) return 0;
        const scoreMap = { 'Weak': 1, 'Moderate': 3, 'Strong': 4, 'Very Strong': 5, 'Unknown': 2 };
        const totalScore = strengths.reduce((acc, str) => acc + (scoreMap[str] || 0), 0);
        return Math.round((totalScore / (strengths.length * 5)) * 100);
    }, [strategyData]);

    const getStrengthColor = (score) => {
        if (score >= 75) return 'text-success-primary';
        if (score >= 50) return 'text-warning-primary';
        return 'text-danger-primary';
    };

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'War Room', icon: 'fa-chess-king' }),
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6' },
            React.createElement(StatCard, { icon: 'fa-calendar-check', label: 'Days Until Court', value: daysUntilCourt, colorClass: 'text-accent-primary' }),
            React.createElement(StatCard, { icon: 'fa-gavel', label: 'Accountability Charges', value: accountabilityEntries.length, colorClass: 'text-danger-primary' }),
            React.createElement(StatCard, { icon: 'fa-shield-halved', label: 'Case Strength', value: `${evidenceStrength}%`, colorClass: getStrengthColor(evidenceStrength) }),
            React.createElement(StatCard, { icon: 'fa-bullseye', label: 'Active Missions', value: missions.filter(m => m.status === 'active').length, colorClass: 'text-info-primary' })
        ),
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
            React.createElement('div', { className: 'lg:col-span-2' },
                React.createElement('div', { className: 'glass-card p-6' },
                    React.createElement('h2', { className: 'text-lg font-semibold mb-6' }, 'Master Timeline'),
                    React.createElement(MasterTimeline, null)
                )
            ),
            React.createElement('div', { className: 'space-y-6' },
                React.createElement(StrategicThreatAssessment, null)
            )
        )
    );
}