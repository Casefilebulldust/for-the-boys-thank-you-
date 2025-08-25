

import React, { useState, useMemo } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import PageTitle from './PageTitle.tsx';
import EmptyState from './EmptyState.tsx';
import Spinner from './Spinner.tsx';
import Modal from './Modal.tsx';
import StatCard from './StatCard.tsx';
import { EvidenceEntities } from '../services/types.ts';

const EntityTag = ({ type, value }) => {
    const icons = {
        dates: 'fa-calendar-alt',
        names: 'fa-user',
        refs: 'fa-hashtag',
        orgs: 'fa-building',
    };
    return React.createElement('div', { className: 'tag' },
        React.createElement('i', { className: `fa-solid ${icons[type]} mr-2 text-accent-primary` }),
        value
    );
};

const EvidenceCard = ({ item, linkedStrategyIds, linkedChargeIds }) => {
    const hasEntities = Object.values(item.entities || {}).some((arr: string[]) => arr.length > 0);
    const isLinkedToStrategy = linkedStrategyIds.has(item.id);
    const isLinkedToCharge = linkedChargeIds.has(item.id);
    
    const fileTypeIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        switch (extension) {
            case 'pdf': return 'fa-file-pdf';
            case 'zip': return 'fa-file-archive';
            case 'png': case 'jpg': case 'jpeg': case 'gif': return 'fa-file-image';
            default: return 'fa-file-alt';
        }
    };

    return React.createElement('div', { className: 'glass-card p-4 flex flex-col h-full transition-all duration-200 hover:border-accent-primary/50' },
        React.createElement('div', { className: 'flex items-start' },
            React.createElement('i', { className: `fa-solid ${fileTypeIcon(item.fileName)} text-3xl mr-4`, style: { color: 'var(--accent-primary)' } }),
            React.createElement('div', { className: 'flex-1' },
                React.createElement('p', { className: 'font-semibold text-text-primary break-all' }, item.fileName)
            ),
             React.createElement('div', { className: 'flex items-center gap-3 ml-2' },
                isLinkedToStrategy && React.createElement('i', { className: 'fa-solid fa-chess-board text-info-primary', title: 'Linked to Case Strategy' }),
                isLinkedToCharge && React.createElement('i', { className: 'fa-solid fa-gavel text-danger-primary', title: 'Linked to Accountability Citadel' }),
                React.createElement('button', {
                    onClick: () => alert("This is a record of a file on your computer. Spud Hub OS does not store the file itself for your privacy and security. Your original file is safe where you saved it."),
                    className: 'text-text-secondary hover:text-accent-primary transition-colors',
                    'aria-label': 'File storage information'
                }, React.createElement('i', { className: 'fa-solid fa-circle-info' }))
            )
        ),
        React.createElement('p', { className: 'text-sm text-text-secondary mt-2 flex-grow min-h-[4rem]' }, item.description),
        ((item.tags && item.tags.length > 0) || hasEntities) && React.createElement('div', { className: 'mt-auto pt-3 border-t border-border-primary flex flex-wrap gap-2' },
            item.entities && Object.entries(item.entities).map(([type, values]) =>
                (values as string[]).map(value => React.createElement(EntityTag, { key: `${type}-${value}`, type, value }))
            ),
            item.tags && item.tags.map(tag => React.createElement('div', { key: tag, className: 'tag bg-bg-secondary' }, tag))
        )
    );
};


export default function EvidenceLocker() {
    const { evidenceData, addEvidence, geminiApiKey, strategyData, accountabilityEntries } = useSpudHub();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fileName, setFileName] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('date-desc');

    const linkedStrategyIds = useMemo(() => new Set(strategyData.flatMap(g => g.arguments.flatMap(a => a.evidenceIds))), [strategyData]);
    const linkedChargeIds = useMemo(() => new Set(accountabilityEntries.map(c => c.evidenceId).filter(Boolean)), [accountabilityEntries]);
    const totalLinked = useMemo(() => {
        const allLinked = new Set([...linkedStrategyIds, ...linkedChargeIds]);
        return allLinked.size;
    }, [linkedStrategyIds, linkedChargeIds]);

    const filteredAndSortedEvidence = useMemo(() => {
        return evidenceData
            .filter(item => {
                const search = searchTerm.toLowerCase();
                return item.fileName.toLowerCase().includes(search) ||
                       item.description.toLowerCase().includes(search) ||
                       (item.tags && item.tags.some(tag => tag.toLowerCase().includes(search)));
            })
            .sort((a, b) => {
                switch (sortOrder) {
                    case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
                    case 'name-asc': return a.fileName.localeCompare(b.fileName);
                    case 'name-desc': return b.fileName.localeCompare(a.fileName);
                    case 'date-desc':
                    default:
                        return new Date(b.date).getTime() - new Date(a.date).getTime();
                }
            });
    }, [evidenceData, searchTerm, sortOrder]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (fileName && description) {
            setIsProcessing(true);
            try {
                const userTags = tags.split(',').map(t => t.trim()).filter(Boolean);
                await addEvidence(fileName, description, new Date().toISOString(), userTags);
                setFileName('');
                setDescription('');
                setTags('');
                setIsModalOpen(false);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleFileNameChange = (e) => setFileName(e.target.value);
    const handleDescriptionChange = (e) => setDescription(e.target.value);
    const handleTagsChange = (e) => setTags(e.target.value);

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Evidence Locker', icon: 'fa-boxes-stacked' },
            React.createElement('button', { onClick: () => setIsModalOpen(true), className: 'btn btn-primary' },
                React.createElement('i', { className: 'fa-solid fa-plus mr-2' }),
                'Add Evidence'
            )
        ),
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6' },
             React.createElement(StatCard, { icon: 'fa-boxes-stacked', label: 'Total Evidence Items', value: evidenceData.length, colorClass: 'text-accent-primary' }),
             React.createElement(StatCard, { icon: 'fa-link', label: 'Total Linked Items', value: totalLinked, colorClass: 'text-info-primary' }),
             React.createElement(StatCard, { icon: 'fa-lightbulb', label: 'Awaiting Links', value: evidenceData.length - totalLinked, colorClass: 'text-warning-primary' })
        ),
        React.createElement('div', { className: 'glass-card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center' },
            React.createElement('div', { className: 'relative flex-grow w-full sm:w-auto' },
                React.createElement('i', { className: 'fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary' }),
                React.createElement('input', { 
                    type: 'text', 
                    placeholder: 'Search evidence...', 
                    value: searchTerm, 
                    onChange: e => setSearchTerm(e.target.value), 
                    className: 'form-input pl-10' 
                })
            ),
            React.createElement('select', { 
                value: sortOrder, 
                onChange: e => setSortOrder(e.target.value), 
                className: 'form-select w-full sm:w-auto' 
            },
                React.createElement('option', { value: 'date-desc' }, 'Sort by Newest'),
                React.createElement('option', { value: 'date-asc' }, 'Sort by Oldest'),
                React.createElement('option', { value: 'name-asc' }, 'Sort by Name (A-Z)'),
                React.createElement('option', { value: 'name-desc' }, 'Sort by Name (Z-A)')
            )
        ),
        filteredAndSortedEvidence.length > 0 ? (
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' },
                filteredAndSortedEvidence.map(item => React.createElement(EvidenceCard, { 
                    key: item.id, 
                    item: item,
                    linkedStrategyIds,
                    linkedChargeIds
                }))
            )
        ) : (
            React.createElement(EmptyState, { icon: 'fa-folder-open', title: 'No Evidence Found', message: 'No evidence matches your search, or the locker is empty. Add new records by clicking the "Add Evidence" button.', children: null })
        ),
        React.createElement(Modal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false) },
            React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
                React.createElement('h2', { className: 'text-xl font-semibold' }, 'Add New Evidence'),
                !geminiApiKey && React.createElement('div', {className: 'p-3 text-xs bg-warning-primary/10 text-warning-primary rounded-md border border-warning-primary/20'}, 'Warning: No API key found. AI entity extraction will be disabled.'),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'fileNameModal', className: 'block text-sm font-medium mb-1' }, 'File Name / Identifier'),
                    React.createElement('input', { id: 'fileNameModal', type: 'text', value: fileName, onChange: handleFileNameChange, className: 'form-input', placeholder: 'e.g., Medical_Report_2025-08-15.pdf', required: true })
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'descriptionModal', className: 'block text-sm font-medium mb-1' }, 'Description'),
                    React.createElement('textarea', { id: 'descriptionModal', value: description, onChange: handleDescriptionChange, className: 'form-textarea', rows: 4, placeholder: 'Briefly describe what this evidence proves. Be detailed to help the AI extract entities.', required: true })
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'tagsModal', className: 'block text-sm font-medium mb-1' }, 'Tags (Optional, comma-separated)'),
                    React.createElement('input', { id: 'tagsModal', type: 'text', value: tags, onChange: handleTagsChange, className: 'form-input', placeholder: 'e.g., DVO, Medical, School' })
                ),
                React.createElement('div', {className: 'flex justify-end gap-2 pt-4'},
                    React.createElement('button', { type: 'button', onClick: () => setIsModalOpen(false), className: 'btn btn-secondary' }, 'Cancel'),
                    React.createElement('button', { type: 'submit', className: 'btn btn-primary', disabled: isProcessing },
                        isProcessing ? React.createElement(Spinner, {size: 'fa-sm'}) : null,
                        isProcessing ? 'Processing...' : 'Add Evidence Record'
                    )
                )
            )
        )
    );
}