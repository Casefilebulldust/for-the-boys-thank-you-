import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import PageTitle from './PageTitle.tsx';
import StatCard from './StatCard.tsx';
import Spinner from './Spinner.tsx';
import { getStrategicAdvice } from '../services/geminiService.ts';

const CaseVitals = () => {
    const { evidenceData, accountabilityEntries, strategyData } = useSpudHub();
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
    }

    return React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
        React.createElement(StatCard, { icon: 'fa-calendar-check', label: 'Days Until Court', value: daysUntilCourt, colorClass: 'text-accent-primary' }),
        React.createElement(StatCard, { icon: 'fa-gavel', label: 'Accountability Charges', value: accountabilityEntries.length, colorClass: 'text-danger-primary' }),
        React.createElement(StatCard, { icon: 'fa-shield-halved', label: 'Evidence Strength', value: `${evidenceStrength}%`, colorClass: getStrengthColor(evidenceStrength) })
    );
};

const CampaignTracker = () => {
    const { campaigns, missions, setActiveTab } = useSpudHub();
    
    if (campaigns.length === 0) {
        return React.createElement('div', { className: 'glass-card p-6 text-center' },
            React.createElement('h3', { className: 'font-semibold' }, 'No Active Campaigns'),
            React.createElement('p', { className: 'text-sm text-text-secondary mt-2' }, 'Go to the Missions tab to create a new campaign and organize your strategic objectives.'),
            React.createElement('button', { onClick: () => setActiveTab('Missions'), className: 'btn btn-primary mt-4' }, 'Go to Mission Control')
        );
    }

    return React.createElement('div', { className: 'glass-card p-6' },
        React.createElement('h2', { className: 'text-lg font-semibold mb-4' }, 'Campaign Tracker'),
        React.createElement('div', { className: 'space-y-4' },
            campaigns.map(campaign => {
                const campaignMissions = missions.filter(m => m.campaignId === campaign.id);
                const progress = campaignMissions.length > 0 ? (campaignMissions.filter(m => m.status === 'complete').length / campaignMissions.length) * 100 : 0;
                return React.createElement('div', { key: campaign.id },
                    React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                        React.createElement('h3', { className: 'font-semibold text-accent-primary' }, campaign.title),
                        React.createElement('span', { className: 'text-sm font-bold' }, `${Math.round(progress)}%`)
                    ),
                    React.createElement('div', { className: 'w-full bg-bg-tertiary rounded-full h-2.5' },
                        React.createElement('div', {
                            className: 'bg-accent-secondary h-2.5 rounded-full transition-all duration-500',
                            style: { width: `${progress}%` }
                        })
                    )
                );
            })
        )
    );
};

const StrategicThreatAssessment = () => {
    const spudHubData = useSpudHub();
    const { geminiApiKey, promptSettings } = spudHubData;
    const [assessment, setAssessment] = useState({ threats: [], opportunities: [] });
    const [isLoading, setIsLoading] = useState(false);

    const fetchAssessment = useCallback(async () => {
        if (!geminiApiKey) return;
        setIsLoading(true);
        try {
            const { promptSettings, ...snapshot } = spudHubData;
            const result = await getStrategicAdvice(geminiApiKey, snapshot, promptSettings.getStrategicAdvice);
            setAssessment(result);
        } catch (e) {
            console.error("Failed to fetch strategic assessment:", e);
        } finally {
            setIsLoading(false);
        }
    }, [geminiApiKey, spudHubData]);
    
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
        !geminiApiKey ? React.createElement('p', {className: 'text-sm text-center text-text-secondary'}, 'Add API Key in Settings to enable AI assessment.') :
        React.createElement('div', { className: 'space-y-4' },
            React.createElement(AssessmentList, { title: 'Threats', items: assessment.threats, icon: 'fa-triangle-exclamation', color: 'text-danger-primary' }),
            React.createElement(AssessmentList, { title: 'Opportunities', items: assessment.opportunities, icon: 'fa-lightbulb', color: 'text-success-primary' })
        )
    );
};

export default function WarRoom() {
    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'War Room', icon: 'fa-chess-king' }),
        React.createElement('div', { className: 'space-y-6' },
            React.createElement(CaseVitals),
            React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },
                 React.createElement(CampaignTracker),
                 React.createElement(StrategicThreatAssessment)
            )
        )
    );
}