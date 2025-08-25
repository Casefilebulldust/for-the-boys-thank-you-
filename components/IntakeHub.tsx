import React, { useState } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { analyzeDocument, analyzeEmail, analyzeQuickNote } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import Spinner from './Spinner.tsx';
import EmptyState from './EmptyState.tsx';

// A new sub-component to display analysis results cleanly
const AnalysisResults = ({ analysis, file, onActionClick }) => {
    if (!analysis) {
        return React.createElement(EmptyState, { icon: 'fa-file-circle-question', title: 'Awaiting Analysis', message: 'Upload a document, paste an email, or write a note, then click "Analyze" to see the results here.' });
    }

    const { summary, documentType, suggestedActions } = analysis;

    return React.createElement('div', { className: 'space-y-4 text-sm animate-fade-in' },
        React.createElement('div', null,
            React.createElement('strong', { className: 'text-accent-primary' }, 'Summary:'),
            React.createElement('p', { className: 'mt-1 text-text-primary' }, summary)
        ),
        documentType && React.createElement('div', null,
            React.createElement('strong', { className: 'text-accent-primary' }, 'Document Type: '),
            React.createElement('span', { className: 'tag' }, documentType)
        ),
        suggestedActions && suggestedActions.length > 0 && React.createElement('div', null,
            React.createElement('strong', { className: 'text-accent-primary' }, 'Suggested Actions:'),
            React.createElement('div', { className: 'space-y-2 mt-2' },
                suggestedActions.map((action, index) =>
                    React.createElement('button', { key: index, onClick: () => onActionClick(action, file), className: 'w-full text-left p-3 bg-bg-secondary rounded-md hover:bg-bg-tertiary transition-colors' },
                        React.createElement('div', { className: 'flex items-center' },
                            React.createElement('i', { className: `fa-solid ${action.type === 'create_evidence' ? 'fa-plus' : 'fa-paper-plane'} mr-3 text-accent-primary` }),
                            React.createElement('p', { className: 'font-semibold' },
                                action.type === 'create_evidence' ? `Create Evidence: ${action.details}` : `Draft Communication: ${action.subject}`
                            )
                        )
                    )
                )
            )
        )
    );
};

export default function IntakeHub() {
    const { geminiApiKey, addEvidence, addActionItem, promptSettings } = useSpudHub();
    const { addToast } = useToast();
    const [activeTool, setActiveTool] = useState('document'); // 'document', 'email', 'note'
    
    // State for all tools
    const [file, setFile] = useState(null);
    const [emailData, setEmailData] = useState({ from: '', to: '', subject: '', body: '' });
    const [note, setNote] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    
    const resetInputs = () => {
        setFile(null);
        setEmailData({ from: '', to: '', subject: '', body: '' });
        setNote('');
        // Also clear the file input visually
        const fileInput = document.getElementById('file-upload-input');
        if(fileInput) (fileInput as HTMLInputElement).value = '';
    };

    const handleToolChange = (tool) => {
        setActiveTool(tool);
        setAnalysis(null);
        resetInputs();
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) setFile(selectedFile);
    };
    
    const handleEmailChange = (e) => {
        setEmailData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleNoteChange = (e) => setNote(e.target.value);

    const handleAnalyze = () => {
        if (!geminiApiKey) return addToast('Please add your Gemini API key in System Settings.', 'error');
        setAnalysis(null);

        switch (activeTool) {
            case 'document':
                if (!file) return addToast('Please select a file first.', 'error');
                handleDocumentAnalyze();
                break;
            case 'email':
                if (!emailData.body) return addToast('Please paste the email body.', 'error');
                handleEmailAnalyze();
                break;
            case 'note':
                if (!note) return addToast('Please write a note first.', 'error');
                handleNoteAnalyze();
                break;
            default:
                break;
        }
    };
    
    const handleDocumentAnalyze = () => {
        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const resultAsString = event.target?.result;
                if (typeof resultAsString !== 'string') throw new Error("Could not read file.");
                const base64Data = resultAsString.split(',')[1];
                const result = await analyzeDocument(geminiApiKey, file.type, base64Data, promptSettings.analyzeDocument);
                setAnalysis(result);
                addToast('Document analysis complete.', 'success');
            } catch (e) {
                const error = e instanceof Error ? e : new Error(String(e));
                addToast(`Analysis failed: ${error.message}`, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            setIsLoading(false);
            addToast("Could not read the file.", 'error');
        };
        reader.readAsDataURL(file);
    };

    const handleEmailAnalyze = async () => {
        setIsLoading(true);
        try {
            const result = await analyzeEmail(geminiApiKey, { ...emailData, date: new Date().toLocaleDateString() }, promptSettings.analyzeEmail);
            setAnalysis(result);
            addToast('Email analysis complete.', 'success');
        } catch(e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Analysis failed: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNoteAnalyze = async () => {
        setIsLoading(true);
        try {
            const result = await analyzeQuickNote(geminiApiKey, note, promptSettings.analyzeQuickNote);
            setAnalysis(result);
            addToast('Note analysis complete.', 'success');
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Analysis failed: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleActionClick = (action, associatedFile) => {
        if (action.type === 'create_evidence') {
            const fileName = associatedFile ? associatedFile.name : `Note_${action.details.substring(0,20).replace(/\s+/g, '_') || Date.now()}.txt`;
            addEvidence(fileName, action.details, new Date().toISOString());
        } else if (action.type === 'create_action_item') {
            addActionItem({ to: action.to || 'Recipient', subject: action.subject || 'Subject', body: action.body || '' });
        }
    };

    const renderTool = () => {
        switch (activeTool) {
            case 'document':
                return React.createElement('div', { className: 'animate-fade-in space-y-4' },
                    React.createElement('h2', { className: 'text-lg font-semibold' }, 'Upload & Analyze Document'),
                    React.createElement('p', { className: 'text-sm text-text-secondary' }, 'Upload a document (PDF, TXT, PNG, JPG) for AI analysis. SpudBud will extract key info and suggest next steps.'),
                    React.createElement('input', { id: 'file-upload-input', type: 'file', onChange: handleFileChange, className: 'form-input' })
                );
            case 'email':
                return React.createElement('div', { className: 'animate-fade-in space-y-2' },
                     React.createElement('h2', { className: 'text-lg font-semibold' }, 'Paste & Analyze Email'),
                     React.createElement('input', {type: 'text', name: 'from', value: emailData.from, onChange: handleEmailChange, placeholder: 'From:', className: 'form-input'}),
                     React.createElement('input', {type: 'text', name: 'subject', value: emailData.subject, onChange: handleEmailChange, placeholder: 'Subject:', className: 'form-input'}),
                     React.createElement('textarea', {name: 'body', value: emailData.body, onChange: handleEmailChange, placeholder: 'Paste full email body here...', rows: 8, className: 'form-textarea'})
                );
            case 'note':
                return React.createElement('div', { className: 'animate-fade-in space-y-4' },
                    React.createElement('h2', { className: 'text-lg font-semibold' }, 'Analyze a Quick Note'),
                    React.createElement('p', { className: 'text-sm text-text-secondary' }, 'Jot down a thought, a summary of a phone call, or an observation. SpudBud will turn it into structured data.'),
                    React.createElement('textarea', {name: 'note', value: note, onChange: handleNoteChange, placeholder: 'e.g., Spoke with Mr. Smith at school, he confirmed the incident report would be ready by Friday...', rows: 8, className: 'form-textarea'})
                );
            default:
                return null;
        }
    };

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Intake Hub', icon: 'fa-inbox' }),
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
            React.createElement('div', { className: 'glass-card p-6 flex flex-col' },
                React.createElement('div', { className: 'flex border-b border-border-primary mb-4' },
                    React.createElement('button', { onClick: () => handleToolChange('document'), className: `px-4 py-2 text-sm font-medium transition-colors ${activeTool === 'document' ? 'border-b-2 border-accent-primary text-accent-primary' : 'text-text-secondary'}` }, 'Document'),
                    React.createElement('button', { onClick: () => handleToolChange('email'), className: `px-4 py-2 text-sm font-medium transition-colors ${activeTool === 'email' ? 'border-b-2 border-accent-primary text-accent-primary' : 'text-text-secondary'}` }, 'Email'),
                    React.createElement('button', { onClick: () => handleToolChange('note'), className: `px-4 py-2 text-sm font-medium transition-colors ${activeTool === 'note' ? 'border-b-2 border-accent-primary text-accent-primary' : 'text-text-secondary'}` }, 'Note')
                ),
                React.createElement('div', {className: 'flex-grow'}, renderTool()),
                React.createElement('button', { onClick: handleAnalyze, disabled: isLoading, className: 'btn btn-primary w-full mt-4' },
                    isLoading ? React.createElement(Spinner, { size: 'fa-sm' }) : React.createElement(React.Fragment, null, React.createElement('i', { className: 'fa-solid fa-microchip mr-2' }), 'Analyze')
                )
            ),
            React.createElement('div', { className: 'glass-card p-6' },
                React.createElement('h2', { className: 'text-lg font-semibold mb-4' }, 'Analysis Results'),
                isLoading ? React.createElement(Spinner, {}) : React.createElement(AnalysisResults, { analysis: analysis, file: file, onActionClick: handleActionClick })
            )
        )
    );
}
