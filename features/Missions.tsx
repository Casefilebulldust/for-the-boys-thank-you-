

import React, { useState } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import PageTitle from '../components/PageTitle.tsx';
import Spinner from '../components/Spinner.tsx';
import EmptyState from '../components/EmptyState.tsx';
import { Mission, MissionStep, Campaign } from '../services/types.ts';

const MissionStepView = ({ step, missionId, onToggle, onExecute }) => {
    const isComplete = step.status === 'complete';
    const handleToggle = (e) => {
        onToggle(missionId, step.id, { status: e.target.checked ? 'complete' : 'pending' });
    };

    return React.createElement('div', { className: `p-3 flex items-start gap-3 transition-all duration-300 ${isComplete ? 'opacity-60' : ''}` },
        React.createElement('input', {
            type: 'checkbox',
            checked: isComplete,
            onChange: handleToggle,
            className: 'form-checkbox h-5 w-5 mt-1 flex-shrink-0 cursor-pointer'
        }),
        React.createElement('div', { className: 'flex-1' },
            React.createElement('h4', { className: `font-semibold text-sm ${isComplete ? 'line-through text-gray-400' : 'text-gray-100'}` }, step.title),
            !isComplete && React.createElement('button', {
                onClick: () => onExecute(step.action),
                className: 'btn btn-secondary btn-sm mt-2 text-xs py-0.5 px-2'
            }, React.createElement('i', { className: 'fa-solid fa-play mr-2 text-xs' }), 'Execute Step')
        )
    );
};

const MissionCard = ({ mission, onToggleStep, onExecuteAction }) => {
    const isComplete = mission.status === 'complete';

    return React.createElement('div', { className: `bg-bg-secondary/50 rounded-lg animate-fade-in overflow-hidden border border-border-primary` },
        React.createElement('div', { className: 'p-3' },
            React.createElement('h3', { className: `font-bold ${isComplete ? 'text-gray-500 line-through' : 'text-text-primary'}` }, mission.title),
            React.createElement('p', { className: `text-xs italic ${isComplete ? 'text-gray-600' : 'text-accent-primary'}` }, mission.objective)
        ),
        React.createElement('div', { className: 'divide-y divide-border-primary' },
            mission.steps.map(step => React.createElement(MissionStepView, { key: step.id, step, missionId: mission.id, onToggle: onToggleStep, onExecute: onExecuteAction }))
        )
    );
};


const CampaignCard = ({ campaign, missions, onStartMission, onToggleStep, onExecuteAction, onCreateMission }) => {
    const campaignMissions = missions.filter(m => m.campaignId === campaign.id);
    const completedMissions = campaignMissions.filter(m => m.status === 'complete').length;
    const progress = campaignMissions.length > 0 ? (completedMissions / campaignMissions.length) * 100 : 0;
    
    return React.createElement('div', { className: 'glass-card p-6' },
        React.createElement('h2', { className: 'text-lg font-semibold text-accent-primary' }, `Campaign: ${campaign.title}`),
        React.createElement('p', { className: 'text-sm text-text-secondary mb-3' }, campaign.objective),
        React.createElement('div', { className: 'w-full bg-bg-tertiary rounded-full h-2.5 mb-4' },
            React.createElement('div', {
                className: 'bg-accent-secondary h-2.5 rounded-full transition-all duration-500',
                style: { width: `${progress}%` }
            })
        ),
        React.createElement('div', { className: 'space-y-4' },
            campaignMissions.map(mission => React.createElement(MissionCard, {
                key: mission.id,
                mission: mission,
                onToggleStep: onToggleStep,
                onExecuteAction: onExecuteAction,
            })),
             React.createElement('button', {
                onClick: () => onCreateMission(`New mission for campaign: ${campaign.title}`, campaign.id),
                className: 'btn btn-secondary w-full'
            }, React.createElement('i', { className: 'fa-solid fa-plus mr-2'}), 'Add Mission to Campaign')
        )
    );
};

const NewCampaignForm = ({ onAddCampaign }) => {
    const [title, setTitle] = useState('');
    const [objective, setObjective] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (title && objective) {
            onAddCampaign(title, objective);
            setTitle('');
            setObjective('');
        }
    };

    return React.createElement('form', { onSubmit: handleSubmit, className: 'glass-card p-6 space-y-4' },
        React.createElement('h2', { className: 'text-lg font-semibold' }, 'Create New Campaign'),
        React.createElement('input', { type: 'text', value: title, onChange: e => setTitle(e.target.value), className: 'form-input', placeholder: 'Campaign Title (e.g., Prepare for Final Hearing)', required: true }),
        React.createElement('input', { type: 'text', value: objective, onChange: e => setObjective(e.target.value), className: 'form-input', placeholder: 'Overall Objective', required: true }),
        React.createElement('button', { type: 'submit', className: 'btn btn-primary w-full' }, 'Create Campaign')
    );
}

export default function Missions() {
    const { missions, campaigns, createMission, startMission, updateMissionStep, executeInsightAction, addCampaign, missionGenState } = useSpudHub();
    
    if (missionGenState.isLoading) {
        return React.createElement('div', { className: 'flex flex-col items-center justify-center h-full' },
            React.createElement(Spinner, { fullScreen: true }),
            React.createElement('p', { className: 'mt-4 text-gray-300 font-semibold' }, 'SpudBud is generating your mission plan...'),
            React.createElement('p', { className: 'text-sm text-gray-400' }, `Objective: "${missionGenState.objective}"`)
        );
    }
    
    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Mission Control', icon: 'fa-bullseye' }),
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
            React.createElement('div', { className: 'lg:col-span-2 space-y-6' },
                campaigns.length > 0 ? (
                    campaigns.map(campaign => React.createElement(CampaignCard, {
                        key: campaign.id,
                        campaign,
                        missions,
                        onStartMission: startMission,
                        onToggleStep: updateMissionStep,
                        onExecuteAction: executeInsightAction,
                        onCreateMission: createMission
                    }))
                ) : (
                    React.createElement(EmptyState, {
                        icon: 'fa-clipboard-question',
                        title: 'No Campaigns Yet',
                        message: 'Create a campaign to start organizing your missions and strategic objectives.'
                    })
                )
            ),
            React.createElement('div', { className: 'lg:col-span-1' },
                React.createElement(NewCampaignForm, { onAddCampaign: addCampaign })
            )
        )
    );
}