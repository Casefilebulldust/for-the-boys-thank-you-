

import React, { useState } from 'react';
import QRCode from 'qrcode';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { usePrint } from '../contexts/PrintContext.tsx';
import { generateDossier } from '../services/geminiService.ts';
import PageTitle from '../components/PageTitle.tsx';
import Spinner from '../components/Spinner.tsx';
import MarkdownRenderer from '../components/MarkdownRenderer.tsx';
import EmptyState from '../components/EmptyState.tsx';

const dossierTemplates = [
    { id: 'Custom', name: 'Custom Topic' },
    { id: 'Full Chronological Timeline', name: 'Full Chronological Timeline' },
    { id: 'Agency Failure Report', name: 'Agency Failure Report' }
];

export default function DossierGenerator() {
    const spudHubData = useSpudHub();
    const { addToast } = useToast();
    const { triggerPrint } = usePrint();
    const [template, setTemplate] = useState('Custom');
    const [topic, setTopic] = useState('');
    const [dossier, setDossier] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (template === 'Custom' && !topic) {
            addToast("Please enter a topic for the custom dossier.", "error");
            return;
        }
        if (!spudHubData.geminiApiKey) {
            addToast("Please add your Gemini API key in System Settings.", "error");
            return;
        }
        setIsLoading(true);
        setDossier('');
        try {
            const { promptSettings, geminiApiKey, ...caseData } = spudHubData;
            const finalTopic = template === 'Custom' ? topic : template;
            const result = await generateDossier(geminiApiKey, finalTopic, template, caseData, promptSettings.generateDossier);
            setDossier(result);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Dossier generation failed: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        const printTopic = template === 'Custom' ? topic : template;
        triggerPrint(React.createElement('div', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-4' }, `Dossier: ${printTopic}`),
            React.createElement(MarkdownRenderer, { markdownText: dossier, className: 'prose-invert' })
        ));
    };

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Dossier Generator', icon: 'fa-book' }),
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },
            React.createElement('div', { className: 'glass-card p-6 space-y-4' },
                React.createElement('h2', { className: 'text-lg font-semibold' }, 'Generate Evidence Pack'),
                React.createElement('p', { className: 'text-sm text-gray-400' }, "Generate a comprehensive, formatted dossier on a topic. SpudBud will search all case data to compile a detailed 'evidence pack' for formal use."),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'template', className: 'block text-sm font-medium mb-1' }, 'Dossier Template'),
                    React.createElement('select', { id: 'template', value: template, onChange: e => setTemplate(e.target.value), className: 'form-select' },
                        dossierTemplates.map(t => React.createElement('option', { key: t.id, value: t.id }, t.name))
                    )
                ),
                template === 'Custom' && React.createElement('div', { className: 'animate-fade-in' },
                    React.createElement('label', { htmlFor: 'topic', className: 'block text-sm font-medium mb-1' }, 'Custom Topic'),
                    React.createElement('input', { id: 'topic', type: 'text', value: String(topic), onChange: e => setTopic(e.target.value), className: 'form-input', placeholder: "e.g., Timeline of DVO breaches", required: true })
                ),
                React.createElement('button', {
                    onClick: handleGenerate,
                    disabled: isLoading,
                    className: 'btn btn-primary w-full'
                }, isLoading ? React.createElement(Spinner, {}) : 'Generate Dossier')
            ),
            React.createElement('div', { className: 'glass-card p-6 flex flex-col' },
                React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                    React.createElement('h2', { className: 'text-lg font-semibold' }, 'Generated Dossier'),
                    dossier && React.createElement('button', { onClick: handlePrint, className: 'btn btn-secondary btn-sm' }, React.createElement('i', { className: 'fa-solid fa-print mr-2' }), 'Print')
                ),
                React.createElement('div', { className: 'flex-1 overflow-y-auto bg-neutral-900/50 p-4 rounded-md' },
                    isLoading ? React.createElement(Spinner, {}) :
                    dossier ? React.createElement(MarkdownRenderer, { markdownText: dossier })
                    : React.createElement(EmptyState, { icon: 'fa-file-medical', title: 'Ready to Compile', message: 'Enter a topic and click "Generate Dossier" to create a comprehensive evidence pack.' })
                )
            )
        )
    );
}