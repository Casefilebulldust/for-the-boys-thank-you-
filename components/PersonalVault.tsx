
import React, { useState, useEffect } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import PageTitle from './PageTitle.tsx';
import EmptyState from './EmptyState.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';

export default function PersonalVault() {
    const { personalVaultData, addPersonalVaultEntry, updatePersonalVaultEntry, deletePersonalVaultEntry } = useSpudHub();
    const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
    const [currentTitle, setCurrentTitle] = useState('');
    const [currentContent, setCurrentContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const sortedEntries = personalVaultData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    useEffect(() => {
        if (selectedEntryId === null && sortedEntries.length > 0) {
            setSelectedEntryId(sortedEntries[0].id);
        } else if (sortedEntries.length === 0) {
            setSelectedEntryId(null);
        }
    }, [sortedEntries, selectedEntryId]);
    
    useEffect(() => {
        const selected = sortedEntries.find(entry => entry.id === selectedEntryId);
        if (selected) {
            setCurrentTitle(selected.title);
            setCurrentContent(selected.content);
            setIsEditing(false);
        } else {
            setCurrentTitle('');
            setCurrentContent('');
            setIsEditing(false);
        }
    }, [selectedEntryId, sortedEntries]);

    const handleNewEntry = () => {
        const newId = addPersonalVaultEntry('New Note', '');
        setSelectedEntryId(newId);
        setIsEditing(true);
    };

    const handleSave = () => {
        if (selectedEntryId) {
            updatePersonalVaultEntry(selectedEntryId, currentTitle, currentContent);
            setIsEditing(false);
        }
    };

    const handleDelete = () => {
        if (selectedEntryId) {
            deletePersonalVaultEntry(selectedEntryId);
            setSelectedEntryId(null);
        }
    }
    
    const selectedEntry = sortedEntries.find(e => e.id === selectedEntryId);

    const handleTitleChange = (e) => setCurrentTitle(e.target.value);
    const handleContentChange = (e) => setCurrentContent(e.target.value);

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Personal Vault', icon: 'fa-lock' }),
        React.createElement('div', { className: 'p-4 glass-card bg-danger-primary/10 border-danger-primary/30 text-danger-primary mb-6' },
            React.createElement('h3', { className: 'font-bold flex items-center' }, 
                React.createElement('i', {className: 'fa-solid fa-triangle-exclamation mr-3'}),
                'Security Notice'
            ),
            React.createElement('p', { className: 'text-sm mt-1' }, 'The Personal Vault is for your private notes. All data is stored **only** on this computer in your browser\'s local storage. It is not encrypted. Do not store passwords or highly sensitive financial information here.')
        ),
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]' },
            React.createElement('div', { className: 'glass-card flex flex-col' },
                React.createElement('div', { className: 'p-4 border-b border-border-primary flex justify-between items-center' },
                    React.createElement('h2', { className: 'text-lg font-semibold' }, 'Vault Entries'),
                    React.createElement('button', { onClick: handleNewEntry, className: 'btn btn-primary btn-sm' }, React.createElement('i', {className: 'fa-solid fa-plus'}))
                ),
                React.createElement('div', { className: 'overflow-y-auto flex-1' },
                    sortedEntries.length > 0 ? React.createElement('ul', { className: 'divide-y divide-border-primary' }, sortedEntries.map(entry => 
                        React.createElement('li', { key: entry.id },
                            React.createElement('button', {
                                onClick: () => setSelectedEntryId(entry.id),
                                className: `w-full text-left p-4 transition-colors ${selectedEntryId === entry.id ? 'bg-accent-primary/20' : 'hover:bg-bg-secondary'}`
                            },
                                React.createElement('p', { className: 'font-semibold truncate' }, entry.title),
                                React.createElement('p', { className: 'text-xs text-text-secondary' }, new Date(entry.date).toLocaleString())
                            )
                        )
                    )) : React.createElement('div', { className: 'p-4 text-center' }, React.createElement(EmptyState, {icon: 'fa-file-circle-plus', title: 'Vault is Empty', message: 'Create your first private note.'}))
                )
            ),
            React.createElement('div', { className: 'lg:col-span-2 glass-card flex flex-col' },
                selectedEntry ? React.createElement(React.Fragment, null,
                    React.createElement('div', { className: 'p-4 border-b border-border-primary flex justify-between items-center flex-wrap gap-2' },
                        isEditing ? React.createElement('input', {
                            type: 'text',
                            value: currentTitle,
                            onChange: handleTitleChange,
                            className: 'form-input text-lg font-bold flex-1 bg-transparent border-border-secondary'
                        }) : React.createElement('h2', { className: 'text-lg font-bold' }, currentTitle),
                        React.createElement('div', { className: 'flex items-center gap-2' },
                            isEditing ? React.createElement('button', { onClick: handleSave, className: 'btn btn-primary' }, 'Save')
                                      : React.createElement('button', { onClick: () => setIsEditing(true), className: 'btn btn-secondary' }, 'Edit'),
                            React.createElement('button', { onClick: handleDelete, className: 'btn btn-secondary', style: {color: 'var(--danger-primary)'}}, React.createElement('i', {className: 'fa-solid fa-trash'}))
                        )
                    ),
                    React.createElement('div', { className: 'p-4 flex-1 overflow-y-auto' },
                        isEditing ? React.createElement('textarea', {
                            value: currentContent,
                            onChange: handleContentChange,
                            className: 'form-textarea w-full h-full bg-bg-secondary resize-none',
                            placeholder: 'Your private notes...'
                        }) : React.createElement(MarkdownRenderer, { markdownText: currentContent })
                    )
                ) : React.createElement('div', {className: 'flex items-center justify-center h-full'}, React.createElement(EmptyState, {icon: 'fa-arrow-left', title: 'Select or Create an Entry', message: 'Your notes will appear here.'}))
            )
        )
    );
}
