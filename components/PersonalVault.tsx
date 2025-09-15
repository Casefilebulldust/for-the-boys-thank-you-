import React, { useState, useMemo } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import PageTitle from './PageTitle.tsx';
import EmptyState from './EmptyState.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import { PersonalVaultEntry } from '../services/types.ts';

export default function PersonalVault() {
    const { personalVaultData, addPersonalVaultEntry, updatePersonalVaultEntry, deletePersonalVaultEntry } = useSpudHub();
    const { addToast } = useToast();
    const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState({ title: '', content: '' });

    const sortedEntries = useMemo(() => 
        [...personalVaultData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
        [personalVaultData]
    );
    
    const selectedEntry = useMemo(() => 
        sortedEntries.find(entry => entry.id === selectedEntryId), 
        [sortedEntries, selectedEntryId]
    );

    React.useEffect(() => {
        if (sortedEntries.length > 0 && !selectedEntryId) {
            setSelectedEntryId(sortedEntries[0].id);
        }
        if (sortedEntries.length === 0) {
            setSelectedEntryId(null);
        }
    }, [sortedEntries, selectedEntryId]);

    const handleSelectEntry = (id: number) => {
        setIsEditing(false);
        setSelectedEntryId(id);
    };

    const handleNewEntry = () => {
        setIsEditing(true);
        setEditContent({ title: 'New Entry', content: '' });
        setSelectedEntryId(null);
    };

    const handleEdit = () => {
        if (selectedEntry) {
            setIsEditing(true);
            setEditContent({ title: selectedEntry.title, content: selectedEntry.content });
        }
    };
    
    const handleCancel = () => {
        setIsEditing(false);
        if (selectedEntry) {
            setEditContent({ title: selectedEntry.title, content: selectedEntry.content });
        }
    };

    const handleSave = () => {
        if (!editContent.title) {
            addToast("Title cannot be empty.", "error");
            return;
        }

        if (selectedEntryId && !selectedEntry) { // Was editing an existing entry that got deleted
             const newId = addPersonalVaultEntry(editContent.title, editContent.content);
             setSelectedEntryId(newId);
        } else if (selectedEntryId) { // Updating existing
            updatePersonalVaultEntry(selectedEntryId, editContent.title, editContent.content);
        } else { // Creating new
            const newId = addPersonalVaultEntry(editContent.title, editContent.content);
            setSelectedEntryId(newId);
        }
        setIsEditing(false);
    };
    
    const handleDelete = () => {
        if(selectedEntryId) {
            deletePersonalVaultEntry(selectedEntryId);
            setSelectedEntryId(null);
        }
    };

    const handleTitleChange = (e) => setEditContent(prev => ({ ...prev, title: e.target.value }));
    const handleContentChange = (e) => setEditContent(prev => ({ ...prev, content: e.target.value }));

    return (
        React.createElement('div', { className: 'animate-fade-in' },
            React.createElement(PageTitle, { title: 'Personal Vault', icon: 'fa-lock' }),
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-150px)]' },
                React.createElement('div', { className: 'md:col-span-1 glass-card p-4 flex flex-col' },
                    React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                        React.createElement('h2', { className: 'text-lg font-semibold' }, 'Entries'),
                        React.createElement('button', { onClick: handleNewEntry, className: 'btn btn-primary btn-sm' }, React.createElement('i', { className: 'fa-solid fa-plus' }))
                    ),
                    React.createElement('div', { className: 'flex-1 overflow-y-auto space-y-2' },
                        sortedEntries.map(entry =>
                            React.createElement('button', {
                                key: entry.id,
                                onClick: () => handleSelectEntry(entry.id),
                                className: `w-full text-left p-2 rounded-md transition-colors ${selectedEntryId === entry.id ? 'bg-accent-primary/20' : 'hover:bg-bg-tertiary'}`
                            },
                                React.createElement('p', { className: 'font-semibold text-sm truncate' }, entry.title),
                                React.createElement('p', { className: 'text-xs text-text-secondary' }, new Date(entry.date).toLocaleDateString())
                            )
                        )
                    )
                ),
                React.createElement('div', { className: 'md:col-span-2 glass-card p-6 flex flex-col' },
                    !selectedEntry && !isEditing ? 
                    React.createElement(EmptyState, { icon: 'fa-book-open', title: 'Select an Entry', message: 'Choose an entry from the list or create a new one.' }) :
                    isEditing ?
                    React.createElement('div', { className: 'flex flex-col h-full' },
                        React.createElement('input', { type: 'text', value: editContent.title, onChange: handleTitleChange, className: 'form-input mb-4 font-semibold text-lg' }),
                        React.createElement('textarea', { value: editContent.content, onChange: handleContentChange, className: 'form-textarea flex-1', placeholder: 'Your private thoughts...' }),
                        React.createElement('div', { className: 'flex justify-end gap-2 mt-4' },
                            React.createElement('button', { onClick: handleCancel, className: 'btn btn-secondary' }, 'Cancel'),
                            React.createElement('button', { onClick: handleSave, className: 'btn btn-primary' }, 'Save')
                        )
                    )
                     :
                    selectedEntry && React.createElement('div', { className: 'flex flex-col h-full' },
                        React.createElement('div', { className: 'flex justify-between items-start mb-4 pb-4 border-b border-border-primary' },
                            React.createElement('div', null, 
                                React.createElement('h2', { className: 'text-xl font-bold' }, selectedEntry.title),
                                React.createElement('p', { className: 'text-sm text-text-secondary' }, new Date(selectedEntry.date).toLocaleString())
                            ),
                            React.createElement('div', { className: 'flex gap-2' },
                                React.createElement('button', { onClick: handleEdit, className: 'btn btn-secondary' }, 'Edit'),
                                React.createElement('button', { onClick: handleDelete, className: 'btn btn-secondary text-danger-primary' }, 'Delete')
                            )
                        ),
                        React.createElement('div', { className: 'flex-1 overflow-y-auto' },
                            React.createElement(MarkdownRenderer, { markdownText: selectedEntry.content })
                        )
                    )
                )
            )
        )
    );
}