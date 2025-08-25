
import React, { useState, useEffect } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { usePrint } from '../contexts/PrintContext.tsx';
import { generateAdvocacyContentStream } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import Spinner from './Spinner.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import EmptyState from './EmptyState.tsx';

export default function AdvocacyAssistant() {
    const { geminiApiKey, caseData, evidenceData, promptSettings, actionToExecute, clearAction } = useSpudHub();
    const { addToast } = useToast();
    const { triggerPrint } = usePrint();
    const [mode, setMode] = useState('ghostwriter');
    const [situation, setSituation] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (actionToExecute) {
            setMode(actionToExecute.tool);
            setSituation(actionToExecute.situation);
            clearAction();
        }
    }, [actionToExecute, clearAction]);

    const handleGenerate = async () => {
        if (!situation) {
            addToast('Please describe the situation first.', 'error');
            return;
        }
        if (!geminiApiKey) {
            addToast('Please add your Gemini API key in System Settings.', 'error');
            return;
        }
        setIsLoading(true);
        setResult('');
        try {
            const stream = await generateAdvocacyContentStream(geminiApiKey, mode, situation, caseData, evidenceData, promptSettings.generateAdvocacyContent);
            for await (const chunk of stream) {
                setResult(prev => prev + chunk.text);
            }
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Generation failed: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        triggerPrint(React.createElement(MarkdownRenderer, { markdownText: result, className: 'prose-invert' }));
    };

    const handleSituationChange = (e) => setSituation(e.target.value);

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Advocacy Assistant', icon: 'fa-microphone-lines' }),
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },
            React.createElement('div', { className: 'glass-card p-6 space-y-4' },
                React.createElement('h2', { className: 'text-lg font-semibold' }, 'Generator Controls'),
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Select Tool'),
                    React.createElement('div', { className: 'flex space-x-2' },
                        ['ghostwriter', 'email', 'script'].map(tool =>
                            React.createElement('button', {
                                key: tool,
                                onClick: () => setMode(tool),
                                className: `btn flex-1 capitalize ${mode === tool ? 'btn-primary' : 'btn-secondary'}`
                            }, tool)
                        )
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'situation', className: 'block text-sm font-medium mb-1' }, 'Describe the Situation'),
                    React.createElement('textarea', {
                        id: 'situation',
                        name: 'situation',
                        value: situation,
                        onChange: handleSituationChange,
                        className: 'form-textarea',
                        rows: 8,
                        placeholder: 'e.g., "Draft a formal letter to the school principal about failure to implement a DVO management plan."'
                    })
                ),
                React.createElement('button', {
                    onClick: handleGenerate,
                    disabled: isLoading,
                    className: 'btn btn-primary w-full'
                }, isLoading ? React.createElement(Spinner, {}) : 'Generate Content')
            ),
            React.createElement('div', { className: 'glass-card p-6 flex flex-col' },
                React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                    React.createElement('h2', { className: 'text-lg font-semibold' }, 'Generated Content'),
                    result && !isLoading && React.createElement('button', { onClick: handlePrint, className: 'btn btn-secondary btn-sm' },
                        React.createElement('i', { className: 'fa-solid fa-print mr-2' }), 'Print'
                    )
                ),
                React.createElement('div', { className: 'flex-1 overflow-y-auto bg-bg-secondary/50 p-4 rounded-md' },
                    !result && !isLoading ? React.createElement(EmptyState, { icon: 'fa-magic-wand-sparkles', title: 'Ready to Assist', message: 'Configure your request and click "Generate Content".' })
                    : React.createElement(MarkdownRenderer, { markdownText: result + (isLoading ? '▍' : '') })
                )
            )
        )
    );
}
