import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { marked } from 'marked';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { suggestNextStepForChild, generateFamilyBriefing } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import Spinner from './Spinner.tsx';
import EmptyState from './EmptyState.tsx';
import Modal from './Modal.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import { Child, ChildAdvocacyItem, GratitudeEntry, Supporter } from '../services/types.ts';
import { defaultPrompts } from '../constants.ts';

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
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (entry) {
            setTitle(entry.title);
            setContent(entry.content);
        } else {
            setTitle('');
            setContent('');
        }
    }, [entry, isOpen]);

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
                React.createElement('button', { type: 'button', onClick: onClose, className: 'btn btn-secondary' }, 'Cancel'),
                React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Save Entry')
            )
        )
    );
};

const GratitudeJournal = ({ supporter }: { supporter: Supporter }) => {
    const { familyData, addGratitudeEntry, updateGratitudeEntry, deleteGratitudeEntry } = useSpudHub();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<GratitudeEntry | null>(null);

    const journalEntries = useMemo(() => familyData.gratitudeJournal
        .filter(entry => entry.supporterId === supporter.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [familyData.gratitudeJournal, supporter.id]
    );

    const handleSaveEntry = (data: { title: string, content: string }) => {
        if (editingEntry) {
            updateGratitudeEntry(editingEntry.id, data.title, data.content);
        } else {
            addGratitudeEntry(supporter.id, data.title, data.content);
        }
        setIsModalOpen(false);
        setEditingEntry(null);
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
                                React.createElement('button', { onClick: () => deleteGratitudeEntry(entry.id), className: 'btn btn-secondary btn-sm p-2 h-7 w-7 text-danger-primary' }, React.createElement('i', {className: 'fa-solid fa-trash text-xs'}))
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
    const { createMission, generateChildAdvocacyPlan, geminiApiKey, promptSettings } = useSpudHub();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState({ plan: false, suggestion: false });
    const [suggestion, setSuggestion] = useState('');

    const handleGeneratePlan = async () => {
        if (!geminiApiKey) return addToast("API Key is required to generate plans.", "error");
        setIsLoading(prev => ({ ...prev, plan: true }));
        try {
            await generateChildAdvocacyPlan(child.id);
        } finally {
            setIsLoading(prev => ({ ...prev, plan: false }));
        }
    };
    
    const handleGetSuggestion = async () => {
        if (!geminiApiKey) return addToast("API Key is required for suggestions.", "error");
        setIsLoading(prev => ({ ...prev, suggestion: true }));
        setSuggestion('');
        try {
            const result = await suggestNextStepForChild(geminiApiKey, child, promptSettings.suggestNextStepForChild);
            setSuggestion(result);
        } catch (e) {
            addToast(`Suggestion Error: ${e.message}`, "error");
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


export default function FamilyHub() {
    const spudHubData = useSpudHub();
    const { familyData } = spudHubData;
    const { addToast } = useToast();
    
    const initialProfile = familyData.children.length > 0
        ? { type: 'child', id: familyData.children[0].id }
        : familyData.supporters.length > 0
            ? { type: 'supporter', id: familyData.supporters[0].id }
            : null;

    const [activeProfile, setActiveProfile] = useState(initialProfile);
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
    const [briefingText, setBriefingText] = useState('');
    const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

    const profiles = useMemo(() => [
        ...familyData.children.map(c => ({ type: 'child', id: c.id, name: c.name })),
        ...familyData.supporters.map(s => ({ type: 'supporter', id: s.id, name: s.name }))
    ], [familyData.children, familyData.supporters]);
    
    const selectedProfileData = useMemo(() => {
        if (!activeProfile) return null;
        const source = activeProfile.type === 'child' ? familyData.children : familyData.supporters;
        return source.find(p => p.id === activeProfile.id);
    }, [activeProfile, familyData]);
    
    const handleGenerateBriefing = async () => {
        if (!spudHubData.geminiApiKey) {
            addToast('Please add your Gemini API key in System Settings.', 'error');
            return;
        }
        setIsGeneratingBriefing(true);
        try {
            const { promptSettings, geminiApiKey, ...caseData } = spudHubData;
            const result = await generateFamilyBriefing(geminiApiKey, caseData, promptSettings.generateFamilyBriefing);
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
        if (!selectedProfileData) {
            return React.createElement('div', { className: 'glass-card p-6' }, 
                React.createElement(EmptyState, { icon: 'fa-users-viewfinder', title: 'No Profiles Found', message: 'Family and supporter profiles will be shown here.' })
            );
        }
        if (activeProfile.type === 'child') {
            return React.createElement(ChildProfileView, { child: selectedProfileData });
        }
        if (activeProfile.type === 'supporter') {
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
                onClick: () => setActiveProfile({ type: profile.type, id: profile.id }),
                className: `px-4 py-2 text-lg font-semibold transition-all duration-200 border-b-2 -mb-0.5 ${
                    activeProfile && activeProfile.id === profile.id && activeProfile.type === profile.type
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
