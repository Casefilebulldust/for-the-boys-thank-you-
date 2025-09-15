
import React, { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';
import { useToast } from './ToastContext.tsx';
import useStickyState from '../hooks/useStickyState.ts';
import { defaultData } from '../constants.ts';
import { SpudHubData, Evidence, ActionItem, WellnessLog, AccountabilityEntry, StrategyGoal, NdisData, FamilyData, Mission, Child, ChildAdvocacyItem, Theme, NexusGraphData, NexusNode, NexusLink, PersonalVaultEntry, Campaign } from '../services/types.ts';
import { generateMissionPlan, analyzeFailureImpact, extractEntitiesAndTags, generateAdvocacyPlan } from '../services/geminiService.ts';


const SpudHubContext = createContext(undefined);

export function SpudHubProvider({ children }) {
    const { addToast } = useToast();
    const [isDataLoading, setIsDataLoading] = useState(true);
    
    const [allData, setAllData] = useStickyState<SpudHubData>(defaultData, 'spudHubData');
    
    const [activeTab, setActiveTab] = useState('War Room');
    const [actionToExecute, setActionToExecute] = useState(null);
    const [highlightedArgument, setHighlightedArgument] = useState(null);
    const [missionGenState, setMissionGenState] = useState({ isLoading: false, objective: '' });

    // Initial load toast
    useEffect(() => {
        addToast("Spud Hub OS: Citadel of Flames Edition is online.", "info");
        setIsDataLoading(false);
    }, [addToast]);
    
    // Generic updater for any top-level key
    const setData = useCallback(<K extends keyof SpudHubData>(key: K, value: SpudHubData[K]) => {
        setAllData(prev => ({ ...prev, [key]: value }));
    }, [setAllData]);

    const deleteById = useCallback((key: keyof SpudHubData, id: number) => {
        setAllData(prev => {
            const dataArray = prev[key];
            if (Array.isArray(dataArray)) {
                return { ...prev, [key]: dataArray.filter(item => item.id !== id) };
            }
            return prev;
        });
    }, [setAllData]);

    const updateById = useCallback((key: keyof SpudHubData, id: number, payload: object) => {
        setAllData(prev => {
            const dataArray = prev[key];
            if (Array.isArray(dataArray)) {
                return { ...prev, [key]: dataArray.map(item => item.id === id ? { ...item, ...payload } : item) };
            }
            return prev;
        });
    }, [setAllData]);


    const hideCommandDeck = useCallback(() => {
        setData('showCommandDeck', false);
    }, [setData]);
    
    const markRevealAsShown = useCallback(() => {
        setData('revealShown', true);
    }, [setData]);

    const updateTheme = useCallback((theme: Theme) => {
        setData('activeTheme', theme);
    }, [setData]);

    const addEvidence = useCallback(async (fileName: string, description: string, date: string, userTags: string[] = []) => {
        const newEvidence: Evidence = {
            id: Date.now(),
            fileName,
            description,
            date,
            tags: userTags,
            entities: { dates: [], names: [], refs: [], orgs: [] }
        };

        setAllData(prev => ({
            ...prev,
            evidenceData: [newEvidence, ...prev.evidenceData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }));
        addToast("Evidence record added.", "success");

        if (process.env.API_KEY) {
            try {
                const { entities, tags: aiTags } = await extractEntitiesAndTags(description, allData.promptSettings.extractEntitiesAndTags);
                const combinedTags = [...new Set([...userTags, ...aiTags])];
                
                updateById('evidenceData', newEvidence.id, { entities, tags: combinedTags });
                addToast("AI entity and tag extraction complete.", "info");
            } catch (e) {
                const error = e instanceof Error ? e : new Error(String(e));
                addToast(`AI Analysis Failed: ${error.message}`, "error");
            }
        }
        
        return newEvidence;
    }, [addToast, setAllData, allData.promptSettings.extractEntitiesAndTags, updateById]);


    const addActionItem = useCallback((item: Partial<ActionItem>) => {
        const newActionItem: ActionItem = { id: Date.now(), status: 'Draft', notes: `Generated on ${new Date().toLocaleDateString()}.`, ...item } as ActionItem;
        setData('actionItems', [newActionItem, ...allData.actionItems]);
        addToast("New action item created.", "success");
    }, [addToast, allData.actionItems, setData]);

    const addWellnessLog = useCallback((log: Omit<WellnessLog, 'id' | 'date'>) => {
        const newLog: WellnessLog = { id: Date.now(), date: new Date().toISOString(), ...log };
        setData('wellnessLogs', [newLog, ...allData.wellnessLogs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        addToast("Wellness log saved.", "success");
    }, [addToast, allData.wellnessLogs, setData]);
    
    const generateChildAdvocacyPlan = useCallback(async (childId: number) => {
        const child = allData.familyData.children.find(c => c.id === childId);
        if (!child || !process.env.API_KEY) {
            addToast("Cannot generate plan. API key may be missing.", "error");
            return;
        }
        
        try {
            const { plan } = await generateAdvocacyPlan(child, allData.promptSettings.generateAdvocacyPlan);
            const newAdvocacyItems: ChildAdvocacyItem[] = plan.map(goalText => ({
                id: Date.now() + Math.random(),
                goal: goalText,
                status: 'active',
                actions: []
            }));

            const newFamilyData = {
                ...allData.familyData,
                children: allData.familyData.children.map(c => c.id === childId ? { ...c, advocacyPlan: newAdvocacyItems } : c)
            };
            setData('familyData', newFamilyData);

            addToast(`Advocacy plan generated for ${child.name}.`, "success");
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Plan Generation Failed: ${error.message}`, "error");
            throw e;
        }
    }, [allData.familyData, allData.promptSettings.generateAdvocacyPlan, setData, addToast]);

    const addAccountabilityEntry = useCallback((entry: Omit<AccountabilityEntry, 'id'>) => {
        const newEntry: AccountabilityEntry = { id: Date.now(), status: 'Logged', ...entry };
        setData('accountabilityEntries', [newEntry, ...allData.accountabilityEntries].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        addToast("Charge added to the Accountability Citadel.", "success");
    }, [addToast, allData.accountabilityEntries, setData]);
    
    const analyzeImpactForCharge = useCallback(async (entryId: number) => {
        const entry = allData.accountabilityEntries.find(e => e.id === entryId);
        if (!entry) return;
        
        try {
            const analysis = await analyzeFailureImpact(entry, allData.promptSettings.analyzeFailureImpact);
            updateById('accountabilityEntries', entryId, { impactAnalysis: analysis });
            addToast("Impact analysis complete.", "success");
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Analysis failed: ${error.message}`, "error");
            throw e; // re-throw for the component to handle loading state
        }
    }, [allData.accountabilityEntries, allData.promptSettings.analyzeFailureImpact, updateById, addToast]);

    const createMission = useCallback(async (objective: string, campaignId?: number) => {
        setMissionGenState({ isLoading: true, objective });
        setActiveTab('Missions');
        try {
            const { promptSettings, missions, ...snapshot } = allData;
            const newMissionPlan = await generateMissionPlan(objective, snapshot, promptSettings.generateMissionPlan);
            const newMission: Mission = {
                id: Date.now(),
                ...newMissionPlan,
                status: 'suggested',
                campaignId: campaignId
            };
            setData('missions', [newMission, ...allData.missions]);
            addToast(`New Mission "${newMission.title}" has been generated!`, "success");
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Mission generation failed: ${error.message}`, 'error');
        } finally {
            setMissionGenState({ isLoading: false, objective: '' });
        }
    }, [allData, addToast, setData, setActiveTab]);
    
    const addArgumentsToGoal = useCallback((goalId, newArguments) => {
        const newStrategyData = allData.strategyData.map(goal => {
            if (goal.id === goalId) {
                const addedArgs = newArguments.map(argText => ({
                    id: Date.now() + Math.random(),
                    text: argText,
                    evidenceIds: [],
                    strength: 'Unknown'
                }));
                return { ...goal, arguments: [...goal.arguments, ...addedArgs] };
            }
            return goal;
        });
        setData('strategyData', newStrategyData);
        addToast(`${newArguments.length} new argument(s) added.`, "success");
    }, [allData.strategyData, setData, addToast]);

    const executeAction = useCallback((action) => {
        setActionToExecute(action);
        setActiveTab('Advocacy Assistant');
        addToast("Advocacy Assistant prepped for action!", "info");
    }, [setActiveTab, addToast]);

    const clearAction = useCallback(() => setActionToExecute(null), []);
    const clearHighlights = useCallback(() => setHighlightedArgument(null), []);

    const executeInsightAction = useCallback((action) => {
        switch (action.type) {
            case 'NAVIGATE': setActiveTab(action.payload.tab); break;
            case 'PRIME_ADVOCACY': executeAction(action.payload); break;
            case 'HIGHLIGHT_STRATEGY': setActiveTab('Case Strategy'); setTimeout(() => setHighlightedArgument(action.payload.argumentId), 50); break;
            case 'CREATE_MISSION': createMission(action.payload.objective); break;
        }
    }, [setActiveTab, executeAction, createMission]);

    const handleResetData = useCallback(() => {
        if (window.confirm("Are you absolutely sure you want to reset ALL application data? This action cannot be undone and will erase everything from this browser.")) {
            localStorage.removeItem('spudHubData');
            window.location.reload();
        }
    }, []);

    const importData = useCallback((jsonString: string) => {
        if (!window.confirm("This will overwrite all current data in this browser. This cannot be undone. Are you sure you want to proceed?")) {
            return;
        }
        try {
            const newData = JSON.parse(jsonString);
            if (typeof newData === 'object' && newData !== null && 'caseData' in newData && 'activeTheme' in newData) {
                setAllData(newData);
                addToast('Data imported successfully. Reloading application...', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                addToast('Import failed: The file does not appear to be a valid backup.', 'error');
            }
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Import failed: ${error.message}`, 'error');
        }
    }, [setAllData, addToast]);

    const nexusGraphData = useMemo<NexusGraphData>(() => {
        const nodes: NexusNode[] = [];
        const links: NexusLink[] = [];

        allData.evidenceData.forEach(e => nodes.push({ id: `evidence-${e.id}`, label: e.fileName, type: 'Evidence', originalId: e.id }));
        
        allData.strategyData.forEach(goal => {
            nodes.push({ id: `goal-${goal.id}`, label: `Goal: ${goal.text.substring(0, 30)}...`, type: 'Goal', originalId: goal.id }));
            goal.arguments.forEach(a => {
                nodes.push({ id: `argument-${a.id}`, label: a.text, type: 'Argument', originalId: a.id });
                links.push({ source: `goal-${goal.id}`, target: `argument-${a.id}` });
                a.evidenceIds.forEach(eid => links.push({ source: `argument-${a.id}`, target: `evidence-${eid}` }));
            });
        });

        allData.accountabilityEntries.forEach(c => {
            nodes.push({ id: `charge-${c.id}`, label: `${c.agency}: ${c.failure.substring(0, 30)}...`, type: 'Charge', originalId: c.id });
            if (c.evidenceId) {
                links.push({ source: `charge-${c.id}`, target: `evidence-${c.evidenceId}` });
            }
        });
        
        allData.missions.filter(m => m.status === 'active').forEach(m => nodes.push({ id: `mission-${m.id}`, label: `Mission: ${m.title}`, type: 'Mission', originalId: m.id }));

        return { nodes, links };
    }, [allData.evidenceData, allData.strategyData, allData.accountabilityEntries, allData.missions]);

    // === NEW CRUD OPERATIONS ===
    const addCampaign = useCallback((title: string, objective: string) => {
        const newCampaign: Campaign = {
            id: Date.now(),
            title,
            objective,
            status: 'active',
        };
        setData('campaigns', [...allData.campaigns, newCampaign]);
        addToast(`New campaign "${title}" created.`, "success");
    }, [allData.campaigns, setData, addToast]);
    
    const updateMissionStep = useCallback((missionId, stepId, payload) => {
        const newMissions = allData.missions.map(m => {
            if (m.id === missionId) {
                const newSteps = m.steps.map(s => s.id === stepId ? {...s, ...payload} : s);
                // Check if all steps are complete to update mission status
                const allComplete = newSteps.every(s => s.status === 'complete');
                return { ...m, steps: newSteps, status: allComplete ? 'complete' : m.status };
            }
            return m;
        });
        setData('missions', newMissions);
    }, [allData.missions, setData]);
    
    const addPersonalVaultEntry = useCallback((title, content) => {
        const newEntry: PersonalVaultEntry = {
            id: Date.now(),
            date: new Date().toISOString(),
            title,
            content
        };
        setData('personalVaultData', [newEntry, ...allData.personalVaultData]);
        addToast("New vault entry created.", "success");
        return newEntry.id;
    }, [allData.personalVaultData, setData, addToast]);

    const updatePersonalVaultEntry = useCallback((id, title, content) => {
        updateById('personalVaultData', id, { title, content });
        addToast("Vault entry saved.", "success");
    }, [updateById, addToast]);
    
    const deletePersonalVaultEntry = useCallback((id) => {
        if(window.confirm("Are you sure you want to permanently delete this vault entry?")) {
            deleteById('personalVaultData', id);
            addToast("Vault entry deleted.", "success");
        }
    }, [deleteById, addToast]);

    const contextValue = useMemo(() => ({
        ...allData,
        isAiAvailable: !!process.env.API_KEY,
        activeTab, setActiveTab,
        isDataLoading,
        hideCommandDeck,
        markRevealAsShown,
        setData, // Generic setter for top-level keys
        deleteById,
        updateById,
        addEvidence,
        addActionItem,
        addWellnessLog,
        addAccountabilityEntry,
        analyzeImpactForCharge,
        generateChildAdvocacyPlan,
        addArgumentsToGoal,
        handleResetData,
        importData,
        executeAction,
        clearAction,
        actionToExecute,
        executeInsightAction,
        highlightedArgument,
        clearHighlights,
        createMission,
        missionGenState,
        nexusGraphData,
        addCampaign,
        updateMissionStep,
        addPersonalVaultEntry,
        updatePersonalVaultEntry,
        deletePersonalVaultEntry,
        // Expose specific setters for complex nested data
        setFamilyData: (familyData: FamilyData) => setData('familyData', familyData),
        setNdisData: (ndisData: NdisData) => setData('ndisData', ndisData)
    }), [
        allData, activeTab, isDataLoading, hideCommandDeck, markRevealAsShown,
        setData, deleteById, updateById, addEvidence, addActionItem, addWellnessLog,
        addAccountabilityEntry, analyzeImpactForCharge, generateChildAdvocacyPlan,
        addArgumentsToGoal, handleResetData, importData, executeAction,
        clearAction, actionToExecute, executeInsightAction, highlightedArgument,
        clearHighlights, createMission, missionGenState, nexusGraphData, addCampaign,
        updateMissionStep, addPersonalVaultEntry,
        updatePersonalVaultEntry, deletePersonalVaultEntry
    ]);

    return React.createElement(SpudHubContext.Provider, { value: contextValue }, children);
}

export function useSpudHub() {
    const context = useContext(SpudHubContext);
    if (context === undefined) {
        throw new Error('useSpudHub must be used within a SpudHubProvider');
    }
    return context;
}
