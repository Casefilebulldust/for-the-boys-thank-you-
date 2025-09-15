import React, { useState, useEffect, useRef } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { getOsResponseStream } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';

interface OsMessage {
    sender: 'user' | 'ai';
    content: string;
}

export default function OperatingSystem() {
    const spudHub = useSpudHub();
    const { addToast } = useToast();
    const [history, setHistory] = useState<OsMessage[]>([
        { sender: 'ai', content: "SpudBud OS Core online. I have full access to the case file. How can I assist you, Operator?" }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const endOfMessagesRef = useRef(null);
    
    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const newUserMessage: OsMessage = { sender: 'user', content: userInput };
        const newAiMessage: OsMessage = { sender: 'ai', content: '' };
        setHistory(prev => [...prev, newUserMessage, newAiMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            const { promptSettings, ...snapshot } = spudHub;
            const stream = await getOsResponseStream(userInput, snapshot, promptSettings.osCoreSystemInstruction);
            
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk.text;
                setHistory(prev => {
                    const updatedHistory = [...prev];
                    updatedHistory[updatedHistory.length - 1] = { ...updatedHistory[updatedHistory.length - 1], content: fullResponse };
                    return updatedHistory;
                });
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            addToast(`AI Error: ${error.message}`, 'error');
            setHistory(prev => {
                const updatedHistory = [...prev];
                updatedHistory[updatedHistory.length - 1] = { ...updatedHistory[updatedHistory.length - 1], content: `**System Error:** ${error.message}` };
                return updatedHistory;
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        React.createElement('div', { className: 'animate-fade-in flex flex-col h-full' },
            React.createElement(PageTitle, { title: 'Operating System', icon: 'fa-terminal' }),
            React.createElement('div', { className: 'glass-card flex-1 flex flex-col p-4 overflow-hidden' },
                React.createElement('div', { className: 'flex-1 overflow-y-auto pr-2' },
                    history.map((msg, index) =>
                        React.createElement('div', { key: index, className: `flex items-start gap-3 mb-4 ${msg.sender === 'user' ? 'justify-end' : ''}` },
                            msg.sender === 'ai' && React.createElement('i', { className: 'fa-solid fa-brain text-accent-primary mt-1' }),
                            React.createElement('div', { className: `max-w-xl p-3 rounded-lg ${msg.sender === 'user' ? 'bg-accent-primary/80 text-white' : 'bg-bg-secondary'}` },
                                React.createElement(MarkdownRenderer, { markdownText: msg.content + (isLoading && index === history.length -1 ? '▍' : '') })
                            ),
                            msg.sender === 'user' && React.createElement('i', { className: 'fa-solid fa-user-secret mt-1' })
                        )
                    ),
                    React.createElement('div', { ref: endOfMessagesRef })
                ),
                React.createElement('form', { onSubmit: handleSubmit, className: 'mt-4 flex gap-2 border-t border-border-primary pt-4' },
                    React.createElement('input', {
                        type: 'text',
                        value: userInput,
                        onChange: (e) => setUserInput(e.target.value),
                        className: 'form-input flex-1',
                        placeholder: 'Ask SpudBud anything about your case...',
                        disabled: isLoading
                    }),
                    React.createElement('button', { type: 'submit', className: 'btn btn-primary', disabled: isLoading }, 'Send')
                )
            )
        )
    );
}