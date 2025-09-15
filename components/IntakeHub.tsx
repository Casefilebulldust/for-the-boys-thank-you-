import React, { useState } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { analyzeDocument, analyzeEmail, analyzeQuickNote } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import Spinner from './Spinner.tsx';
import EmptyState from './EmptyState.tsx';
import Modal from './Modal.tsx';

const IntakeReviewModal = ({ isOpen, onClose, suggestedActions, onConfirm }) => {
    const [actions, setActions] = useState(suggestedActions);

    React.useEffect(() => {
        setActions(suggestedActions);
    }, [suggestedActions]);

    const handleActionChange = (index, field, value) => {
        const newActions = [...actions];
        newActions[index][field] = value;
        setActions(newActions);
    };
    
    const handleConfirm = () => {
        onConfirm(actions);
        onClose();
    };

    if (!isOpen) return null;

    return React.createElement(Modal, { isOpen, onClose },
        React.createElement('h2', { className: 'text-xl font-bold mb-4' }, 'Review Suggested Actions'),
        React.createElement('p', { className: 'text-sm text-text-secondary mb-4' }, 'SpudBud has generated the following actions. Review and edit them before adding them to the system.'),
        React.createElement('div', { className: 'space-y-4 max-h-96 overflow-y-auto p-1' },
            actions.map((action, index) =>
                React.createElement('div', { key: index, className: 'p-4 bg-bg-secondary rounded-lg space-y-2' },
                    React.createElement('div', { className: 'flex items-center gap-2' },
                        React.createElement('i', { className: `fa-solid ${action.type === 'create_evidence' ? 'fa-plus' : 'fa-paper-plane'} text-accent-primary` }),
                        React.createElement('strong', { className: 'text-text-primary' }, action.type === 'create_evidence' ? 'Create Evidence' : 'Create Action Item')
                    ),
                    action.type === 'create_evidence' ?
                        React.createElement('textarea', {
                            name: 'details',
                            value: action.details || '',
                            onChange: e => handleActionChange(index, 'details', e.target.value),
                            className: 'form-textarea text-sm',
                            rows: 2
                        } as any) :
                        React.createElement('div', { className: 'space-y-2' },
                             React.createElement('input', { name: 'to', type: 'text', value: action.to || '', onChange: e => handleActionChange(index, 'to', e.target.value), className: 'form-input text-sm', placeholder: 'To:' } as any),
                             React.createElement('input', { name: 'subject', type: 'text', value: action.subject || '', onChange: e => handleActionChange(index, 'subject', e.target.value), className: 'form-input text-sm', placeholder: 'Subject:' } as any),
                             React.createElement('textarea', { name: 'body', value: action.body || '', onChange: e => handleActionChange(index, 'body', e.target.value), className: 'form-textarea text-sm', rows: 3, placeholder: 'Body:' } as any)
                        )
                )
            )
        ),
        React.createElement('div', { className: 'flex justify-end gap-2 mt-6' },
            React.createElement('button', { type: 'button', onClick: onClose, className: 'btn btn-secondary' }, 'Cancel'),
            React.createElement('button', { onClick: handleConfirm, className: 'btn btn-primary' }, 'Confirm and Add')
        )
    );
};


// A new sub-component to display analysis results cleanly
const AnalysisResults = ({ analysis }) => {
    if (!analysis) {
        return React.createElement(EmptyState, { icon: 'fa-file-circle-question', title: 'Awaiting Analysis', message: 'Upload a document, paste an email, or write a note, then click "Analyze" to see the results here.' });
    }

    const { summary, documentType } = analysis;

    return React.createElement('div', { className: 'space-y-4 text-sm animate-fade-in' },
        React.createElement('div', null,
            React.createElement('strong', { className: 'text-accent-primary' }, 'Summary:'),
            React.createElement('p', { className: 'mt-1 text-text-primary' }, summary)
        ),
        documentType && React.createElement('div', null,
            React.createElement('strong', { className: 'text-accent-primary' }, 'Document Type: '),
            React.createElement('span', { className: 'tag' }, documentType)
        )
    );
};

export default function IntakeHub() {
    const { addEvidence, addActionItem, promptSettings, isAiAvailable } = useSpudHub();
    const { addToast } = useToast();
    const [activeTool, setActiveTool] = useState('document'); // 'document', 'email', 'note'
    
    // State for all tools
    const [file, setFile] = useState(null);
    const [emailData, setEmailData] = useState({ from: '', to: '', subject: '', body: '' });
    const [note, setNote] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    
    const resetInputs = () => {
        setFile(null);
        setEmailData({ from: '', to: '', subject: '', body: '' });
        setNote('');
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

    const processAnalysisResult = (result) => {
        setAnalysis(result);
        if (result.suggestedActions && result.suggestedActions.length > 0) {
            setIsReviewModalOpen(true);
        }
        addToast('Analysis complete.', 'success');
    };

    const handleFileAnalyze = () => {
        return new Promise((resolve, reject) => {
            if (!file) {
                return reject(new Error('Please select a file first.'));
            }
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const resultAsString = event.target?.result;
                    if (typeof resultAsString !== 'string') throw new Error("Could not read file.");
                    const base64Data = resultAsString.split(',')[1];
                    const result = await analyzeDocument(file.type, base64Data, promptSettings.analyzeDocument);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Could not read the file.'));
            reader.readAsDataURL(file);
        });
    };
    
    const handleAnalyze = async () => {
        if (!isAiAvailable) return addToast('AI features require an API Key.', 'error');
        
        setAnalysis(null);
        setIsLoading(true);

        try {
            let result;
            switch (activeTool) {
                case 'document':
                    result = await handleFileAnalyze();
                    break;
                case 'email':
                    if (!emailData.body) throw new Error('Please paste the email body.');
                    result = await analyzeEmail({ ...emailData, date: new Date().toLocaleDateString() }, promptSettings.analyzeEmail);
                    break;
                case 'note':
                    if (!note) throw new Error('Please write a note first.');
                    result = await analyzeQuickNote(note, promptSettings.analyzeQuickNote);
                    break;
            }
            processAnalysisResult(result);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Analysis failed: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleConfirmActions = (confirmedActions) => {
        let evidenceCount = 0;
        let actionItemCount = 0;
        
        confirmedActions.forEach(action => {
            if (action.type === 'create_evidence') {
                const fileName = analysis.documentType ? `${analysis.documentType.replace(/\s+/g, '_')}_${Date.now()}.txt` : `Note_${Date.now()}.txt`;
                addEvidence(fileName, action.details, new Date().toISOString());
                evidenceCount++;
            } else if (action.type === 'create_action_item') {
                addActionItem({ to: action.to, subject: action.subject, body: action.body });
                actionItemCount++;
            }
        });

        if (evidenceCount > 0) addToast(`${evidenceCount} evidence item(s) created.`, 'success');
        if (actionItemCount > 0) addToast(`${actionItemCount} action item(s) created.`, 'success');
        
        setAnalysis(null);
        resetInputs();
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
                     React.createElement('input', { name: 'from', type: 'text', value: emailData.from, onChange: handleEmailChange, placeholder: 'From:', className: 'form-input' } as any),
                     React.createElement('input', { name: 'subject', type: 'text', value: emailData.subject, onChange: handleEmailChange, placeholder: 'Subject:', className: 'form-input' } as any),
                     React.createElement('textarea', { name: 'body', value: emailData.body, onChange: handleEmailChange, placeholder: 'Paste full email body here...', rows: 8, className: 'form-textarea' } as any)
                );
            case 'note':
                return React.createElement('div', { className: 'animate-fade-in space-y-4' },
                    React.createElement('h2', { className: 'text-lg font-semibold' }, 'Analyze a Quick Note'),
                    React.createElement('p', { className: 'text-sm text-text-secondary' }, 'Jot down a thought, a summary of a phone call, or an observation. SpudBud will turn it into structured data.'),
                    React.createElement('textarea', { name: 'note', value: note, onChange: handleNoteChange, placeholder: 'e.g., Spoke with Mr. Smith at school, he confirmed the incident report would be ready by Friday...', rows: 8, className: 'form-textarea' } as any)
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
                isLoading ? React.createElement(Spinner, {}) : React.createElement(AnalysisResults, { analysis: analysis })
            )
        ),
        React.createElement(IntakeReviewModal, { 
            isOpen: isReviewModalOpen,
            onClose: () => setIsReviewModalOpen(false),
            suggestedActions: analysis?.suggestedActions || [],
            onConfirm: handleConfirmActions
        })
    );
}
