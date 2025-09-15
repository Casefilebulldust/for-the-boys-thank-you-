

import React, { useState } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { suggestFollowUpEmail } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import EmptyState from './EmptyState.tsx';
import Modal from './Modal.tsx';
import Spinner from './Spinner.tsx';
import { ActionItem } from '../services/types.ts';

const EditActionItemModal = ({ isOpen, onClose, item, onSave }) => {
    const [formData, setFormData] = useState(item);

    React.useEffect(() => {
        setFormData(item);
    }, [item]);

    if (!isOpen || !formData) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return React.createElement(Modal, { isOpen, onClose },
        React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
            React.createElement('h2', { className: 'text-xl font-bold' }, item.id ? 'Edit Action Item' : 'New Action Item'),
            React.createElement('input', { type: 'text', name: 'to', value: formData.to, onChange: handleChange, placeholder: 'To:', className: 'form-input', required: true }),
            React.createElement('input', { type: 'text', name: 'subject', value: formData.subject, onChange: handleChange, placeholder: 'Subject:', className: 'form-input', required: true }),
            React.createElement('textarea', { name: 'body', value: formData.body, onChange: handleChange, placeholder: 'Body...', rows: 8, className: 'form-textarea', required: true }),
            React.createElement('div', null, 
                React.createElement('label', {htmlFor: 'status', className: 'block text-sm font-medium mb-1'}, 'Status'),
                React.createElement('select', { id: 'status', name: 'status', value: formData.status, onChange: handleChange, className: 'form-select' },
                    ['Draft', 'Sent', 'Awaiting Reply', 'Complete'].map(s => React.createElement('option', {key: s, value: s}, s))
                )
            ),
            React.createElement('div', { className: 'flex justify-end gap-2 pt-2' },
                React.createElement('button', { type: 'button', onClick: onClose, className: 'btn btn-secondary' }, 'Cancel'),
                React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Save')
            )
        )
    );
};

export default function ActionTracker() {
    const { isAiAvailable, actionItems, addActionItem, updateById, deleteById, promptSettings } = useSpudHub();
    const { addToast } = useToast();
    const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
    const [followUpEmail, setFollowUpEmail] = useState(null);
    const [followUpSourceAction, setFollowUpSourceAction] = useState<ActionItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const statusColors = {
        'Draft': 'bg-amber-500/20 text-amber-300',
        'Sent': 'bg-lime-500/20 text-lime-300',
        'Awaiting Reply': 'bg-sky-500/20 text-sky-300',
        'Complete': 'bg-neutral-500/30 text-neutral-400'
    };

    const handleEdit = (action) => {
        setEditingItem(action);
        setIsEditModalOpen(true);
    };

    const handleNew = () => {
        setEditingItem({ to: '', subject: '', body: '', status: 'Draft' } as ActionItem);
        setIsEditModalOpen(true);
    };

    const handleSave = (itemData) => {
        if (itemData.id) {
            updateById('actionItems', itemData.id, itemData);
            addToast("Action item updated.", "success");
        } else {
            addActionItem(itemData);
        }
    };
    
    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this action item?")) {
            deleteById('actionItems', id);
            addToast("Action item deleted.", "success");
        }
    };

    const handleSuggestFollowUp = async (action) => {
        if (!isAiAvailable) {
            addToast('AI features require an API key to be set.', 'error');
            return;
        }
        setFollowUpSourceAction(action);
        setIsLoading(true);
        setIsFollowUpModalOpen(true);
        setFollowUpEmail(null);
        try {
            const result = await suggestFollowUpEmail(action, promptSettings.suggestFollowUpEmail);
            setFollowUpEmail(result);
        } catch(e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Suggestion Error: ${error.message}`, 'error');
            setIsFollowUpModalOpen(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text).then(() => {
            addToast(`${type} copied to clipboard.`, 'success');
        }, (err) => {
            addToast(`Failed to copy text: ${err}`, 'error');
        });
    };

    const handleUseDraft = () => {
        if (followUpEmail && followUpSourceAction) {
            handleEdit({
                ...followUpSourceAction,
                subject: followUpEmail.subject,
                body: followUpEmail.body,
                status: 'Draft',
            });
            setIsFollowUpModalOpen(false);
            setFollowUpEmail(null);
            setFollowUpSourceAction(null);
        }
    };
    
    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Action Tracker', icon: 'fa-tasks' },
            React.createElement('button', { onClick: handleNew, className: 'btn btn-primary'}, React.createElement('i', {className: 'fa-solid fa-plus mr-2'}), 'New Action Item')
        ),
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
                                React.createElement('button', { onClick: () => handleEdit(action), className: 'btn btn-secondary btn-sm' }, 'Details')
                            )
                        ),
                        React.createElement('p', {className: 'text-sm text-text-secondary mt-2 truncate'}, action.body),
                        React.createElement('div', {className: 'mt-2 pt-2 border-t border-border-primary/50 flex justify-between items-center'},
                            action.status === 'Awaiting Reply' && React.createElement('button', {onClick: () => handleSuggestFollowUp(action), className: 'btn btn-secondary btn-sm text-xs'}, React.createElement('i', {className: 'fa-solid fa-wand-magic-sparkles mr-2'}), 'Suggest Follow-up'),
                             React.createElement('div', {className: 'flex-grow'}), // Spacer
                             React.createElement('button', { onClick: () => handleDelete(action.id), className: 'btn btn-secondary btn-sm p-2 w-8 h-8 text-danger-primary ml-auto'}, React.createElement('i', {className: 'fa-solid fa-trash'}))
                        )
                    )
                }))
            ) : React.createElement(EmptyState, { icon: 'fa-check-double', title: 'All Actions Complete', message: 'No pending action items. New actions can be generated from the Intake Hub or created manually.' })
        ),
        React.createElement(EditActionItemModal, {
            isOpen: isEditModalOpen,
            onClose: () => setIsEditModalOpen(false),
            item: editingItem,
            onSave: handleSave
        }),
        React.createElement(Modal, { isOpen: isFollowUpModalOpen, onClose: () => setIsFollowUpModalOpen(false) }, 
            React.createElement('h2', {id: 'modal-title', className: 'text-xl font-bold mb-4'}, 'AI-Suggested Follow-up'),
            isLoading ? React.createElement(Spinner, {}) :
            followUpEmail && React.createElement('div', { className: 'space-y-4' },
                React.createElement('div', null, 
                    React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                        React.createElement('label', {className: 'text-sm font-medium text-text-secondary'}, 'Subject'),
                        React.createElement('button', { type: 'button', onClick: () => handleCopyToClipboard(followUpEmail.subject, 'Subject'), className: 'btn btn-secondary btn-sm text-xs py-0.5' }, 'Copy')
                    ),
                    React.createElement('input', {type: 'text', readOnly: true, value: followUpEmail.subject, className: 'form-input'})
                ),
                React.createElement('div', null, 
                    React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                        React.createElement('label', {className: 'text-sm font-medium text-text-secondary'}, 'Body'),
                        React.createElement('button', { type: 'button', onClick: () => handleCopyToClipboard(followUpEmail.body, 'Body'), className: 'btn btn-secondary btn-sm text-xs py-0.5' }, 'Copy')
                    ),
                    React.createElement('textarea', {readOnly: true, defaultValue: followUpEmail.body, className: 'form-textarea', rows: 10})
                ),
                React.createElement('div', { className: 'flex justify-end gap-2 mt-4' },
                    React.createElement('button', { type: 'button', onClick: () => setIsFollowUpModalOpen(false), className: 'btn btn-secondary' }, 'Cancel'),
                    React.createElement('button', { type: 'button', onClick: handleUseDraft, className: 'btn btn-primary' }, 'Use This Draft')
                )
            )
        )
    );
}