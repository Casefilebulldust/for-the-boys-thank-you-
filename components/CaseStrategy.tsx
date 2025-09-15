


import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { getArgumentStrength, findRelevantEvidence, getArgumentDetails, suggestNewArguments } from '../services/geminiService.ts';
import PageTitle from './PageTitle.tsx';
import Modal from './Modal.tsx';
import Spinner from './Spinner.tsx';
import ArgumentDetailSection from '../features/CaseStrategy/ArgumentDetailSection.tsx';
import { StrategyGoal } from '../services/types.ts';

const getStrengthStyle = (strength) => {
    const styles = {
        'Weak': { backgroundColor: 'color-mix(in srgb, var(--danger-primary) 20%, transparent)', color: 'var(--danger-primary)', barColor: 'var(--danger-primary)' },
        'Moderate': { backgroundColor: 'color-mix(in srgb, var(--warning-primary) 20%, transparent)', color: 'var(--warning-primary)', barColor: 'var(--warning-primary)' },
        'Strong': { backgroundColor: 'color-mix(in srgb, var(--success-primary) 20%, transparent)', color: 'var(--success-primary)', barColor: 'var(--success-primary)' },
        'Very Strong': { backgroundColor: 'color-mix(in srgb, var(--success-primary) 40%, transparent)', color: 'var(--success-primary)', barColor: 'var(--success-primary)' },
        'Unknown': { backgroundColor: 'color-mix(in srgb, var(--text-secondary) 20%, transparent)', color: 'var(--text-secondary)', barColor: 'var(--text-secondary)' },
    };
    return styles[strength] || styles['Unknown'];
};

const ArgumentStrengthChart = ({ strategyData }: { strategyData: StrategyGoal[] }) => {
    const strengthCounts = useMemo(() => {
        const counts = { 'Weak': 0, 'Moderate': 0, 'Strong': 0, 'Very Strong': 0, 'Unknown': 0 };
        strategyData.forEach(goal => {
            goal.arguments.forEach(arg => {
                counts[arg.strength] = (counts[arg.strength] || 0) + 1;
            });
        });
        return Object.entries(counts).map(([label, value]) => ({ label, value, ...getStrengthStyle(label) }));
    }, [strategyData]);

    const totalArguments = strengthCounts.reduce((sum, item) => sum + item.value, 0);
    if (totalArguments === 0) return null;

    return (
        React.createElement('div', { className: 'glass-card p-6 mb-6' },
            React.createElement('h2', { className: 'text-lg font-semibold mb-4' }, 'Argument Strength Distribution'),
            React.createElement('div', { className: 'space-y-2' },
                strengthCounts.map(item =>
                    React.createElement('div', { key: item.label, className: 'flex items-center text-sm' },
                        React.createElement('span', { className: 'w-28 font-medium', style: { color: item.color } }, item.label),
                        React.createElement('div', { className: 'flex-1 bg-bg-tertiary rounded-full h-4' },
                            React.createElement('div', {
                                className: 'h-4 rounded-full transition-all duration-500 ease-out',
                                style: { width: `${(item.value / totalArguments) * 100}%`, backgroundColor: item.barColor }
                            })
                        ),
                        React.createElement('span', { className: 'w-8 text-right font-semibold' }, item.value)
                    )
                )
            )
        )
    );
};


export default function CaseStrategy() {
    const spudHubData = useSpudHub();
    const { isAiAvailable, strategyData, evidenceData, setData, addArgumentsToGoal, promptSettings, highlightedArgument, clearHighlights } = spudHubData;
    const { addToast } = useToast();
    const [loadingStates, setLoadingStates] = useState({});
    const [suggestionModal, setSuggestionModal] = useState({ isOpen: false, argumentId: null, suggestions: [] });
    const [argumentSuggestionModal, setArgumentSuggestionModal] = useState({ isOpen: false, goalId: null, suggestions: [] });
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
        if (!isAiAvailable) {
            addToast('AI features require an API key to be set.', 'error');
            return;
        }
        setLoadingStates(prev => ({ ...prev, [argument.id]: 'fleshing_out' }));
        try {
            const linkedEvidence = evidenceData.filter(e => argument.evidenceIds.includes(e.id));
            const caseContext = `Tegan Lee is a self-represented litigant in a complex family law and domestic violence case. Key issues include DVO breaches, child safety, negligence by service providers, and unauthorized surveillance.`;
            const result = await getArgumentDetails(argument, linkedEvidence, caseContext, promptSettings.getArgumentDetails);
            setArgumentDetails(prev => ({ ...prev, [argument.id]: result }));
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Argument analysis error: ${error.message}`, 'error');
        } finally {
            setLoadingStates(prev => ({ ...prev, [argument.id]: null }));
        }
    };
    
    const handleAssessStrength = async (argumentId) => {
        if (!isAiAvailable) { addToast('AI features require an API key to be set.', 'error'); return; }
        setLoadingStates(prev => ({ ...prev, [argumentId]: 'assessing' }));
        try {
            const targetArgument = strategyData.flatMap(g => g.arguments).find(a => a.id === argumentId);
            if (targetArgument) {
                const strength = await getArgumentStrength(targetArgument, evidenceData, promptSettings.getArgumentStrength);
                const newStrategyData = strategyData.map(goal => ({ ...goal, arguments: goal.arguments.map(arg => arg.id === argumentId ? { ...arg, strength } : arg) }));
                setData('strategyData', newStrategyData);
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
        if (!isAiAvailable) { addToast('AI features require an API key to be set.', 'error'); return; }
        setLoadingStates(prev => ({ ...prev, [argument.id]: 'suggesting' }));
        try {
            const suggestedIds = await findRelevantEvidence(argument.text, evidenceData, promptSettings.findRelevantEvidence);
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
    
    const handleSuggestArguments = async (goal) => {
        if (!isAiAvailable) return addToast("API Key needed.", "error");
        setLoadingStates(prev => ({ ...prev, [`goal-${goal.id}`]: 'suggesting_args' }));
        try {
            const { promptSettings, isAiAvailable, ...snapshot } = spudHubData;
            const result = await suggestNewArguments(goal.text, snapshot, promptSettings.suggestNewArguments);
            if (result.suggestions && result.suggestions.length > 0) {
                setArgumentSuggestionModal({ 
                    isOpen: true, 
                    goalId: goal.id, 
                    suggestions: result.suggestions.map(s => ({ text: s, isChecked: true })) 
                });
            } else {
                addToast("AI could not suggest any new arguments for this goal.", "info");
            }
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Argument suggestion error: ${error.message}`, "error");
        } finally {
            setLoadingStates(prev => ({ ...prev, [`goal-${goal.id}`]: null }));
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
        const newStrategyData = strategyData.map(goal => ({
            ...goal,
            arguments: goal.arguments.map(arg =>
                arg.id === argumentId ? { ...arg, evidenceIds: [...new Set([...arg.evidenceIds, ...checkedIds])], strength: 'Unknown' } : arg
            )
        }));
        setData('strategyData', newStrategyData);
        addToast("Evidence links updated. Re-assess strength for new rating.", "success");
        setSuggestionModal({ isOpen: false, argumentId: null, suggestions: [] });
    };

    const handleApplyArgumentSuggestions = () => {
        const { goalId, suggestions } = argumentSuggestionModal;
        const checkedSuggestions = suggestions.filter(s => s.isChecked).map(s => s.text);
        if (checkedSuggestions.length > 0) {
            addArgumentsToGoal(goalId, checkedSuggestions);
        }
        setArgumentSuggestionModal({ isOpen: false, goalId: null, suggestions: [] });
    };

    const handleArgumentSuggestionCheck = (index) => {
        setArgumentSuggestionModal(prev => ({
            ...prev,
            suggestions: prev.suggestions.map((s, i) => i === index ? { ...s, isChecked: !s.isChecked } : s)
        }));
    };

    const handleDeleteGoal = (goalId) => {
        if (window.confirm("Are you sure you want to delete this entire strategic goal and all its arguments?")) {
            setData('strategyData', strategyData.filter(g => g.id !== goalId));
            addToast("Strategic goal deleted.", "success");
        }
    };
    
    const handleDeleteArgument = (goalId, argumentId) => {
        const newStrategyData = strategyData.map(g => {
            if (g.id === goalId) {
                return {...g, arguments: g.arguments.filter(a => a.id !== argumentId)}
            }
            return g;
        });
        setData('strategyData', newStrategyData);
        addToast("Argument deleted.", "success");
    };
    
    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Case Strategy', icon: 'fa-chess-board' }),
        React.createElement(ArgumentStrengthChart, { strategyData: strategyData }),
        React.createElement('div', { className: 'space-y-6' },
            strategyData.map(goal => React.createElement('div', { key: goal.id, className: 'glass-card p-6' },
                React.createElement('div', {className: 'flex justify-between items-center'},
                    React.createElement('h2', { className: 'text-lg font-semibold text-accent-primary flex items-center' },
                        React.createElement('i', { className: 'fa-solid fa-flag-checkered mr-3' }),
                        goal.text
                    ),
                    React.createElement('div', { className: 'flex items-center gap-2' },
                        React.createElement('button', {
                            onClick: () => handleSuggestArguments(goal),
                            disabled: loadingStates[`goal-${goal.id}`] === 'suggesting_args' || !isAiAvailable,
                            className: 'btn btn-secondary btn-sm',
                            title: 'Suggest new arguments for this goal'
                        },
                            loadingStates[`goal-${goal.id}`] === 'suggesting_args' ? React.createElement(Spinner, { size: 'fa-sm' }) : React.createElement('i', { className: 'fa-solid fa-wand-magic-sparkles' })
                        ),
                        React.createElement('button', {
                            onClick: () => handleDeleteGoal(goal.id),
                            className: 'btn btn-secondary btn-sm text-danger-primary',
                            title: 'Delete this strategic goal'
                        },
                            React.createElement('i', { className: 'fa-solid fa-trash' })
                        )
                    )
                ),
                React.createElement('div', { className: 'space-y-4 mt-4' },
                    goal.arguments.map(argument => {
                        const style = getStrengthStyle(argument.strength);
                        const isHighlighted = highlightedArgument === argument.id;
                        const isExpanded = expandedArgumentId === argument.id;
                        const details = argumentDetails[argument.id];

                        return React.createElement('div', {
                            key: argument.id,
                            ref: isHighlighted ? highlightedRef : null,
                            className: `p-3 rounded-lg transition-all duration-300 ${isHighlighted ? 'bg-accent-primary/20 ring-2 ring-accent-primary' : 'bg-bg-secondary'}`,
                            style: { borderLeft: `4px solid ${style.barColor}` }
                        },
                            React.createElement('p', { className: 'font-medium text-sm' }, argument.text),
                            React.createElement('div', { className: 'flex items-center justify-between mt-2' },
                                React.createElement('div', { className: 'flex items-center gap-3 text-xs' },
                                    React.createElement('span', { className: 'font-semibold py-0.5 px-2 rounded-md', style: { backgroundColor: style.backgroundColor, color: style.color } }, argument.strength),
                                    React.createElement('span', { className: 'text-text-secondary' }, React.createElement('i', { className: 'fa-solid fa-link mr-1' }), `${argument.evidenceIds.length} Evidence`)
                                ),
                                React.createElement('div', { className: 'flex items-center gap-1' },
                                    React.createElement('button', { onClick: () => handleAssessStrength(argument.id), disabled: loadingStates[argument.id] === 'assessing' || !isAiAvailable, className: 'btn btn-secondary btn-sm p-1.5 h-7 w-7 text-xs', title: 'Assess Strength with AI' },
                                        loadingStates[argument.id] === 'assessing' ? React.createElement(Spinner, { size: 'fa-xs' }) : React.createElement('i', { className: 'fa-solid fa-scale-balanced' })
                                    ),
                                    React.createElement('button', { onClick: () => handleSuggestLinks(argument), disabled: loadingStates[argument.id] === 'suggesting' || !isAiAvailable, className: 'btn btn-secondary btn-sm p-1.5 h-7 w-7 text-xs', title: 'Suggest Evidence Links with AI' },
                                        loadingStates[argument.id] === 'suggesting' ? React.createElement(Spinner, { size: 'fa-xs' }) : React.createElement('i', { className: 'fa-solid fa-wand-magic-sparkles' })
                                    ),
                                    React.createElement('button', { onClick: () => handleFleshOutArgument(argument), disabled: loadingStates[argument.id] === 'fleshing_out' || !isAiAvailable || details, className: 'btn btn-secondary btn-sm p-1.5 h-7 w-7 text-xs', title: 'Flesh out argument with AI' },
                                        loadingStates[argument.id] === 'fleshing_out' ? React.createElement(Spinner, { size: 'fa-xs' }) : React.createElement('i', { className: 'fa-solid fa-brain' })
                                    ),
                                    React.createElement('button', { onClick: () => handleToggleDetails(argument.id), className: 'btn btn-secondary btn-sm p-1.5 h-7 w-7 text-xs', title: 'Show Details' },
                                        React.createElement('i', { className: `fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}` })
                                    ),
                                    React.createElement('button', { onClick: () => handleDeleteArgument(goal.id, argument.id), className: 'btn btn-secondary btn-sm p-1.5 h-7 w-7 text-xs text-danger-primary', title: 'Delete Argument' },
                                        React.createElement('i', { className: 'fa-solid fa-trash' })
                                    )
                                )
                            ),
                            isExpanded && React.createElement('div', { className: 'mt-3 pt-3 border-t border-border-primary/50 space-y-3' },
                                details ? React.createElement(React.Fragment, null,
                                    React.createElement(ArgumentDetailSection, { title: "Potential Counter-Arguments", icon: "fa-shield-virus", items: details.counterArguments }),
                                    React.createElement(ArgumentDetailSection, { title: "Mitigation Strategies", icon: "fa-shield-halved", items: details.mitigationStrategies }),
                                    React.createElement(ArgumentDetailSection, { title: "Suggested Additional Evidence", icon: "fa-lightbulb", items: details.evidenceSuggestions })
                                ) : React.createElement('div', { className: 'text-center text-xs text-text-secondary' }, 'Flesh out the argument with AI to see detailed analysis.')
                            )
                        );
                    })
                )
            ))
        ),
        React.createElement(Modal, { isOpen: suggestionModal.isOpen, onClose: () => setSuggestionModal({ isOpen: false, argumentId: null, suggestions: [] }) },
            React.createElement('div', null,
                React.createElement('h2', { className: 'text-xl font-bold mb-4' }, 'AI-Suggested Evidence Links'),
                React.createElement('div', { className: 'space-y-2 max-h-80 overflow-y-auto' },
                    suggestionModal.suggestions.map(evidence => React.createElement('label', { key: evidence.id, className: 'flex items-start p-3 bg-bg-secondary rounded-md cursor-pointer' },
                        React.createElement('input', { type: 'checkbox', checked: evidence.isChecked, onChange: () => handleSuggestionCheck(evidence.id), className: 'form-checkbox h-5 w-5 mt-1' }),
                        React.createElement('div', { className: 'ml-3' },
                            React.createElement('p', { className: 'font-semibold' }, evidence.fileName),
                            React.createElement('p', { className: 'text-xs text-text-secondary' }, evidence.description)
                        )
                    ))
                ),
                React.createElement('div', { className: 'flex justify-end gap-2 mt-6' },
                    React.createElement('button', { type: 'button', onClick: () => setSuggestionModal({ isOpen: false, argumentId: null, suggestions: [] }), className: 'btn btn-secondary' }, 'Cancel'),
                    React.createElement('button', { onClick: handleApplySuggestions, className: 'btn btn-primary' }, 'Link Selected Evidence')
                )
            )
        ),
        React.createElement(Modal, { isOpen: argumentSuggestionModal.isOpen, onClose: () => setArgumentSuggestionModal({ isOpen: false, goalId: null, suggestions: [] }) },
            React.createElement('div', null,
                React.createElement('h2', { className: 'text-xl font-bold mb-4' }, 'AI-Suggested Arguments'),
                React.createElement('div', { className: 'space-y-2 max-h-80 overflow-y-auto' },
                    argumentSuggestionModal.suggestions.map((suggestion, index) => React.createElement('label', { key: index, className: 'flex items-start p-3 bg-bg-secondary rounded-md cursor-pointer' },
                        React.createElement('input', { type: 'checkbox', checked: suggestion.isChecked, onChange: () => handleArgumentSuggestionCheck(index), className: 'form-checkbox h-5 w-5 mt-1' }),
                        React.createElement('p', { className: 'ml-3 text-sm' }, suggestion.text)
                    ))
                ),
                React.createElement('div', { className: 'flex justify-end gap-2 mt-6' },
                    React.createElement('button', { type: 'button', onClick: () => setArgumentSuggestionModal({ isOpen: false, goalId: null, suggestions: [] }), className: 'btn btn-secondary' }, 'Cancel'),
                    React.createElement('button', { onClick: handleApplyArgumentSuggestions, className: 'btn btn-primary' }, 'Add Selected Arguments')
                )
            )
        )
    );
}
