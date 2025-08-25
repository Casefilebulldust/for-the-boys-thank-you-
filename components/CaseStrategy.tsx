
import React, { useState, useEffect, useRef } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { getArgumentStrength, findRelevantEvidence, getArgumentDetails } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import Modal from './Modal.tsx';
import Spinner from './Spinner.tsx';
import ArgumentDetailSection from '../features/CaseStrategy/ArgumentDetailSection.tsx';

export default function CaseStrategy() {
    const { geminiApiKey, strategyData, evidenceData, updateStrategy, promptSettings, highlightedArgument, clearHighlights } = useSpudHub();
    const { addToast } = useToast();
    const [loadingStates, setLoadingStates] = useState({});
    const [suggestionModal, setSuggestionModal] = useState({ isOpen: false, argumentId: null, suggestions: [] });
    const [expandedArgumentId, setExpandedArgumentId] = useState(null);
    const [argumentDetails, setArgumentDetails] = useState({});
    const highlightedRef = useRef(null);

    useEffect(() => {
        if (highlightedArgument && highlightedRef.current) {
            highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(clearHighlights, 3000);
        }
    }, [highlightedArgument, clearHighlights]);

    const handleToggleDetails = (argumentId) => {
        setExpandedArgumentId(prev => (prev === argumentId ? null : argumentId));
    };
    
    const handleFleshOutArgument = async (argument) => {
        if (!geminiApiKey) {
            addToast('Please add your Gemini API key in System Settings.', 'error');
            return;
        }
        setLoadingStates(prev => ({ ...prev, [argument.id]: 'fleshing_out' }));
        try {
            const linkedEvidence = evidenceData.filter(e => argument.evidenceIds.includes(e.id));
            const caseContext = `Tegan Lee is a self-represented litigant in a complex family law and domestic violence case. Key issues include DVO breaches, child safety, negligence by service providers, and unauthorized surveillance.`;
            const result = await getArgumentDetails(geminiApiKey, argument, linkedEvidence, caseContext, promptSettings.getArgumentDetails);
            setArgumentDetails(prev => ({ ...prev, [argument.id]: result }));
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Argument analysis error: ${error.message}`, 'error');
        } finally {
            setLoadingStates(prev => ({ ...prev, [argument.id]: null }));
        }
    };
    
    const handleAssessStrength = async (argumentId) => {
        if (!geminiApiKey) { addToast('API Key needed.', 'error'); return; }
        setLoadingStates(prev => ({ ...prev, [argumentId]: 'assessing' }));
        try {
            const targetArgument = strategyData.flatMap(g => g.arguments).find(a => a.id === argumentId);
            if (targetArgument) {
                const strength = await getArgumentStrength(geminiApiKey, targetArgument, evidenceData, promptSettings.getArgumentStrength);
                updateStrategy(strategyData.map(goal => ({ ...goal, arguments: goal.arguments.map(arg => arg.id === argumentId ? { ...arg, strength } : arg) })));
                addToast(`Argument strength assessed as: ${strength}`, 'success');
            }
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Assessment Error: ${error.message}`, 'error');
        } finally {
            setLoadingStates(prev => ({ ...prev, [argumentId]: null }));
        }
    };

    const handleSuggestLinks = async (argument) => {
        if (!geminiApiKey) { addToast('API Key needed.', 'error'); return; }
        setLoadingStates(prev => ({ ...prev, [argument.id]: 'suggesting' }));
        try {
            const suggestedIds = await findRelevantEvidence(geminiApiKey, argument.text, evidenceData, promptSettings.findRelevantEvidence);
            const suggestedEvidence = evidenceData.filter(e => suggestedIds.includes(e.id));
            if (suggestedEvidence.length > 0) {
                setSuggestionModal({ isOpen: true, argumentId: argument.id, suggestions: suggestedEvidence.map(e => ({...e, isChecked: true})) });
            } else {
                addToast("AI couldn't find any new relevant evidence.", "info");
            }
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Suggestion Error: ${error.message}`, 'error');
        } finally {
            setLoadingStates(prev => ({ ...prev, [argument.id]: null }));
        }
    };

    const handleSuggestionCheck = (evidenceId) => {
        setSuggestionModal(prev => ({
            ...prev,
            suggestions: prev.suggestions.map(e => e.id === evidenceId ? {...e, isChecked: !e.isChecked} : e)
        }));
    };
    
    const handleApplySuggestions = () => {
        const { argumentId, suggestions } = suggestionModal;
        const checkedIds = suggestions.filter(s => s.isChecked).map(s => s.id);
        updateStrategy(strategyData.map(goal => ({
            ...goal,
            arguments: goal.arguments.map(arg =>
                arg.id === argumentId ? { ...arg, evidenceIds: [...new Set([...arg.evidenceIds, ...checkedIds])], strength: 'Unknown' } : arg
            )
        })));
        addToast("Evidence links updated. Re-assess strength for new rating.", "success");
        setSuggestionModal({ isOpen: false, argumentId: null, suggestions: [] });
    };

    const getStrengthStyle = (strength) => {
        const styles = {
            'Weak': { backgroundColor: 'color-mix(in srgb, var(--danger-primary) 20%, transparent)', color: 'var(--danger-primary)' },
            'Moderate': { backgroundColor: 'color-mix(in srgb, var(--warning-primary) 20%, transparent)', color: 'var(--warning-primary)' },
            'Strong': { backgroundColor: 'color-mix(in srgb, var(--success-primary) 20%, transparent)', color: 'var(--success-primary)' },
            'Very Strong': { backgroundColor: 'color-mix(in srgb, var(--success-primary) 40%, transparent)', color: 'var(--success-primary)' },
            'Unknown': { backgroundColor: 'color-mix(in srgb, var(--text-secondary) 20%, transparent)', color: 'var(--text-secondary)' },
        };
        return styles[strength] || styles['Unknown'];
    };
    
    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Case Strategy', icon: 'fa-chess-board' }),
        React.createElement('div', { className: 'space-y-6' },
            strategyData.map(goal => React.createElement('div', { key: goal.id, className: 'glass-card p-6' },
                React.createElement('h2', { className: 'text-lg font-semibold text-accent-primary' }, `Goal: ${goal.text}`),
                React.createElement('div', { className: 'mt-4 space-y-4' }, goal.arguments.map(arg => {
                    const isExpanded = expandedArgumentId === arg.id;
                    const details = argumentDetails[arg.id];
                    const isLoadingDetails = loadingStates[arg.id] === 'fleshing_out';
                    return React.createElement('div', { key: arg.id, ref: highlightedArgument === arg.id ? highlightedRef : null, className: `bg-bg-secondary rounded-lg transition-all duration-300 border border-transparent ${highlightedArgument === arg.id ? 'animate-pulse-highlight' : ''}` },
                        React.createElement('div', { className: 'p-4' },
                            React.createElement('p', null, arg.text),
                            React.createElement('div', { className: 'flex flex-col sm:flex-row justify-between sm:items-center mt-3' },
                                React.createElement('div', { className: 'text-sm' }, React.createElement('strong', null, 'Supporting Evidence: '),
                                    arg.evidenceIds.length > 0 ? React.createElement('span', null, arg.evidenceIds.map((id, index) => {
                                        const evidenceFile = evidenceData.find(e => e.id === id);
                                        if (!evidenceFile) return null;
                                        return React.createElement(React.Fragment, { key: id },
                                            React.createElement('button', { title: evidenceFile.description, onClick: () => alert("This is a record of a file on your computer. Spud Hub OS does not store the file itself for your privacy and security. Your original file is safe where you saved it."), className: 'underline decoration-dotted hover:text-accent-primary transition-colors' }, evidenceFile.fileName),
                                            index < arg.evidenceIds.length - 1 ? ', ' : ''
                                        )
                                    })) : React.createElement('span', { className: 'text-warning-primary' }, 'None linked')
                                ),
                                React.createElement('div', { className: 'flex items-center space-x-2 mt-2 sm:mt-0' },
                                    React.createElement('span', { className: `text-xs font-semibold px-2 py-1 rounded-full`, style: getStrengthStyle(arg.strength) }, arg.strength),
                                    React.createElement('button', { onClick: () => handleSuggestLinks(arg), disabled: loadingStates[arg.id] === 'suggesting', className: 'btn btn-secondary btn-sm text-xs' }, loadingStates[arg.id] === 'suggesting' ? React.createElement(Spinner, {size: 'fa-sm'}) : React.createElement('i', {className: 'fa-solid fa-magic-wand-sparkles'})),
                                    React.createElement('button', { onClick: () => handleAssessStrength(arg.id), disabled: loadingStates[arg.id] === 'assessing', className: 'btn btn-secondary btn-sm text-xs' }, loadingStates[arg.id] === 'assessing' ? React.createElement(Spinner, {size: 'fa-sm'}) : 'Assess'),
                                    React.createElement('button', { onClick: () => handleToggleDetails(arg.id), className: 'btn btn-secondary btn-sm text-xs' }, isExpanded ? 'Hide' : 'Details', React.createElement('i', { className: `fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} ml-2 text-xs` }))
                                )
                            )
                        ),
                        isExpanded && React.createElement('div', { className: 'p-4 border-t border-border-primary animate-fade-in' }, 
                            !details && !isLoadingDetails && React.createElement('div', { className: 'text-center p-4' },
                                React.createElement('h4', { className: 'font-semibold' }, 'Argument Analysis'),
                                React.createElement('p', { className: 'text-sm text-text-secondary my-2 max-w-md mx-auto' }, 'Stress-test this argument. The AI will act as a devil\'s advocate to find weaknesses and suggest improvements.'),
                                React.createElement('button', { onClick: () => handleFleshOutArgument(arg), className: 'btn btn-primary mt-2' }, 
                                    React.createElement('i', { className: 'fa-solid fa-wand-magic-sparkles mr-2'}),
                                    'Analyze Argument'
                                )
                            ),
                            isLoadingDetails && React.createElement(Spinner, {}),
                            details && React.createElement('div', { className: 'space-y-4' },
                                React.createElement(ArgumentDetailSection, { title: 'Potential Counter-Arguments', icon: 'fa-shield-halved', items: details.counterArguments }),
                                React.createElement(ArgumentDetailSection, { title: 'Mitigation Strategies', icon: 'fa-lightbulb', items: details.mitigationStrategies }),
                                React.createElement(ArgumentDetailSection, { title: 'Suggested Evidence', icon: 'fa-folder-plus', items: details.evidenceSuggestions })
                            )
                        )
                    );
                }))
            ))
        ),
        React.createElement(Modal, { isOpen: suggestionModal.isOpen, onClose: () => setSuggestionModal({isOpen: false, argumentId: null, suggestions: []}) },
            React.createElement('h2', {id: 'modal-title', className: 'text-xl font-bold mb-4'}, 'AI Evidence Suggestions'),
            React.createElement('p', {className: 'text-text-secondary mb-4'}, "The AI suggests linking the following evidence. Uncheck any you don't want to add."),
            React.createElement('ul', {className: 'space-y-2 max-h-60 overflow-y-auto p-2 bg-bg-secondary rounded-md'}, suggestionModal.suggestions.map(e => React.createElement('li', {key: e.id},
                React.createElement('label', {className: 'flex items-center p-2 rounded-md hover:bg-bg-tertiary cursor-pointer'},
                    React.createElement('input', {type: 'checkbox', checked: e.isChecked, onChange: () => handleSuggestionCheck(e.id), className: 'form-checkbox h-4 w-4 mr-3'}),
                    React.createElement('span', {className: 'font-semibold'}, e.fileName)
                )
            ))),
            React.createElement('div', {className: 'flex justify-end mt-6'}, React.createElement('button', {onClick: handleApplySuggestions, className: 'btn btn-primary'}, 'Apply Links'))
        )
    );
};