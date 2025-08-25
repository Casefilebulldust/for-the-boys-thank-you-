import React, { useState, useEffect, useRef } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { GoogleGenAI, Chat } from '@google/genai';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import Spinner from './Spinner.tsx';

const OperatingSystem = () => {
    const spudHub = useSpudHub();
    const { geminiApiKey, promptSettings } = spudHub;

    const chatRef = useRef<Chat | null>(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const messagesEndRef = useRef(null);

    // Initialize the chat instance
    useEffect(() => {
        if (!geminiApiKey) {
            setMessages([{ role: 'model', parts: [{ text: "```\n// SECURITY ALERT //\nGEMINI API KEY NOT FOUND IN SYSTEM SETTINGS.\nOS CORE IS OFFLINE.\n```" }] }]);
            return;
        }

        const initializeChat = async () => {
            try {
                // Remove the API key from the snapshot sent to the model for security
                const { geminiApiKey, ...caseDataSnapshot } = spudHub;
                const systemInstruction = promptSettings.osCoreSystemInstruction
                    .replace('{{caseData}}', JSON.stringify(caseDataSnapshot, null, 2));

                const ai = new GoogleGenAI({ apiKey: spudHub.geminiApiKey });

                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction,
                    },
                });

                setMessages([{ role: 'model', parts: [{ text: "SpudBud OS Core online. I have full, real-time access to the case file. How can I assist you, Operator?" }] }]);
                setIsInitialized(true);
            } catch (error) {
                console.error("Chat initialization failed:", error);
                setMessages([{ role: 'model', parts: [{ text: `\`\`\`\n// OS CORE INITIALIZATION FAILURE //\nDetails: ${error.message}\nCheck API Key and network connection.\n\`\`\`` }] }]);
            }
        };

        initializeChat();
    }, [geminiApiKey, promptSettings.osCoreSystemInstruction, spudHub]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatRef.current) return;

        const userMessage = { role: 'user', parts: [{ text: input }] };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await chatRef.current.sendMessageStream({ message: input });
            
            let currentResponse = '';
            setMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]); 

            for await (const chunk of result) {
                currentResponse += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: 'model', parts: [{ text: currentResponse }] };
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage = { role: 'model', parts: [{ text: `// OS CORE ERROR: ${error.message}` }] };
            setMessages(prev => {
                const newMessages = [...prev];
                // Replace the empty placeholder if it exists
                if (newMessages[newMessages.length - 1].parts[0].text === '') {
                    newMessages[newMessages.length - 1] = errorMessage;
                } else {
                    newMessages.push(errorMessage);
                }
                return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        React.createElement('div', {
            className: 'flex flex-col h-full w-full bg-bg-secondary -m-4 sm:-m-6 lg:-m-8'
        },
            React.createElement('div', {
                className: 'flex-1 overflow-y-auto p-4 space-y-4'
            },
                messages.map((msg, index) => (
                    React.createElement('div', {
                        key: index,
                        className: `flex my-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`
                    },
                        React.createElement('div', {
                            className: `max-w-3xl py-2 px-4 rounded-xl shadow-md ${msg.role === 'user' ? 'bg-accent-secondary text-white' : 'bg-bg-tertiary text-text-primary'}`
                        },
                           React.createElement(MarkdownRenderer, { markdownText: msg.parts[0].text + (isLoading && index === messages.length - 1 ? '▍' : '') })
                        )
                    )
                )),
                React.createElement('div', { ref: messagesEndRef })
            ),
            React.createElement('form', {
                onSubmit: handleSendMessage,
                className: 'p-4 border-t border-border-primary'
            },
                React.createElement('div', {
                    className: 'flex items-center glass-card p-2 rounded-lg focus-within:ring-2 focus-within:ring-accent-primary'
                },
                    React.createElement('textarea', {
                        value: String(input),
                        onChange: (e) => setInput(e.target.value),
                        onKeyDown: (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        },
                        placeholder: isInitialized ? 'Query the OS Core, Operator...' : 'Initializing OS Core...',
                        className: 'form-textarea bg-transparent border-none focus:ring-0 flex-1 resize-none py-2 px-3',
                        rows: 1,
                        disabled: isLoading || !isInitialized
                    }),
                    React.createElement('button', {
                        type: 'submit',
                        className: 'btn btn-primary ml-2 flex-shrink-0',
                        disabled: isLoading || !input.trim() || !isInitialized
                    },
                        isLoading ? React.createElement(Spinner, { size: 'fa-sm' }) : React.createElement('i', { className: 'fa-solid fa-paper-plane' })
                    )
                )
            )
        )
    );
};

export default OperatingSystem;