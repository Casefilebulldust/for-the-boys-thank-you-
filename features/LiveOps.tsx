


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { getHUDStatus } from '../services/geminiService.ts';
import PageTitle from '../components/PageTitle.tsx';
import Spinner from '../components/Spinner.tsx';
import StrategicAdvisor from './StrategicAdvisor.tsx';

const AIFocus = () => {
    const spudHubData = useSpudHub();
    const { isAiAvailable, promptSettings } = spudHubData;
    const [hud, setHud] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchHUD = useCallback(async () => {
        if (!isAiAvailable) return;
        setIsLoading(true);
        try {
            const { promptSettings, ...snapshot } = spudHubData;
            const result = await getHUDStatus(snapshot, promptSettings.getHUDStatus);
            setHud(result.hud);
        } catch (e) {
            console.error("Failed to fetch HUD status:", e);
        } finally {
            setIsLoading(false);
        }
    }, [isAiAvailable, spudHubData]);

    useEffect(() => {
        const timer = setTimeout(fetchHUD, 500); // Initial fetch
        const interval = setInterval(fetchHUD, 60000); // Refresh every minute
        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [fetchHUD]);

    return React.createElement('div', { className: 'glass-card p-4 mb-6' },
        React.createElement('div', { className: 'flex items-center' },
            React.createElement('i', { className: 'fa-solid fa-brain text-accent-primary text-xl mr-4' }),
            React.createElement('div', null,
                React.createElement('h2', { className: 'font-semibold text-accent-primary' }, "SpudBud's Focus"),
                isLoading && !hud ? React.createElement('div', { className: 'h-4 w-64 skeleton mt-1' })
                : React.createElement('p', { className: 'text-text-primary font-medium' }, hud || "Analyzing...")
            )
        )
    );
};

const CommunicationsHub = () => {
    const { actionItems, addEvidence, executeInsightAction } = useSpudHub();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('email');
    const [phoneTo, setPhoneTo] = useState('');
    const [phoneSubject, setPhoneSubject] = useState('');
    const [phoneNotes, setPhoneNotes] = useState('');

    const awaitingReply = actionItems.find(item => item.status === 'Awaiting Reply');

    const handleLogCall = async (e) => {
        e.preventDefault();
        const description = `Phone Call Log\nTo: ${phoneTo}\nSubject: ${phoneSubject}\n---\n${phoneNotes}`;
        const fileName = `PhoneLog_${new Date().toISOString().slice(0,10)}_${phoneTo.replace(/\s+/g, '_')}.txt`;
        await addEvidence(fileName, description, new Date().toISOString());
        addToast('Phone call logged as evidence.', 'success');
        setPhoneTo(''); setPhoneSubject(''); setPhoneNotes('');
    };

    const handlePhoneToChange = (e) => setPhoneTo(e.target.value);
    const handlePhoneSubjectChange = (e) => setPhoneSubject(e.target.value);
    const handlePhoneNotesChange = (e) => setPhoneNotes(e.target.value);

    return React.createElement('div', { className: 'glass-card p-4 mb-6' },
        React.createElement('h3', { className: 'font-semibold mb-3' }, 'Communications Hub'),
        React.createElement('div', { className: 'flex border-b border-border-primary mb-3' },
            React.createElement('button', { onClick: () => setActiveTab('email'), className: `px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'email' ? 'border-b-2 border-accent-primary text-accent-primary' : 'text-text-secondary'}`}, 'Email'),
            React.createElement('button', { onClick: () => setActiveTab('phone'), className: `px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'phone' ? 'border-b-2 border-accent-primary text-accent-primary' : 'text-text-secondary'}`}, 'Phone Log')
        ),
        activeTab === 'email' && React.createElement('div', { className: 'animate-fade-in' },
            awaitingReply ? React.createElement('div', null,
                React.createElement('p', { className: 'text-xs text-text-secondary' }, 'Awaiting reply for:'),
                React.createElement('p', { className: 'font-semibold' }, awaitingReply.subject),
                React.createElement('button', { onClick: () => executeInsightAction({ type: 'PRIME_ADVOCACY', payload: { tool: 'email', situation: `Draft a follow-up email for: ${awaitingReply.subject}`}}), className: 'btn btn-secondary btn-sm mt-2 text-xs' }, 'Draft Follow-up')
            ) : React.createElement('p', { className: 'text-sm text-text-secondary text-center p-4' }, 'Inbox clear. No replies pending.')
        ),
        activeTab === 'phone' && React.createElement('form', { onSubmit: handleLogCall, className: 'space-y-2 animate-fade-in' },
            React.createElement('input', { type: 'text', name: 'phoneTo', value: phoneTo, onChange: handlePhoneToChange, className: 'form-input text-sm', placeholder: 'To:', required: true } as any),
            React.createElement('input', { type: 'text', name: 'phoneSubject', value: phoneSubject, onChange: handlePhoneSubjectChange, className: 'form-input text-sm', placeholder: 'Subject:', required: true } as any),
            React.createElement('textarea', { name: 'phoneNotes', value: phoneNotes, onChange: handlePhoneNotesChange, className: 'form-textarea text-sm', placeholder: 'Notes...', rows: 3 } as any),
            React.createElement('button', { type: 'submit', className: 'btn btn-primary w-full text-sm' }, 'Log Call')
        )
    );
};

const IntelFeed = ({ items, onItemClick }) => {
    const itemStyles = {
        evidence: { icon: 'fa-boxes-stacked', color: 'text-accent-primary' },
        wellness: { icon: 'fa-heart-pulse', color: 'text-green-400' },
        action: { icon: 'fa-tasks', color: 'text-blue-400' },
        charge: { icon: 'fa-gavel', color: 'text-red-400' },
        agenda: { icon: 'fa-calendar-day', color: 'text-yellow-400' },
    };

    return React.createElement('div', { className: 'glass-card h-full' },
        React.createElement('h3', { className: 'font-semibold p-4 border-b border-border-primary' }, 'Live Intel Feed'),
        React.createElement('div', { className: 'overflow-y-auto h-[calc(100vh-180px)] p-2' },
            items.map(item => React.createElement('div', {
                key: item.id,
                onClick: () => onItemClick(item.tab),
                className: 'flex items-start gap-3 p-2 rounded-md hover:bg-bg-secondary cursor-pointer'
            },
                React.createElement('i', { className: `fa-solid ${itemStyles[item.type].icon} ${itemStyles[item.type].color} mt-1 w-4 text-center` }),
                React.createElement('div', { className: 'flex-1' },
                    React.createElement('p', { className: 'text-sm' }, item.text),
                    React.createElement('p', { className: 'text-xs text-text-secondary' }, new Date(item.timestamp).toLocaleString())
                )
            ))
        )
    );
};

export default function LiveOps() {
    const spudHub = useSpudHub();
    const { evidenceData, wellnessLogs, actionItems, accountabilityEntries, familyData, missions, setActiveTab } = spudHub;

    const intelFeedItems = useMemo(() => {
        const feed = [
            ...evidenceData.map(e => ({ id: `e-${e.id}`, timestamp: e.date, type: 'evidence', text: `Evidence logged: ${e.fileName}`, tab: 'Evidence Locker' })),
            ...wellnessLogs.map(w => ({ id: `w-${w.id}`, timestamp: w.date, type: 'wellness', text: `Wellness Check-in: Stress ${w.stress}, Pain ${w.pain}`, tab: 'Wellness Tracker' })),
            ...actionItems.map(a => ({ id: `a-${a.id}`, timestamp: new Date(a.id).toISOString(), type: 'action', text: `Action item created: ${a.subject}`, tab: 'Action Tracker' })),
            ...accountabilityEntries.map(c => ({ id: `c-${c.id}`, timestamp: c.date, type: 'charge', text: `Charge logged against ${c.agency}`, tab: 'Accountability Citadel' })),
            ...familyData.agenda.filter(i => i.isUrgent).map(i => ({ id: `i-${i.id}`, timestamp: new Date().toISOString(), type: 'agenda', text: `URGENT: ${i.title}`, tab: 'Family Hub' }))
        ];
        return feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [evidenceData, wellnessLogs, actionItems, accountabilityEntries, familyData.agenda]);
    
    const activeMission = missions.find(m => m.status === 'active');
    const missionProgress = activeMission ? (activeMission.steps.filter(s => s.status === 'complete').length / activeMission.steps.length) * 100 : 0;
    const latestWellness = wellnessLogs[0];
    const getLevelColor = (level) => {
        if (level >= 8) return 'text-level-high';
        if (level >= 5) return 'text-level-medium';
        return 'text-level-low';
    };

    const topCharge = useMemo(() => {
        if (!accountabilityEntries || accountabilityEntries.length === 0) return null;
        return [...accountabilityEntries].sort((a, b) => b.impactScore - a.impactScore)[0];
    }, [accountabilityEntries]);

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Live Operations', icon: 'fa-bolt' }),
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6' },
            // Col 1: Intel Feed
            React.createElement('div', { className: 'lg:col-span-1 xl:col-span-1' },
                React.createElement(IntelFeed, { items: intelFeedItems, onItemClick: setActiveTab })
            ),
            // Col 2: Command & Control
            React.createElement('div', { className: 'lg:col-span-2 xl:col-span-2' },
                React.createElement(AIFocus),
                React.createElement(CommunicationsHub),
                React.createElement('div', { className: 'glass-card p-4' },
                     React.createElement('h3', { className: 'font-semibold mb-3' }, 'Urgent Agenda'),
                     familyData.agenda.filter(i => i.isUrgent).length > 0 ? (
                         React.createElement('ul', { className: 'space-y-2' }, familyData.agenda.filter(i => i.isUrgent).map(item => React.createElement('li', { key: item.id, className: 'flex items-center text-sm p-2 bg-bg-secondary rounded-md' },
                             React.createElement('i', { className: 'fa-solid fa-triangle-exclamation text-danger-primary mr-3' }),
                             React.createElement('div', null, 
                                 React.createElement('p', null, item.title),
                                 React.createElement('p', {className: 'text-xs text-text-secondary'}, item.time)
                            )
                         )))
                     ) : React.createElement('p', { className: 'text-sm text-text-secondary text-center p-4' }, 'No urgent items on the agenda.')
                )
            ),
            // Col 3: Status
            React.createElement('div', { className: 'lg:col-span-3 xl:col-span-1' },
                React.createElement('div', { className: 'glass-card p-4 mb-6' },
                    React.createElement('h3', { className: 'font-semibold mb-3' }, 'Wellness Status'),
                    latestWellness ? React.createElement('div', {className: 'flex justify-around text-center'},
                        React.createElement('div', null,
                            React.createElement('p', { className: 'text-sm text-text-secondary'}, 'Stress'),
                            React.createElement('p', { className: `text-3xl font-bold ${getLevelColor(latestWellness.stress)}` }, latestWellness.stress)
                        ),
                        React.createElement('div', null,
                             React.createElement('p', { className: 'text-sm text-text-secondary'}, 'Pain'),
                            React.createElement('p', { className: `text-3xl font-bold ${getLevelColor(latestWellness.pain)}` }, latestWellness.pain)
                        )
                    ) : React.createElement('p', { className: 'text-sm text-text-secondary text-center p-4' }, 'No wellness log today.')
                ),
                topCharge && React.createElement('div', { className: 'glass-card p-4 mb-6' },
                    React.createElement('h3', { className: 'font-semibold mb-2 flex items-center' }, React.createElement('i', {className: 'fa-solid fa-gavel text-danger-primary mr-2'}), 'Top Charge'),
                    React.createElement('p', {className: 'text-sm font-bold'}, `${topCharge.agency}: ${topCharge.failure}`),
                    React.createElement('p', {className: 'text-xs text-text-secondary mt-1'}, `Impact Score: ${topCharge.impactScore}/10`)
                ),
                activeMission && React.createElement('div', { className: 'glass-card p-4 mb-6' },
                    React.createElement('h3', { className: 'font-semibold mb-2' }, 'Active Mission'),
                    React.createElement('p', { className: 'text-sm text-accent-primary font-medium' }, activeMission.title),
                    React.createElement('div', { className: 'w-full bg-bg-tertiary rounded-full h-2 mt-2' },
                        React.createElement('div', { className: 'bg-accent-secondary h-2 rounded-full', style: { width: `${missionProgress}%` } })
                    ),
                    React.createElement('p', { className: 'text-xs text-right mt-1 text-text-secondary' }, `${Math.round(missionProgress)}% Complete`)
                ),
                React.createElement(StrategicAdvisor)
            )
        )
    );
}
