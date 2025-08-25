import React, { useState, useEffect, useCallback } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { getThreatMatrix, getHUDStatus } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import StatCard from './StatCard.tsx';
import SkeletonLoader from './SkeletonLoader.tsx';
import Spinner from './Spinner.tsx';
import { ThreatMatrix, InsightAction, WellnessLog } from '../services/types.ts';

const HUD = () => {
    const spudHubData = useSpudHub();
    const { geminiApiKey, promptSettings } = spudHubData;
    const [hud, setHud] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchHUD = useCallback(async () => {
        if (!geminiApiKey) return;
        setIsLoading(true);
        try {
            const { promptSettings, ...snapshot } = spudHubData;
            const result = await getHUDStatus(geminiApiKey, snapshot, promptSettings.getHUDStatus);
            setHud(result.hud);
        } catch (e) {
            console.error("Failed to fetch HUD status:", e);
        } finally {
            setIsLoading(false);
        }
    }, [geminiApiKey, spudHubData]);

    useEffect(() => {
        fetchHUD();
        const interval = setInterval(fetchHUD, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [fetchHUD]);

    if (!geminiApiKey) return null;
    
    return React.createElement('div', { className: 'glass-card p-4 mb-6 bg-bg-tertiary border-border-secondary' },
        React.createElement('div', { className: 'flex items-center' },
            React.createElement('i', { className: 'fa-solid fa-brain text-accent-primary text-xl mr-4' }),
            React.createElement('div', null,
                React.createElement('h2', { className: 'font-semibold text-accent-primary' }, "SpudBud's Focus"),
                isLoading && !hud ? React.createElement('div', { className: 'h-4 w-64 skeleton mt-1' })
                : React.createElement('p', { className: 'text-text-primary font-medium' }, hud)
            )
        )
    );
};

const QuickActions = () => {
    const { setActiveTab } = useSpudHub();
    const actions = [
        { label: 'Log Evidence', icon: 'fa-plus', tab: 'Evidence Locker' },
        { label: 'Wellness Check-in', icon: 'fa-heart-pulse', tab: 'Wellness Tracker' },
        { label: 'Draft Communication', icon: 'fa-microphone-lines', tab: 'Advocacy Assistant' }
    ];

    return React.createElement('div', { className: 'glass-card p-4 mb-6' },
        React.createElement('h3', { className: 'text-sm font-semibold text-text-secondary mb-3' }, 'QUICK ACTIONS'),
        React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
            actions.map(action => React.createElement('button', {
                key: action.label,
                onClick: () => setActiveTab(action.tab),
                className: 'btn btn-secondary flex-col h-20 text-xs'
            },
                React.createElement('i', { className: `fa-solid ${action.icon} text-lg mb-1` }),
                action.label
            ))
        )
    );
};

const WellnessChart = ({ logs }: { logs: WellnessLog[] }) => {
    const weekLogs = logs.slice(0, 7).reverse();
    if (weekLogs.length < 2) return React.createElement('div', {className: 'text-center text-sm text-text-secondary py-4'}, 'Not enough data for wellness chart.');

    const width = 300, height = 100, padding = 20;
    const maxVal = 10;
    const xStep = (width - padding * 2) / (weekLogs.length - 1);

    const toPath = (key: 'stress' | 'pain') => weekLogs.map((log, i) => {
        const x = padding + i * xStep;
        const y = height - padding - (log[key] / maxVal) * (height - padding * 2);
        return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ');

    return React.createElement('div', null,
        React.createElement('h3', { className: 'text-lg font-semibold mb-2' }, '7-Day Wellness Trend'),
        React.createElement('svg', { viewBox: `0 0 ${width} ${height}`, className: 'w-full h-auto' },
            [0, 5, 10].map(val => React.createElement('line', {
                key: val, x1: padding, y1: height - padding - (val / maxVal) * (height - padding * 2),
                x2: width - padding, y2: height - padding - (val / maxVal) * (height - padding * 2),
                className: 'chart-grid-line'
            })),
            React.createElement('path', { d: toPath('stress'), fill: 'none', stroke: 'var(--warning-primary)', strokeWidth: '2' }),
            React.createElement('path', { d: toPath('pain'), fill: 'none', stroke: 'var(--danger-primary)', strokeWidth: '2' }),
             weekLogs.map((log, i) => React.createElement('text', {
                key: i, x: padding + i * xStep, y: height - 5, className: 'chart-text', textAnchor: 'middle'
            }, new Date(log.date).getDate()))
        ),
        React.createElement('div', { className: 'flex justify-center space-x-4 text-xs mt-2' },
            React.createElement('span', null, React.createElement('i', { className: 'fa-solid fa-circle mr-1', style: {color: 'var(--warning-primary)'} }), 'Stress'),
            React.createElement('span', null, React.createElement('i', { className: 'fa-solid fa-circle mr-1', style: {color: 'var(--danger-primary)'} }), 'Pain')
        )
    );
};

const MatrixQuadrant = ({ title, icon, color, items, onAction, onMissionCreate }) => {
    const handleAction = (action: InsightAction) => {
        if (action.type === 'CREATE_MISSION') {
            onMissionCreate(action.payload.objective);
        } else {
            onAction(action);
        }
    };
    
    return React.createElement('div', { className: 'glass-card p-4 flex flex-col' },
        React.createElement('h3', { className: `font-bold text-lg mb-3 flex items-center ${color}` },
            React.createElement('i', { className: `fa-solid ${icon} mr-3 fa-fw` }),
            title
        ),
        React.createElement('div', { className: 'space-y-2 flex-1' },
            items && items.length > 0 ? items.map((item, index) =>
                React.createElement('button', {
                    key: index,
                    onClick: () => handleAction(item.action),
                    className: 'w-full text-left p-3 bg-bg-secondary rounded-md hover:bg-bg-tertiary transition-all text-sm text-text-secondary hover:text-text-primary focus:ring-2 ring-accent-primary outline-none'
                }, item.action.type === 'CREATE_MISSION' ? React.createElement('span', null, React.createElement('i', { className: 'fa-solid fa-bullseye mr-2 text-accent-primary' }), item.text) : item.text)
            ) : React.createElement('div', { className: 'text-center p-4 text-text-secondary text-sm' }, 'No critical items identified.')
        )
    );
};

export default function StrategicAnalysis() {
    const spudHubData = useSpudHub();
    const { geminiApiKey, familyData, actionItems, wellnessLogs, evidenceData, executeInsightAction, createMission } = spudHubData;
    const { addToast } = useToast();
    const [matrix, setMatrix] = useState<ThreatMatrix | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMatrix = useCallback(async () => {
        if (!geminiApiKey) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const { promptSettings, ...snapshot } = spudHubData;
            const result = await getThreatMatrix(geminiApiKey, snapshot, promptSettings.getThreatMatrix);
            setMatrix(result);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Error fetching strategic matrix: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [geminiApiKey, addToast, spudHubData]);

    useEffect(() => {
        fetchMatrix();
    }, [fetchMatrix]);

    const urgentTasks = familyData.agenda.filter(a => a.isUrgent).length;
    const latestWellness = wellnessLogs[0];

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Strategic Analysis', icon: 'fa-brain' },
             React.createElement('button', {
                onClick: fetchMatrix,
                disabled: isLoading,
                className: 'btn btn-primary'
            }, isLoading ? React.createElement(Spinner, {size: 'fa-sm'}) : React.createElement(React.Fragment, null, React.createElement('i', {className: 'fa-solid fa-sync mr-2'}), 'Refresh Analysis'))
        ),
        React.createElement(HUD),
        React.createElement(QuickActions),
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6' },
            React.createElement(StatCard, { icon: 'fa-exclamation-triangle', label: 'Urgent Tasks', value: urgentTasks, colorClass: 'text-danger-primary' }),
            React.createElement(StatCard, { icon: 'fa-boxes-stacked', label: 'Evidence Logged', value: evidenceData.length, colorClass: 'text-accent-primary' }),
            React.createElement(StatCard, { icon: 'fa-heart-pulse', label: 'Latest Stress', value: latestWellness ? latestWellness.stress : 'N/A', colorClass: latestWellness?.stress >= 7 ? 'text-warning-primary' : 'text-success-primary' }),
            React.createElement(StatCard, { icon: 'fa-tasks', label: 'Open Actions', value: actionItems.filter(a => a.status === 'Draft').length, colorClass: 'text-text-secondary' })
        ),
        React.createElement('div', { className: 'grid grid-cols-1 xl:grid-cols-3 gap-6' },
            React.createElement('div', { className: 'xl:col-span-2' },
                React.createElement('div', { className: 'glass-card p-6' },
                    React.createElement('h2', { className: 'text-xl font-semibold mb-4' }, 'Threat & Opportunity Matrix'),
                    !geminiApiKey ? 
                        React.createElement('div', { className: 'text-center p-8' },
                            React.createElement('h3', { className: 'text-lg font-bold' }, 'AI Analysis Disabled'),
                            React.createElement('p', { className: 'text-text-secondary' }, 'Add your Gemini API Key in System Settings to enable the Threat & Opportunity Matrix.')
                        ) :
                    isLoading ? React.createElement(SkeletonLoader) :
                    React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
                        React.createElement(MatrixQuadrant, { title: 'Urgent Threats', icon: 'fa-skull-crossbones', color: 'text-danger-primary', items: matrix?.urgentThreats, onAction: executeInsightAction, onMissionCreate: createMission }),
                        React.createElement(MatrixQuadrant, { title: 'Strategic Opportunities', icon: 'fa-lightbulb', color: 'text-warning-primary', items: matrix?.strategicOpportunities, onAction: executeInsightAction, onMissionCreate: createMission }),
                        React.createElement(MatrixQuadrant, { title: 'Resource Drainers', icon: 'fa-battery-quarter', color: 'text-text-secondary', items: matrix?.resourceDrainers, onAction: executeInsightAction, onMissionCreate: createMission }),
                        React.createElement(MatrixQuadrant, { title: 'Quick Wins', icon: 'fa-trophy', color: 'text-success-primary', items: matrix?.quickWins, onAction: executeInsightAction, onMissionCreate: createMission })
                    )
                )
            ),
             React.createElement('div', { className: 'glass-card p-6' },
                React.createElement(WellnessChart, { logs: wellnessLogs })
            )
        )
    );
};