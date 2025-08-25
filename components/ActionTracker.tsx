
import React, { useState } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { suggestFollowUpEmail } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import EmptyState from './EmptyState.tsx';
import Modal from './Modal.tsx';
import Spinner from './Spinner.tsx';

export default function ActionTracker() {
    const { geminiApiKey, actionItems, updateActionItem, promptSettings } = useSpudHub();
    const { addToast } = useToast();
    const [editingId, setEditingId] = useState(null);
    const [currentBody, setCurrentBody] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [followUpEmail, setFollowUpEmail] = useState(null);
    const [isLoading, setIsLoading] = useState(false);


    const statusColors = {
        'Draft': 'bg-amber-500/20 text-amber-300',
        'Sent': 'bg-lime-500/20 text-lime-300',
        'Awaiting Reply': 'bg-sky-500/20 text-sky-300',
        'Complete': 'bg-neutral-500/30 text-neutral-400'
    };

    const handleEdit = (action) => {
        setEditingId(action.id);
        setCurrentBody(action.body);
    };

    const handleSave = (id) => {
        updateActionItem(id, 'body', currentBody);
        setEditingId(null);
    };
    
    const handleSuggestFollowUp = async (action) => {
        if (!geminiApiKey) {
            addToast('Please add your Gemini API key in System Settings.', 'error');
            return;
        }
        setIsLoading(true);
        setIsModalOpen(true);
        setFollowUpEmail(null);
        try {
            const result = await suggestFollowUpEmail(geminiApiKey, action, promptSettings.suggestFollowUpEmail);
            setFollowUpEmail(result);
        } catch(e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Suggestion Error: ${error.message}`, 'error');
            setIsModalOpen(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleBodyChange = (e) => setCurrentBody(e.target.value);

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Action Tracker', icon: 'fa-tasks' }),
        React.createElement('div', { className: 'glass-card' },
            actionItems.length > 0 ? (
                React.createElement('ul', { className: 'divide-y divide-border-primary' }, actionItems.map(action => {
                    const isOverdue = action.dueDate && new Date(action.dueDate) < new Date();
                    return React.createElement('li', { key: action.id, className: `p-4 transition-colors ${isOverdue ? 'bg-danger-primary/10' : ''}` },
                        React.createElement('div', { className: 'flex flex-col sm:flex-row justify-between sm:items-center' },
                            React.createElement('div', { className: 'flex-1 mb-2 sm:mb-0' },
                                React.createElement('p', { className: 'text-xs text-text-secondary' }, `To: ${action.to}`),
                                React.createElement('p', { className: 'font-semibold text-text-primary' }, action.subject)
                            ),
                            React.createElement('div', { className: 'flex items-center space-x-2' },
                                isOverdue && React.createElement('span', { className: 'tag bg-danger-primary/80 text-white font-bold'}, 'OVERDUE'),
                                React.createElement('span', { className: `text-xs font-semibold px-2 py-1 rounded-full ${statusColors[action.status]}` }, action.status),
                                editingId === action.id ?
                                    React.createElement('button', { onClick: () => handleSave(action.id), className: 'btn btn-primary btn-sm' }, 'Save') :
                                    React.createElement('button', { onClick: () => handleEdit(action), className: 'btn btn-secondary btn-sm' }, 'Edit')
                            )
                        ),
                        editingId === action.id ? React.createElement('div', { className: 'mt-4 animate-fade-in' },
                            React.createElement('textarea', {
                                value: currentBody,
                                onChange: handleBodyChange,
                                className: 'form-textarea w-full',
                                rows: 10
                            })
                        ) : (action.status === 'Awaiting Reply' && React.createElement('div', {className: 'mt-2 pt-2 border-t border-border-primary/50'},
                            React.createElement('button', {onClick: () => handleSuggestFollowUp(action), className: 'btn btn-secondary btn-sm text-xs'}, 'Suggest Follow-up')
                        ))
                    )
                }))
            ) : React.createElement(EmptyState, { icon: 'fa-check-double', title: 'All Actions Complete', message: 'No pending action items. New actions can be generated from the Intake Hub.' })
        ),
        React.createElement(Modal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false) }, 
            React.createElement('h2', {id: 'modal-title', className: 'text-xl font-bold mb-4'}, 'AI-Suggested Follow-up'),
            isLoading ? React.createElement(Spinner, {}) :
            followUpEmail && React.createElement('div', { className: 'space-y-4' },
                React.createElement('div', null, 
                    React.createElement('label', {className: 'block text-sm font-medium mb-1 text-text-secondary'}, 'Subject'),
                    React.createElement('input', {type: 'text', readOnly: true, value: followUpEmail.subject, className: 'form-input'})
                ),
                React.createElement('div', null, 
                    React.createElement('label', {className: 'block text-sm font-medium mb-1 text-text-secondary'}, 'Body'),
                    React.createElement('textarea', {readOnly: true, defaultValue: followUpEmail.body, className: 'form-textarea', rows: 10})
                )
            )
        )
    );
}
