

import React, { useState } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { generateAccountabilitySummary, suggestImpactScore } from '../services/geminiService.ts';
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

const ChargeCard = ({ entry, onStatusChange, onAnalyzeImpact, isAiAvailable, onEdit, onDelete }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const { addToast } = useToast();

    const handleAnalyze = async () => {
        if (!isAiAvailable) {
            addToast("AI features require an API key to be set in the environment.", "error");
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
        onStatusChange(entry.id, { status: e.target.value as AccountabilityEntry['status'] });
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
                React.createElement('label', { htmlFor: `status-${entry.id}`, className: 'text-xs font-semibold text-text-secondary' } as any, 'Status'),
                React.createElement('select', { 
                    id: `status-${entry.id}`,
                    value: entry.status, 
                    onChange: handleStatusChange, 
                    className: `form-select text-xs p-1 mt-1 border`,
                    style: statusStyles[entry.status]
                } as any, statusOptions.map(opt => React.createElement('option', {key: opt, value: opt}, opt))),
                React.createElement('div', { className: 'mt-2' },
                    React.createElement('label', {htmlFor: `impact-${entry.id}`, className: 'text-xs font-semibold text-text-secondary'} as any, `Impact Score: ${entry.impactScore}/10`),
                    React.createElement(ImpactMeter, {score: entry.impactScore})
                )
            )
        ),
        React.createElement('div', { className: 'mt-3 pt-3 border-t border-border-primary flex items-center justify-between' },
            entry.impactAnalysis ? 
            React.createElement('div', { className: 'text-xs p-2 bg-bg-secondary rounded flex-1' },
                 React.createElement('strong', { className: 'text-accent-primary' }, 'AI Impact Analysis: '),
                 React.createElement('span', { className: 'text-text-secondary' }, entry.impactAnalysis)
            ) :
            React.createElement('button', {
                onClick: handleAnalyze,
                disabled: isAnalyzing || !isAiAvailable,
                className: 'btn btn-secondary btn-sm text-xs flex-1'
            }, isAnalyzing ? React.createElement(Spinner, {size: 'fa-sm'}) : React.createElement(React.Fragment, null, React.createElement('i', {className: 'fa-solid fa-brain mr-2'}), 'Analyze Impact')),
            React.createElement('div', { className: 'flex gap-2 ml-2' },
                React.createElement('button', { onClick: () => onEdit(entry), className: 'btn btn-secondary btn-sm p-2 w-8 h-8' }, React.createElement('i', { className: 'fa-solid fa-pencil' })),
                React.createElement('button', { onClick: () => onDelete(entry.id), className: 'btn btn-secondary btn-sm p-2 w-8 h-8 text-danger-primary' }, React.createElement('i', { className: 'fa-solid fa-trash' }))
            )
        )
    );
};

const EditChargeModal = ({ isOpen, onClose, entry, onSave }) => {
    const [formData, setFormData] = useState(entry);

    React.useEffect(() => {
        setFormData(entry);
    }, [entry]);

    if (!isOpen || !formData) return null;
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'impactScore' ? Number(value) : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return React.createElement(Modal, { isOpen, onClose },
        React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
            React.createElement('h2', { className: 'text-lg font-semibold' }, 'Edit Charge'),
            React.createElement('input', { type: 'date', name: 'date', value: formData.date.slice(0,10), onChange: handleChange, className: 'form-input' }),
            React.createElement('input', { type: 'text', name: 'agency', value: formData.agency || '', onChange: handleChange, className: 'form-input', placeholder: 'Agency' }),
            React.createElement('textarea', { name: 'failure', value: formData.failure || '', onChange: handleChange, className: 'form-textarea', rows: 3, placeholder: 'Failure' }),
            React.createElement('textarea', { name: 'expectedAction', value: formData.expectedAction || '', onChange: handleChange, className: 'form-textarea', rows: 2, placeholder: 'Required Action' }),
            React.createElement('input', { type: 'range', name: 'impactScore', min: 1, max: 10, value: formData.impactScore, onChange: handleChange, className: 'w-full' }),
            React.createElement('div', { className: 'flex justify-end gap-2 pt-2' },
                React.createElement('button', { type: 'button', onClick: onClose, className: 'btn btn-secondary' }, 'Cancel'),
                React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Save Changes')
            )
        )
    );
};

export default function AccountabilityCitadel() {
    const { accountabilityEntries, addAccountabilityEntry, updateById, deleteById, evidenceData, promptSettings, analyzeImpactForCharge, isAiAvailable } = useSpudHub();
    const { addToast } = useToast();
    const [date, setDate] = useState(new Date().toISOString().slice(0,10));
    const [agency, setAgency] = useState('');
    const [failure, setFailure] = useState('');
    const [expectedAction, setExpectedAction] = useState('');
    const [impactScore, setImpactScore] = useState(5);
    const [impactJustification, setImpactJustification] = useState('');
    const [isSuggestingImpact, setIsSuggestingImpact] = useState(false);
    const [evidenceId, setEvidenceId] = useState('');
    const [summary, setSummary] = useState('');
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);

    const handleSuggestImpact = async () => {
        if (!isAiAvailable) return addToast("AI features require an API Key.", "error");
        if (!failure || !expectedAction) return addToast("Please provide Failure and Required Action details first.", "error");
        
        setIsSuggestingImpact(true);
        setImpactJustification('');
        try {
            const result = await suggestImpactScore({ failure, expectedAction }, promptSettings.suggestImpactScore);
            setImpactScore(result.score);
            setImpactJustification(result.justification);
            addToast("AI has suggested an impact score.", "success");
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Suggestion Error: ${error.message}`, 'error');
        } finally {
            setIsSuggestingImpact(false);
        }
    };

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
        setImpactJustification('');
    };

    const handleGenerateSummary = async () => {
        if (!isAiAvailable) {
            addToast("AI features require an API Key.", "error");
            return;
        }
        setIsLoadingSummary(true);
        setSummary('');
        try {
            const result = await generateAccountabilitySummary(accountabilityEntries, promptSettings.generateAccountabilitySummary);
            setSummary(result);
            setIsSummaryModalOpen(true);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Summary Error: ${error.message}`, 'error');
        } finally {
            setIsLoadingSummary(false);
        }
    };

    const handleEdit = (entry) => {
        setEditingEntry(entry);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = (updatedEntry) => {
        updateById('accountabilityEntries', updatedEntry.id, updatedEntry);
        addToast("Charge updated.", "success");
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this charge? This cannot be undone.")) {
            deleteById('accountabilityEntries', id);
            addToast("Charge deleted.", "success");
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
                                isAiAvailable,
                                onStatusChange: (id, payload) => updateById('accountabilityEntries', id, payload),
                                onAnalyzeImpact: (id) => analyzeImpactForCharge(id),
                                onEdit: handleEdit,
                                onDelete: handleDelete
                            })
                        ))
                    ) : React.createElement(EmptyState, { icon: 'fa-landmark', title: 'No Charges Logged', message: 'Use the form to add a new charge to the Accountability Citadel.' })
                )
            ),
            React.createElement('form', { onSubmit: handleSubmit, className: 'glass-card p-6 space-y-4' },
                React.createElement('h2', { className: 'text-lg font-semibold' }, 'Log New Charge'),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'charge-date', className: 'block text-sm font-medium mb-1' } as any, 'Date'),
                    React.createElement('input', { id: 'charge-date', type: 'date', name: 'date', value: date, onChange: (e) => setDate(e.target.value), className: 'form-input', required: true } as any)
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'charge-agency', className: 'block text-sm font-medium mb-1' } as any, 'Agency'),
                    React.createElement('input', { id: 'charge-agency', type: 'text', name: 'agency', value: agency, onChange: (e) => setAgency(e.target.value), className: 'form-input', placeholder: 'e.g., QPS (Hendra)', required: true } as any)
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'charge-failure', className: 'block text-sm font-medium mb-1' } as any, 'Failure / Dereliction of Duty'),
                    React.createElement('textarea', { id: 'charge-failure', name: 'failure', value: failure, onChange: (e) => setFailure(e.target.value), className: 'form-textarea', rows: 3, required: true } as any)
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'charge-expected-action', className: 'block text-sm font-medium mb-1' } as any, 'Required Action Not Taken'),
                    React.createElement('textarea', { id: 'charge-expected-action', name: 'expectedAction', value: expectedAction, onChange: (e) => setExpectedAction(e.target.value), className: 'form-textarea', rows: 2, required: true } as any)
                ),
                 React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'charge-impact-score', className: 'block text-sm font-medium mb-1 flex justify-between items-center' } as any, 
                        React.createElement('span', null, 'Impact Score'),
                        React.createElement('div', {className: 'flex items-center gap-2'},
                            React.createElement('button', {type: 'button', onClick: handleSuggestImpact, disabled: isSuggestingImpact || !isAiAvailable, className: 'btn btn-secondary btn-sm p-1 h-6 w-6 text-xs'}, isSuggestingImpact ? React.createElement(Spinner, {size: 'fa-xs'}) : React.createElement('i', {className: 'fa-solid fa-brain'})),
                            React.createElement('span', { className: 'font-bold' }, impactScore)
                        )
                    ),
                    React.createElement('input', { id: 'charge-impact-score', name: 'impactScore', type: 'range', min: '1', max: '10', value: impactScore, onChange: (e) => setImpactScore(Number(e.target.value)), className: 'w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer' } as any),
                    impactJustification && React.createElement('p', {className: 'text-xs italic text-text-secondary mt-1 animate-fade-in'}, `AI Justification: ${impactJustification}`)
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'charge-evidence', className: 'block text-sm font-medium mb-1' } as any, 'Link Evidence'),
                    React.createElement('select', { id: 'charge-evidence', name: 'evidence', value: evidenceId, onChange: (e) => setEvidenceId(e.target.value), className: 'form-select' } as any,
                        React.createElement('option', { value: '' }, 'None'),
                        evidenceData.map(e => React.createElement('option', { key: e.id, value: e.id.toString() }, e.fileName))
                    )
                ),
                React.createElement('button', { type: 'submit', className: 'btn btn-primary w-full' }, 'Add Charge')
            )
        ),
        React.createElement(Modal, { isOpen: isSummaryModalOpen, onClose: () => setIsSummaryModalOpen(false) },
            React.createElement('h2', { id: 'modal-title', className: 'text-xl font-bold mb-4' }, 'Generated Complaint Summary'),
            React.createElement(MarkdownRenderer, { markdownText: summary })
        ),
        React.createElement(EditChargeModal, { 
            isOpen: isEditModalOpen, 
            onClose: () => setIsEditModalOpen(false), 
            entry: editingEntry, 
            onSave: handleSaveEdit 
        })
    );
}
