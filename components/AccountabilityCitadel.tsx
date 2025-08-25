

import React, { useState } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { generateAccountabilitySummary } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import Spinner from './Spinner.tsx';
import Modal from './Modal.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import EmptyState from './EmptyState.tsx';
import { AccountabilityEntry } from '../services/types.ts';

const statusOptions: AccountabilityEntry['status'][] = ['Logged', 'Submitted', 'Response Received', 'Closed'];

const statusStyles = {
    'Logged': { backgroundColor: 'color-mix(in srgb, var(--info-primary) 20%, transparent)', color: 'var(--info-primary)', borderColor: 'var(--info-primary)' },
    'Submitted': { backgroundColor: 'color-mix(in srgb, var(--warning-primary) 20%, transparent)', color: 'var(--warning-primary)', borderColor: 'var(--warning-primary)' },
    'Response Received': { backgroundColor: 'color-mix(in srgb, var(--success-primary) 20%, transparent)', color: 'var(--success-primary)', borderColor: 'var(--success-primary)' },
    'Closed': { backgroundColor: 'color-mix(in srgb, var(--text-secondary) 20%, transparent)', color: 'var(--text-secondary)', borderColor: 'var(--text-secondary)' },
};

const ImpactMeter = ({ score }: { score: number }) => {
    const color = score > 8 ? 'var(--danger-primary)' : score > 5 ? 'var(--accent-primary)' : 'var(--warning-primary)';
    return React.createElement('div', { className: 'w-full bg-bg-tertiary rounded-full h-2.5 my-1' },
        React.createElement('div', {
            className: `h-2.5 rounded-full`,
            style: { width: `${score * 10}%`, backgroundColor: color }
        })
    );
};

const ChargeCard = ({ entry, onStatusChange, onAnalyzeImpact, geminiApiKey }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const { addToast } = useToast();

    const handleAnalyze = async () => {
        if (!geminiApiKey) {
            addToast("Add your Gemini API key to analyze impact.", "error");
            return;
        }
        setIsAnalyzing(true);
        try {
            await onAnalyzeImpact(entry.id);
        } catch (e) {
            // Error toast is handled in context
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleStatusChange = (e) => {
        onStatusChange(entry.id, e.target.value as AccountabilityEntry['status']);
    };
    
    return React.createElement('li', { className: 'p-4' },
        React.createElement('div', { className: 'flex flex-col sm:flex-row justify-between sm:items-start gap-4' },
            React.createElement('div', { className: 'flex-1' },
                React.createElement('p', { className: 'font-semibold text-accent-primary' }, `${entry.agency}`),
                React.createElement('p', { className: 'text-xs text-text-secondary mb-2' }, `${new Date(entry.date).toLocaleDateString()}`),
                React.createElement('p', { className: 'my-1 text-sm' }, React.createElement('strong', null, 'Failure: '), entry.failure),
                React.createElement('p', { className: 'text-sm text-text-secondary' }, React.createElement('strong', null, 'Required Action: '), entry.expectedAction)
            ),
            React.createElement('div', { className: 'flex-shrink-0 w-full sm:w-48' },
                React.createElement('label', {htmlFor: `status-${entry.id}`, className: 'text-xs font-semibold text-text-secondary'}, 'Status'),
                React.createElement('select', { 
                    id: `status-${entry.id}`,
                    value: entry.status, 
                    onChange: handleStatusChange, 
                    className: `form-select text-xs p-1 mt-1 border`,
                    style: statusStyles[entry.status]
                }, statusOptions.map(opt => React.createElement('option', {key: opt, value: opt}, opt))),
                React.createElement('div', { className: 'mt-2' },
                    React.createElement('label', {className: 'text-xs font-semibold text-text-secondary'}, `Impact Score: ${entry.impactScore}/10`),
                    React.createElement(ImpactMeter, {score: entry.impactScore})
                )
            )
        ),
        React.createElement('div', { className: 'mt-3 pt-3 border-t border-border-primary' },
            entry.impactAnalysis ? 
            React.createElement('div', { className: 'text-xs p-2 bg-bg-secondary rounded' },
                 React.createElement('strong', { className: 'text-accent-primary' }, 'AI Impact Analysis: '),
                 React.createElement('span', { className: 'text-text-secondary' }, entry.impactAnalysis)
            ) :
            React.createElement('button', {
                onClick: handleAnalyze,
                disabled: isAnalyzing,
                className: 'btn btn-secondary btn-sm w-full text-xs'
            }, isAnalyzing ? React.createElement(Spinner, {size: 'fa-sm'}) : React.createElement(React.Fragment, null, React.createElement('i', {className: 'fa-solid fa-brain mr-2'}), 'Analyze Impact'))
        )
    );
};

export default function AccountabilityCitadel() {
    const { geminiApiKey, accountabilityEntries, addAccountabilityEntry, updateAccountabilityEntryStatus, analyzeImpactForCharge, evidenceData, promptSettings } = useSpudHub();
    const { addToast } = useToast();
    const [date, setDate] = useState(new Date().toISOString().slice(0,10));
    const [agency, setAgency] = useState('');
    const [failure, setFailure] = useState('');
    const [expectedAction, setExpectedAction] = useState('');
    const [impactScore, setImpactScore] = useState(5);
    const [evidenceId, setEvidenceId] = useState('');
    const [summary, setSummary] = useState('');
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        addAccountabilityEntry({ 
            date, 
            agency, 
            failure, 
            expectedAction, 
            impactScore: impactScore,
            evidenceId: evidenceId ? parseInt(evidenceId) : undefined 
        });
        setAgency('');
        setFailure('');
        setExpectedAction('');
        setEvidenceId('');
        setImpactScore(5);
    };

    const handleGenerateSummary = async () => {
        if (!geminiApiKey) {
            addToast("Add your Gemini API key in System Settings to use this feature.", "error");
            return;
        }
        setIsLoadingSummary(true);
        setSummary('');
        try {
            const result = await generateAccountabilitySummary(geminiApiKey, accountabilityEntries, promptSettings.generateAccountabilitySummary);
            setSummary(result);
            setIsModalOpen(true);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Summary Error: ${error.message}`, 'error');
        } finally {
            setIsLoadingSummary(false);
        }
    };

    return React.createElement('div', {className: 'animate-fade-in'},
        React.createElement(PageTitle, { title: 'Accountability Citadel', icon: 'fa-gavel' },
            React.createElement('button', {
                onClick: handleGenerateSummary,
                disabled: isLoadingSummary || accountabilityEntries.length === 0,
                className: 'btn btn-primary'
            }, isLoadingSummary ? React.createElement(Spinner, {}) : React.createElement(React.Fragment, null, React.createElement('i', {className: 'fa-solid fa-wand-magic-sparkles mr-2'}), 'Generate Formal Complaint'))
        ),
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
            React.createElement('div', { className: 'lg:col-span-2' },
                React.createElement('div', { className: 'glass-card' },
                    React.createElement('div', { className: 'p-4 border-b border-border-primary' }, React.createElement('h2', { className: 'text-lg font-semibold' }, 'Charges')),
                    accountabilityEntries.length > 0 ? (
                        React.createElement('ul', { className: 'divide-y divide-border-primary' }, accountabilityEntries.map(entry =>
                            React.createElement(ChargeCard, { 
                                key: entry.id, 
                                entry,
                                geminiApiKey,
                                onStatusChange: updateAccountabilityEntryStatus,
                                onAnalyzeImpact: analyzeImpactForCharge,
                            })
                        ))
                    ) : React.createElement(EmptyState, { icon: 'fa-landmark', title: 'No Charges Logged', message: 'Use the form to add a new charge to the Accountability Citadel.', children: null })
                )
            ),
            React.createElement('form', { onSubmit: handleSubmit, className: 'glass-card p-6 space-y-4' },
                React.createElement('h2', { className: 'text-lg font-semibold' }, 'Log New Charge'),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'date', className: 'block text-sm font-medium mb-1' }, 'Date'),
                    React.createElement('input', { type: 'date', id: 'date', value: String(date), onChange: (e) => setDate(e.target.value), className: 'form-input', required: true })
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'agency', className: 'block text-sm font-medium mb-1' }, 'Agency'),
                    React.createElement('input', { type: 'text', id: 'agency', value: String(agency), onChange: (e) => setAgency(e.target.value), className: 'form-input', placeholder: 'e.g., QPS (Hendra)', required: true })
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'failure', className: 'block text-sm font-medium mb-1' }, 'Failure / Dereliction of Duty'),
                    React.createElement('textarea', { id: 'failure', value: failure, onChange: (e) => setFailure(e.target.value), className: 'form-textarea', rows: 3, required: true })
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'expected', className: 'block text-sm font-medium mb-1' }, 'Required Action Not Taken'),
                    React.createElement('textarea', { id: 'expected', value: expectedAction, onChange: (e) => setExpectedAction(e.target.value), className: 'form-textarea', rows: 2, required: true })
                ),
                 React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'impactScore', className: 'block text-sm font-medium mb-1 flex justify-between' }, 
                        React.createElement('span', null, 'Impact Score'),
                        React.createElement('span', { className: 'font-bold' }, impactScore)
                    ),
                    React.createElement('input', { id: 'impactScore', type: 'range', min: '1', max: '10', value: String(impactScore), onChange: (e) => setImpactScore(Number(e.target.value)), className: 'w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer' })
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'evidence', className: 'block text-sm font-medium mb-1' }, 'Link Evidence'),
                    React.createElement('select', { id: 'evidence', value: evidenceId, onChange: (e) => setEvidenceId(e.target.value), className: 'form-select' },
                        React.createElement('option', { value: '' }, 'None'),
                        evidenceData.map(e => React.createElement('option', { key: e.id, value: e.id.toString() }, e.fileName))
                    )
                ),
                React.createElement('button', { type: 'submit', className: 'btn btn-primary w-full' }, 'Add Charge')
            )
        ),
        React.createElement(Modal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false) },
            React.createElement('h2', { id: 'modal-title', className: 'text-xl font-bold mb-4' }, 'Generated Complaint Summary'),
            React.createElement(MarkdownRenderer, { markdownText: summary })
        )
    );
}