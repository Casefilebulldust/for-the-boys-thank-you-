

import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { marked } from 'marked';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { suggestNextStepForChild, generateFamilyBriefing, draftGratitudeMessage } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import Spinner from './Spinner.tsx';
import EmptyState from './EmptyState.tsx';
import Modal from './Modal.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import { Child, GratitudeEntry, Supporter, AgendaItem } from '../services/types.ts';

const FamilyBriefingModal = ({ isOpen, onClose, briefingText }) => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        if (briefingText) {
            const briefingHtml = marked.parse(briefingText || '');
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>A Message For You</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap');
                        body { 
                            font-family: 'Nunito', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                            background-color: #1a183d;
                            color: #333; 
                            padding: 1rem; 
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                            margin: 0;
                        }
                        .note { 
                            max-width: 600px; 
                            width: 100%;
                            margin: auto; 
                            background-color: #fdfaee; 
                            padding: 2rem; 
                            border-radius: 8px; 
                            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                            border-top: 6px solid #f97316;
                        }
                        .note h1, .note h2, .note h3 {
                            color: #ea580c; 
                            display: flex;
                            align-items: center;
                            gap: 0.75rem;
                            margin-bottom: 1rem;
                        }
                        .note p {
                            font-size: 1.1rem;
                            line-height: 1.7;
                            margin-bottom: 1rem;
                        }
                    </style>
                </head>
                <body>
                    <div class="note">
                        <h3>
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style="color: #ea580c;"><path d="M12 4.248c-3.148-5.402-12-3.825-12 2.944 0 4.661 5.571 9.427 12 15.808 6.43-6.381 12-11.147 12-15.808 0-6.792-8.875-8.306-12-2.944z"/></svg>
                            A Message From Mum
                        </h3>
                        ${briefingHtml}
                    </div>
                </body>
                </html>
            `;
            const dataUrl = `data:text/html;charset=UTF-8,${encodeURIComponent(htmlContent)}`;
            
            QRCode.toDataURL(dataUrl, { width: 256 })
                .then(url => setQrCodeUrl(url))
                .catch(err => console.error(err));
        }
    }, [briefingText]);

    return React.createElement(Modal, { isOpen, onClose },
        React.createElement('h2', { className: 'text-xl font-bold mb-2' }, 'Family Briefing Preview'),
        React.createElement('p', { className: 'text-sm text-text-secondary mb-4' }, 'Here is the message for your boys. Scan the QR code on their device to show it to them.'),
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 items-center' },
            React.createElement('div', { className: 'flex flex-col items-center' },
                qrCodeUrl ? React.createElement('img', { src: qrCodeUrl, alt: 'QR code for family briefing', className: 'w-48 h-48 rounded-lg bg-white p-2' }) : React.createElement('div', {className: 'w-48 h-48 skeleton'}),
                React.createElement('p', { className: 'text-xs text-text-secondary mt-2 text-center' }, 'Scan Me')
            ),
            React.createElement('div', { className: 'md:col-span-2 bg-[#fdfaee] p-6 rounded-lg shadow-inner text-gray-800 h-64 overflow-y-auto' },
                React.createElement('h3', { className: 'text-2xl font-bold text-[#ea580c] mb-4', style: { fontFamily: "'Nunito', sans-serif" } }, "A Message From Mum"),
                React.createElement(MarkdownRenderer, { markdownText: briefingText, className: 'prose-p:text-gray-700 prose-strong:text-gray-900 prose-headings:text-gray-800 prose-blockquote:border-orange-400' })
            )
        )
    );
};

const GratitudeEntryModal = ({ isOpen, onClose, onSubmit, entry = null }) => {
    const spudHub = useSpudHub();
    const { addToast } = useToast();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isDrafting, setIsDrafting] = useState(false);

    useEffect(() => {
        if (entry) {
            setTitle(entry.title);
            setContent(entry.content);
        } else {
            setTitle('');
            setContent('');
        }
    }, [entry, isOpen]);

    const handleAiDraft = async () => {
        if (!spudHub.isAiAvailable) return addToast("API Key needed for AI drafts.", "error");
        setIsDrafting(true);
        try {
            const context = {
                completedMissions: spudHub.missions.filter(m => m.status === 'complete').slice(0,2).map(m => m.title),
                recentWellness: spudHub.wellnessLogs.filter(w => w.stress < 5).slice(0,1)
            };
            const result = await draftGratitudeMessage(JSON.stringify(context), spudHub.promptSettings.draftGratitudeMessage);
            setTitle(result.title);
            setContent(result.content);
        } catch(e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Drafting error: ${error.message}`, "error");
        } finally {
            setIsDrafting(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ title, content });
    };
    
    const handleTitleChange = (e) => setTitle(e.target.value);
    const handleContentChange = (e) => setContent(e.target.value);

    return React.createElement(Modal, { isOpen, onClose },
        React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
            React.createElement('h2', { className: 'text-xl font-bold' }, entry ? 'Edit Gratitude Entry' : 'New Gratitude Entry'),
            React.createElement('input', { type: 'text', value: title, onChange: handleTitleChange, placeholder: 'Title', className: 'form-input', required: true }),
            React.createElement('textarea', { value: content, onChange: handleContentChange, placeholder: 'Your message of thanks...', rows: 8, className: 'form-textarea', required: true }),
            React.createElement('div', { className: 'flex justify-end gap-2 pt-2' },
                React.createElement('button', { type: 'button', onClick: handleAiDraft, disabled: isDrafting, className: 'btn btn-secondary mr-auto'}, isDrafting ? React.createElement(Spinner, {size: 'fa-sm'}) : React.createElement(React.Fragment, null, React.createElement('i', {className: 'fa-solid fa-wand-magic-sparkles mr-2'}), 'AI Draft')),
                React.createElement('button', { type: 'button', onClick: onClose, className: 'btn btn-secondary' }, 'Cancel'),
                React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Save Entry')
            )
        )
    );
};

const GratitudeJournal = ({ supporter }: { supporter: Supporter }) => {
    const { familyData, setFamilyData } = useSpudHub();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<GratitudeEntry | null>(null);

    const journalEntries = useMemo(() => familyData.gratitudeJournal
        .filter(entry => entry.supporterId === supporter.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [familyData.gratitudeJournal, supporter.id]
    );

    const handleSaveEntry = (data: { title: string, content: string }) => {
        let newJournal;
        if (editingEntry) {
            newJournal = familyData.gratitudeJournal.map(e => e.id === editingEntry.id ? {...e, ...data} : e);
            addToast("Entry updated.", "success");
        } else {
            const newEntry = { id: Date.now(), supporterId: supporter.id, date: new Date().toISOString(), ...data };
            newJournal = [newEntry, ...familyData.gratitudeJournal];
            addToast("Entry added.", "success");
        }
        setFamilyData({...familyData, gratitudeJournal: newJournal});
        setIsModalOpen(false);
        setEditingEntry(null);
    };

    const handleDeleteEntry = (id) => {
        if(window.confirm("Are you sure you want to delete this entry?")) {
            const newJournal = familyData.gratitudeJournal.filter(e => e.id !== id);
            setFamilyData({...familyData, gratitudeJournal: newJournal});
            addToast("Entry deleted.", "success");
        }
    };

    const handleNewEntry = () => {
        setEditingEntry(null);
        setIsModalOpen(true);
    };

    const handleEditEntry = (entry: GratitudeEntry) => {
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'glass-card p-6' },
            React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                React.createElement('h2', { className: 'text-xl font-semibold' }, `Gratitude Journal for ${supporter.name}`),
                React.createElement('button', { onClick: handleNewEntry, className: 'btn btn-primary' }, React.createElement('i', {className: 'fa-solid fa-plus mr-2'}), 'New Entry')
            ),
            journalEntries.length > 0 ? (
                React.createElement('div', { className: 'space-y-4' }, journalEntries.map(entry =>
                    React.createElement('div', { key: entry.id, className: 'p-4 bg-bg-secondary rounded-lg' },
                        React.createElement('div', { className: 'flex justify-between items-start' },
                            React.createElement('div', null,
                                React.createElement('h3', { className: 'font-bold' }, entry.title),
                                React.createElement('p', { className: 'text-xs text-text-secondary' }, new Date(entry.date).toLocaleString())
                            ),
                            React.createElement('div', { className: 'flex gap-2' },
                                React.createElement('button', { onClick: () => handleEditEntry(entry), className: 'btn btn-secondary btn-sm p-2 h-7 w-7' }, React.createElement('i', {className: 'fa-solid fa-pencil text-xs'})),
                                React.createElement('button', { onClick: () => handleDeleteEntry(entry.id), className: 'btn btn-secondary btn-sm p-2 h-7 w-7 text-danger-primary' }, React.createElement('i', {className: 'fa-solid fa-trash text-xs'}))
                            )
                        ),
                        React.createElement(MarkdownRenderer, { markdownText: entry.content, className: 'mt-3' })
                    )
                ))
            ) : (
                React.createElement(EmptyState, {
                    icon: 'fa-heart',
                    title: 'Start Your Journal',
                    message: `This is a space to acknowledge the support Ben provides. Click 'New Entry' to write your first note of gratitude.`
                })
            )
        ),
        React.createElement(GratitudeEntryModal, {
            isOpen: isModalOpen,
            onClose: () => setIsModalOpen(false),
            onSubmit: handleSaveEntry,
            entry: editingEntry
        })
    );
};

const ChildProfileView = ({ child }: { child: Child }) => {
    const { createMission, generateChildAdvocacyPlan, isAiAvailable, promptSettings } = useSpudHub();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState({ plan: false, suggestion: false });
    const [suggestion, setSuggestion] = useState('');

    const handleGeneratePlan = async () => {
        if (!isAiAvailable) return addToast("API Key is required to generate plans.", "error");
        setIsLoading(prev => ({ ...prev, plan: true }));
        try {
            await generateChildAdvocacyPlan(child.id);
        } finally {
            setIsLoading(prev => ({ ...prev, plan: false }));
        }
    };
    
    const handleGetSuggestion = async () => {
        if (!isAiAvailable) return addToast("API Key is required for suggestions.", "error");
        setIsLoading(prev => ({ ...prev, suggestion: true }));
        setSuggestion('');
        try {
            const result = await suggestNextStepForChild(child, promptSettings.suggestNextStepForChild);
            setSuggestion(result);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Suggestion Error: ${error.message}`, "error");
        } finally {
            setIsLoading(prev => ({ ...prev, suggestion: false }));
        }
    };

    return React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },
        React.createElement('div', { className: 'glass-card p-6' },
            React.createElement('h2', { className: 'text-xl font-semibold' }, `${child.name}'s Profile`),
            React.createElement('p', { className: 'text-sm text-text-secondary' }, `Age ${child.age} - Status: ${child.status}`),
            React.createElement('div', { className: 'mt-4 border-t border-border-primary pt-4' },
                React.createElement('strong', { className: 'text-sm' }, 'Documented Needs:'),
                React.createElement('ul', { className: 'list-disc list-inside text-sm text-text-primary mt-1 space-y-1' },
                    child.needs.map(need => React.createElement('li', { key: need }, need))
                )
            ),
            React.createElement('div', { className: 'mt-4 border-t border-border-primary pt-4' },
                suggestion && React.createElement('div', { className: 'p-3 bg-accent-primary/10 rounded-md text-sm mb-3 animate-fade-in' },
                    React.createElement('strong', { className: 'text-accent-primary' }, 'SpudBud Suggests: '),
                    suggestion
                ),
                React.createElement('button', { onClick: handleGetSuggestion, disabled: isLoading.suggestion, className: 'btn btn-secondary' },
                    isLoading.suggestion ? React.createElement(Spinner, {}) : React.createElement(React.Fragment, null, React.createElement('i', {className: 'fa-solid fa-lightbulb mr-2'}), 'Suggest Next Step')
                )
            )
        ),
        React.createElement('div', { className: 'glass-card p-6' },
            React.createElement('h2', { className: 'text-xl font-semibold mb-3' }, 'Advocacy Plan'),
            child.advocacyPlan && child.advocacyPlan.length > 0 ? (
                React.createElement('ul', { className: 'space-y-2' }, child.advocacyPlan.map(item =>
                    React.createElement('li', { key: item.id, className: 'p-3 bg-bg-secondary rounded-md flex justify-between items-center' },
                        React.createElement('span', { className: 'text-sm' }, item.goal),
                        React.createElement('button', { onClick: () => createMission(item.goal), className: 'btn btn-secondary btn-sm', title: 'Create Mission from this Goal' }, React.createElement('i', { className: 'fa-solid fa-bullseye' }))
                    )
                ))
            ) : (
                React.createElement(EmptyState, {
                    icon: 'fa-wand-magic-sparkles',
                    title: 'No Advocacy Plan',
                    message: "Generate a new AI-powered advocacy plan based on this child's needs.",
                    children: React.createElement('button', { onClick: handleGeneratePlan, disabled: isLoading.plan, className: 'btn btn-primary mt-4' },
                        isLoading.plan ? React.createElement(Spinner, {}) : 'Generate Plan'
                    )
                })
            )
        )
    );
};

const AgendaView = () => {
    const { familyData, setFamilyData } = useSpudHub();
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemTime, setNewItemTime] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    const handleAddItem = (e) => {
        e.preventDefault();
        if(!newItemTitle) return;
        const newItem: AgendaItem = {
            id: Date.now(),
            title: newItemTitle,
            time: newItemTime,
            isUrgent: isUrgent
        };
        const newAgenda = [newItem, ...familyData.agenda];
        setFamilyData({...familyData, agenda: newAgenda});
        setNewItemTitle('');
        setNewItemTime('');
        setIsUrgent(false);
    };
    
    const handleDeleteItem = (id) => {
        const newAgenda = familyData.agenda.filter(item => item.id !== id);
        setFamilyData({...familyData, agenda: newAgenda});
    };

    return React.createElement('div', {className: 'glass-card p-6'},
        React.createElement('h2', {className: 'text-xl font-semibold mb-4'}, 'Family Agenda'),
        React.createElement('form', {onSubmit: handleAddItem, className: 'flex gap-2 mb-4'},
            React.createElement('input', {type: 'text', value: newItemTitle, onChange: e => setNewItemTitle(e.target.value), className: 'form-input flex-grow', placeholder: 'New agenda item...', required: true}),
            React.createElement('input', {type: 'text', value: newItemTime, onChange: e => setNewItemTime(e.target.value), className: 'form-input w-32', placeholder: 'Time/Date'}),
            React.createElement('label', {className: 'flex items-center gap-2 cursor-pointer text-sm p-2 rounded-md hover:bg-bg-tertiary'}, 
                React.createElement('input', {type: 'checkbox', checked: isUrgent, onChange: e => setIsUrgent(e.target.checked), className: 'form-checkbox'}),
                'Urgent'
            ),
            React.createElement('button', {type: 'submit', className: 'btn btn-primary'}, 'Add')
        ),
        familyData.agenda.length > 0 ? (
            React.createElement('ul', {className: 'space-y-2'}, familyData.agenda.map(item =>
                React.createElement('li', {key: item.id, className: `p-3 rounded-md flex justify-between items-center ${item.isUrgent ? 'bg-danger-primary/10' : 'bg-bg-secondary'}`},
                    React.createElement('div', null, 
                        React.createElement('p', {className: 'font-semibold'}, item.title),
                        React.createElement('p', {className: 'text-xs text-text-secondary'}, item.time)
                    ),
                    React.createElement('button', {onClick: () => handleDeleteItem(item.id), className: 'btn btn-secondary btn-sm p-2 w-7 h-7 text-danger-primary'}, React.createElement('i', {className: 'fa-solid fa-trash text-xs'}))
                )
            ))
        ) : React.createElement(EmptyState, {icon: 'fa-calendar-check', title: 'Agenda is Clear', message: 'Add a new item to get started.'})
    )
};


export default function FamilyHub() {
    const spudHubData = useSpudHub();
    const { familyData, isAiAvailable } = spudHubData;
    const { addToast } = useToast();
    
    const initialProfile = 'agenda';

    const [activeTab, setActiveTab] = useState(initialProfile);
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
    const [briefingText, setBriefingText] = useState('');
    const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

    const profiles = useMemo(() => [
        { type: 'agenda', id: 'agenda', name: 'Agenda' },
        ...familyData.children.map(c => ({ type: 'child', id: c.id, name: c.name })),
        ...familyData.supporters.map(s => ({ type: 'supporter', id: s.id, name: s.name }))
    ], [familyData.children, familyData.supporters]);
    
    const selectedProfileData = useMemo(() => {
        if (!activeTab || activeTab === 'agenda') return null;
        const [type, id] = activeTab.split('-');
        const source = type === 'child' ? familyData.children : familyData.supporters;
        return source.find(p => p.id === Number(id));
    }, [activeTab, familyData]);
    
    const handleGenerateBriefing = async () => {
        if (!isAiAvailable) {
            addToast('AI features require an API key to be set.', 'error');
            return;
        }
        setIsGeneratingBriefing(true);
        try {
            const { promptSettings, isAiAvailable, ...caseData } = spudHubData;
            const result = await generateFamilyBriefing(caseData, promptSettings.generateFamilyBriefing);
            setBriefingText(result);
            setIsBriefingModalOpen(true);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Briefing Generation Error: ${error.message}`, 'error');
        } finally {
            setIsGeneratingBriefing(false);
        }
    };

    const renderProfileContent = () => {
        if (activeTab === 'agenda') {
            return React.createElement(AgendaView);
        }
        if (!selectedProfileData) {
            return React.createElement('div', { className: 'glass-card p-6' }, 
                React.createElement(EmptyState, { icon: 'fa-users-viewfinder', title: 'Select a Profile', message: 'Choose a profile from the tabs above.' })
            );
        }
        const [type] = activeTab.split('-');
        if (type === 'child') {
            return React.createElement(ChildProfileView, { child: selectedProfileData });
        }
        if (type === 'supporter') {
            return React.createElement(GratitudeJournal, { supporter: selectedProfileData });
        }
        return null;
    };

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Family Hub', icon: 'fa-users' },
            React.createElement('button', { onClick: handleGenerateBriefing, disabled: isGeneratingBriefing, className: 'btn btn-primary' },
                isGeneratingBriefing ? React.createElement(Spinner, {}) : React.createElement(React.Fragment, null, React.createElement('i', { className: 'fa-solid fa-paper-plane mr-2' }), 'Generate Family Briefing')
            )
        ),
        React.createElement('div', { className: 'mb-6 flex space-x-2 border-b-2 border-border-primary' },
            profiles.map(profile => React.createElement('button', {
                key: `${profile.type}-${profile.id}`,
                onClick: () => setActiveTab(`${profile.type}-${profile.id}`),
                className: `px-4 py-2 text-lg font-semibold transition-all duration-200 border-b-2 -mb-0.5 ${
                    activeTab === `${profile.type}-${profile.id}`
                        ? 'border-accent-primary text-accent-primary'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                }`
            }, profile.name))
        ),
        React.createElement('div', { className: 'animate-fade-in' },
            renderProfileContent()
        ),
        React.createElement(FamilyBriefingModal, {
            isOpen: isBriefingModalOpen,
            onClose: () => setIsBriefingModalOpen(false),
            briefingText: briefingText
        })
    );
}
