import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CaseData, NdisData, Evidence, FamilyData, ActionItem, WellnessLog, AccountabilityEntry, StrategyGoal, StrategyArgument, PromptSettings, ThreatMatrix, Mission, ContextualSuggestion, EvidenceEntities, NexusNode, NexusLink, Child, TimelineEvent } from './types.ts';

let aiInstance: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
    if (aiInstance) {
        return aiInstance;
    }
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY environment variable is not configured. Please set it up to use AI features.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
    return aiInstance;
}

async function geminiApiCallWithRetry<T>(apiCall: (ai: GoogleGenAI) => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
    let attempt = 0;
    let delay = initialDelay;

    while (attempt <= maxRetries) {
        try {
            return await apiCall(getAi());
        } catch (error) {
            const isRateLimitError = error.toString().includes('429') || /rate limit/i.test(error.toString());
            
            if (isRateLimitError && attempt < maxRetries) {
                console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
                delay *= 2; // Exponential backoff
            } else {
                if (isRateLimitError) {
                    throw new Error("The AI service is currently busy. Please try again in a few moments.");
                }
                const message = error?.message || error?.toString() || "An unknown AI error occurred.";
                console.error("Gemini API Error:", error);
                throw new Error(message);
            }
        }
    }
    throw new Error("Max retries exceeded for AI API call.");
}

export async function getOsResponseStream(userInput: string, snapshot: any, promptTemplate: string) {
    const fullPrompt = promptTemplate
        .replace('{{caseData}}', JSON.stringify(snapshot, null, 2));

    const contents = `${fullPrompt}\n\nOPERATOR QUERY:\n${userInput}`;
    
    const ai = getAi();
    // This function can throw, so we let the component handle the try/catch
    const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: contents
    });
    return response;
}

export async function getNexusInsights(nodes: NexusNode[], links: NexusLink[], promptTemplate: string): Promise<string> {
    const prompt = promptTemplate
        .replace('{{nodes}}', JSON.stringify(nodes.map(n => ({ id: n.id, type: n.type, label: n.label }))))
        .replace('{{links}}', JSON.stringify(links));

    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    }));
    return response.text;
}

export async function analyzeFailureImpact(entry: AccountabilityEntry, promptTemplate: string): Promise<string> {
    const prompt = promptTemplate
        .replace('{{agency}}', entry.agency)
        .replace('{{date}}', entry.date)
        .replace('{{failure}}', entry.failure)
        .replace('{{expectedAction}}', entry.expectedAction);
    
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    }));
    return response.text;
}

export async function extractEntitiesAndTags(description: string, promptTemplate: string): Promise<{ entities: EvidenceEntities, tags: string[] }> {
    const prompt = promptTemplate.replace('{{description}}', description);
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    entities: {
                        type: Type.OBJECT,
                        properties: {
                            dates: { type: Type.ARRAY, items: { type: Type.STRING } },
                            names: { type: Type.ARRAY, items: { type: Type.STRING } },
                            refs: { type: Type.ARRAY, items: { type: Type.STRING } },
                            orgs: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ["dates", "names", "refs", "orgs"]
                    },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['entities', 'tags']
            }
        }
    }));
    return JSON.parse(response.text);
}


export async function getContextualSuggestion(context: { activeTab: string; data: any }, promptTemplate: string): Promise<ContextualSuggestion> {
    const prompt = promptTemplate
        .replace('{{activeTab}}', context.activeTab)
        .replace('{{data}}', JSON.stringify(context.data, null, 2));

    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    action: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING },
                            payload: {
                                type: Type.OBJECT,
                                properties: {
                                    tab: { type: Type.STRING },
                                    tool: { type: Type.STRING },
                                    situation: { type: Type.STRING },
                                    argumentId: { type: Type.NUMBER },
                                    objective: { type: Type.STRING }
                                }
                            }
                        },
                        required: ["type", "payload"]
                    }
                },
                required: ["text", "action"]
            }
        }
    }));
    return JSON.parse(response.text);
}


export async function analyzeDocument(mimeType: string, base64Data: string, promptTemplate: string) {
    const textPart = { text: promptTemplate };
    const filePart = { inlineData: { mimeType, data: base64Data } };

    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, filePart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    documentType: { type: Type.STRING },
                    keyEntities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedActions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, details: { type: Type.STRING }, to: { type: Type.STRING }, subject: { type: Type.STRING }, body: { type: Type.STRING }, }, required: ["type"] } }
                },
                required: ["summary", "documentType", "keyEntities", "suggestedActions"]
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function analyzeEmail(emailData: { from: string; to: string; subject: string; date: string; body: string }, promptTemplate: string) {
    const prompt = promptTemplate
        .replace('{{from}}', emailData.from)
        .replace('{{to}}', emailData.to)
        .replace('{{subject}}', emailData.subject)
        .replace('{{date}}', emailData.date)
        .replace('{{body}}', emailData.body);

    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    keyEntities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedActions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, details: { type: Type.STRING }, to: { type: Type.STRING }, subject: { type: Type.STRING }, body: { type: Type.STRING }, }, required: ["type"] } }
                },
                required: ["summary", "keyEntities", "suggestedActions"]
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function analyzeQuickNote(note: string, promptTemplate: string) {
    const prompt = promptTemplate.replace('{{note}}', note);
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    keyEntities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedActions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, details: { type: Type.STRING }, to: { type: Type.STRING }, subject: { type: Type.STRING }, body: { type: Type.STRING }, }, required: ["type"] } }
                },
                required: ["summary", "keyEntities", "suggestedActions"]
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function getStrategicAdvice(snapshot: any, promptTemplate: string): Promise<{ threats: string[], opportunities: string[] }> {
    const caseSummary = `
- Key Cases: ${JSON.stringify(snapshot.caseData.caseReferences)}
- Evidence Count: ${snapshot.evidenceData.length}
- Accountability Charges: ${snapshot.accountabilityEntries.length}
- Active Missions: ${snapshot.missions.filter(m => m.status === 'active').length}
- Weakest Argument: ${snapshot.strategyData.flatMap(g => g.arguments).filter(a => a.strength === 'Weak' || a.strength === 'Unknown')[0]?.text || 'None'}
`;
    const prompt = promptTemplate.replace('{{caseSummary}}', caseSummary);

    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    threats: { type: Type.ARRAY, items: { type: Type.STRING } },
                    opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["threats", "opportunities"]
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function getHUDStatus(snapshot: any, promptTemplate: string): Promise<{ hud: string }> {
    const weakArguments = snapshot.strategyData.flatMap(g => g.arguments).filter(a => a.strength === 'Weak' || a.strength === 'Unknown');
    const overdueActions = snapshot.actionItems.filter(a => a.status === 'Awaiting Reply' && a.dueDate && new Date(a.dueDate) < new Date());

    const cleanSnapshot = {
        urgentAgenda: snapshot.familyData.agenda.filter(a => a.isUrgent).map(a => a.title),
        latestWellness: snapshot.wellnessLogs[0] ? { stress: snapshot.wellnessLogs[0].stress, pain: snapshot.wellnessLogs[0].pain } : null,
        weakestArgument: weakArguments.length > 0 ? weakArguments[0].text : null,
        overdueActionCount: overdueActions.length,
    };
    const prompt = promptTemplate.replace('{{snapshot}}', JSON.stringify(cleanSnapshot, null, 2));
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: { hud: { type: Type.STRING } },
                required: ['hud']
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function getThreatMatrix(snapshot: any, promptTemplate: string): Promise<ThreatMatrix> {
     const weakArguments = snapshot.strategyData.flatMap((g) => g.arguments).filter((a) => a.strength === 'Weak' || a.strength === 'Unknown');
    const cleanSnapshot = {
        agenda: snapshot.familyData.agenda.map((a) => ({ title: a.title, isUrgent: a.isUrgent })),
        latestWellness: snapshot.wellnessLogs[0] ? { stress: snapshot.wellnessLogs[0].stress, pain: snapshot.wellnessLogs[0].pain, notes: snapshot.wellnessLogs[0].notes } : null,
        openActionItems: snapshot.actionItems.filter((a) => a.status === 'Draft').map(a => a.subject),
        weakArguments: weakArguments.map((a) => ({ id: a.id, text: a.text })),
        evidenceCount: snapshot.evidenceData.length,
        childrensNeeds: snapshot.familyData.children.map(c => ({ name: c.name, needs: c.needs })),
    };
    const prompt = promptTemplate.replace('{{snapshot}}', JSON.stringify(cleanSnapshot, null, 2));

    const itemSchema = {
        type: Type.OBJECT,
        properties: {
            text: { type: Type.STRING },
            action: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING },
                    payload: {
                        type: Type.OBJECT,
                        properties: {
                            tab: { type: Type.STRING },
                            tool: { type: Type.STRING },
                            situation: { type: Type.STRING },
                            argumentId: { type: Type.NUMBER },
                            objective: { type: Type.STRING }
                        }
                    }
                },
                required: ["type", "payload"]
            }
        },
        required: ["text", "action"]
    };

    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    urgentThreats: { type: Type.ARRAY, items: itemSchema },
                    strategicOpportunities: { type: Type.ARRAY, items: itemSchema },
                    resourceDrainers: { type: Type.ARRAY, items: itemSchema },
                    quickWins: { type: Type.ARRAY, items: itemSchema }
                },
                required: ["urgentThreats", "strategicOpportunities", "resourceDrainers", "quickWins"]
            }
        }
    }));
    return JSON.parse(response.text);
}


export async function generateMissionPlan(objective: string, snapshot: any, promptTemplate: string): Promise<Omit<Mission, 'id' | 'status'>> {
    const cleanSnapshot = {
        agenda: snapshot.familyData.agenda.map(a => ({ title: a.title, isUrgent: a.isUrgent })),
        evidenceSummary: snapshot.evidenceData.map(e => e.description),
        strategyGoals: snapshot.strategyData.map(g => g.text),
        openActionItems: snapshot.actionItems.filter(a => a.status === 'Draft').map(a => a.subject),
    };
    const prompt = promptTemplate
        .replace('{{objective}}', objective)
        .replace('{{snapshot}}', JSON.stringify(cleanSnapshot, null, 2));

    const actionSchema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING },
            payload: {
                type: Type.OBJECT,
                properties: {
                    tab: { type: Type.STRING },
                    tool: { type: Type.STRING },
                    situation: { type: Type.STRING },
                    argumentId: { type: Type.NUMBER }
                }
            }
        },
        required: ["type", "payload"]
    };

    const stepSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            action: actionSchema
        },
        required: ["title", "description", "action"]
    };

    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    objective: { type: Type.STRING },
                    steps: { type: Type.ARRAY, items: stepSchema }
                },
                required: ["title", "objective", "steps"]
            }
        }
    }));
    const parsed = JSON.parse(response.text);
    // Add IDs and other fields to steps locally
    parsed.steps = parsed.steps.map(step => ({...step, id: Date.now() + Math.random(), status: 'pending', notes: '', subTasks: []}));
    return parsed;
}

export async function suggestMissionObjectives(snapshot: any, promptTemplate: string): Promise<{ objectives: string[] }> {
    const cleanSnapshot = {
        agenda: snapshot.familyData.agenda.map(a => a.title),
        childrensNeeds: snapshot.familyData.children.flatMap(c => c.needs),
        weakArguments: snapshot.strategyData.flatMap(g => g.arguments).filter(a => a.strength === 'Weak' || a.strength === 'Unknown').map(a => a.text),
        openActionItems: snapshot.actionItems.filter(a => a.status === 'Draft').map(a => a.subject),
    };
    const prompt = promptTemplate.replace('{{snapshot}}', JSON.stringify(cleanSnapshot, null, 2));
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    objectives: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['objectives']
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function getRebuttal(risk: string, promptTemplate: string) {
    const prompt = promptTemplate.replace('{{risk}}', risk);
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
    return response.text;
}

export async function getActionTool(action: string, promptTemplate: string) {
    const prompt = promptTemplate.replace('{{action}}', action);
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: { tool: { type: Type.STRING }, situation: { type: Type.STRING } },
                required: ["tool", "situation"]
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function suggestFollowUpEmail(actionItem: ActionItem, promptTemplate: string): Promise<{ subject: string; body: string }> {
    const prompt = promptTemplate
        .replace('{{to}}', actionItem.to)
        .replace('{{subject}}', actionItem.subject)
        .replace('{{sentDate}}', new Date(actionItem.id).toLocaleDateString())
        .replace('{{currentDate}}', new Date().toLocaleDateString())
        .replace('{{body}}', actionItem.body);
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING },
                    body: { type: Type.STRING },
                },
                required: ['subject', 'body']
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function generateAdvocacyContent(mode: string, situation: string, caseData: CaseData, evidenceData: Evidence[], promptTemplate: string) {
    const modeDetails = { script: { type: 'phone script' }, email: { type: 'professional email' }, ghostwriter: { type: 'formal document with markdown formatting (headings, bold text, lists)' } };
    const { type } = modeDetails[mode];
    const evidenceList = evidenceData.map((e) => e.fileName).join(', ');
    const caseContext = `- Key Cases: ${caseData.caseReferences.map((c) => `${c.name} (${c.ref})`).join(', ')}. - Critical Events: DVO issued (Mar 2021), Hayden's accident (Jun 2025), Unauthorized NDIS/School access (Jul 2025), Homelessness, user is in pain and exhausted.`;
    const prompt = promptTemplate.replace('{{type}}', type).replace('{{caseContext}}', caseContext).replace('{{evidenceList}}', evidenceList).replace('{{situation}}', situation);
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
    return response.text;
}

export async function generateAdvocacyContentStream(mode: string, situation: string, caseData: CaseData, evidenceData: Evidence[], promptTemplate: string) {
    const modeDetails = { script: { type: 'phone script' }, email: { type: 'professional email' }, ghostwriter: { type: 'formal document with markdown formatting (headings, bold text, lists)' } };
    const { type } = modeDetails[mode];
    const evidenceList = evidenceData.map((e) => e.fileName).join(', ');
    const caseContext = `- Key Cases: ${caseData.caseReferences.map((c) => `${c.name} (${c.ref})`).join(', ')}. - Critical Events: DVO issued (Mar 2021), Hayden's accident (Jun 2025), Unauthorized NDIS/School access (Jul 2025), Homelessness, user is in pain and exhausted.`;
    const prompt = promptTemplate.replace('{{type}}', type).replace('{{caseContext}}', caseContext).replace('{{evidenceList}}', evidenceList).replace('{{situation}}', situation);
    
    const ai = getAi();
    const response = await ai.models.generateContentStream({ model: 'gemini-2.5-flash', contents: prompt });
    return response;
}

export async function suggestNextStepForChild(child, promptTemplate: string) {
    const childDetails = `- Name: ${child.name} - Age: ${child.age} - Current Status: ${child.status} - Documented Needs: ${child.needs.join(', ')}`;
    const prompt = promptTemplate.replace('{{childDetails}}', childDetails);
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
    return response.text;
}

export async function generateAdvocacyPlan(child: Child, promptTemplate: string): Promise<{ plan: string[] }> {
    const prompt = promptTemplate.replace('{{needs}}', child.needs.join(', '));
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    plan: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['plan']
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function generateFamilyBriefing(caseData, promptTemplate: string): Promise<string> {
    const cleanCaseData = {
        recentEvidence: caseData.evidenceData.slice(0, 3).map(e => e.description),
        completedMissions: caseData.missions.filter(m => m.status === 'complete').map(m => m.title),
        childrensNeeds: caseData.familyData.children.map(c => ({ name: c.name, needs: c.needs })),
        recentWellness: caseData.wellnessLogs[0] ? { stress: caseData.wellnessLogs[0].stress, notes: caseData.wellnessLogs[0].notes } : null,
    };
    const prompt = promptTemplate.replace('{{caseData}}', JSON.stringify(cleanCaseData, null, 2));
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    }));
    return response.text;
}

export async function getResilienceCoaching(wellnessLogs: WellnessLog[], actionItems: ActionItem[], familyData: FamilyData, promptTemplate: string, refinementFocus?: string) {
    const context = { latestWellness: wellnessLogs.length > 0 ? wellnessLogs[0] : null, urgentAgenda: familyData.agenda.filter((item) => item.isUrgent), draftActions: actionItems.filter((item) => item.status === 'Draft').map((item) => ({ subject: item.subject })) };
    
    let prompt = promptTemplate.replace('{{context}}', JSON.stringify(context, null, 2));

    if (refinementFocus) {
        prompt += `\n\nUSER IS CURRENTLY FOCUSED ON: "${refinementFocus}". Tailor the coaching to specifically address this feeling or situation.`;
    }
    
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
    return response.text;
}

export async function generateAccountabilitySummary(entries: AccountabilityEntry[], promptTemplate: string) {
    const prompt = promptTemplate.replace('{{entries}}', JSON.stringify(entries, null, 2));
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
    return response.text;
}

export async function getArgumentStrength(argument: StrategyArgument, evidence: Evidence[], promptTemplate: string) {
    const relevantEvidence = evidence.filter(e => argument.evidenceIds.includes(e.id));
    if (relevantEvidence.length === 0) {
        return 'Weak';
    }
    const evidenceDescriptions = relevantEvidence.map(e => `- ${e.fileName}: ${e.description}`).join('\n');
    const prompt = promptTemplate.replace('{{argument}}', argument.text).replace('{{evidence}}', evidenceDescriptions);
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: { strength: { type: Type.STRING } },
                required: ["strength"]
            }
        }
    }));
    const result = JSON.parse(response.text);
    return result.strength;
}

export async function getStrategySuggestion(strategyData: StrategyGoal[], promptTemplate: string) {
    const prompt = promptTemplate.replace('{{strategy}}', JSON.stringify(strategyData, null, 2));
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
    return response.text;
}

export async function getArgumentDetails(argument: StrategyArgument, evidence: Evidence[], caseContext: string, promptTemplate: string) {
    const evidenceDescriptions = evidence.map(e => `- ${e.fileName}: ${e.description}`).join('\n') || 'None';
    const prompt = promptTemplate
        .replace('{{argument.text}}', argument.text)
        .replace('{{evidence}}', evidenceDescriptions)
        .replace('{{caseContext}}', caseContext);

    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    counterArguments: { type: Type.ARRAY, items: { type: Type.STRING } },
                    mitigationStrategies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    evidenceSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["counterArguments", "mitigationStrategies", "evidenceSuggestions"]
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function suggestStrategicGoals(snapshot, promptTemplate: string) {
    const cleanSnapshot = {
        currentStrategy: snapshot.strategyData.map(g => g.text),
        evidenceSummary: snapshot.evidenceData.map(e => e.description),
        childrensNeeds: snapshot.familyData.children.flatMap(c => c.needs),
        accountabilityFailures: snapshot.accountabilityEntries.map(e => e.failure)
    };
    const prompt = promptTemplate.replace('{{snapshot}}', JSON.stringify(cleanSnapshot, null, 2));
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    goals: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["goals"]
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function suggestEvidenceTags(description: string, promptTemplate: string): Promise<{ tags: string[] }> {
    const prompt = promptTemplate.replace('{{description}}', description);
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: { tags: { type: Type.ARRAY, items: { type: Type.STRING } } },
                required: ['tags']
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function getProactiveInsight(snapshot, promptTemplate: string) {
    const weakArguments = snapshot.strategyData.flatMap((g) => g.arguments).filter((a) => a.strength === 'Weak' || a.strength === 'Unknown');
    const cleanSnapshot = { agenda: snapshot.familyData.agenda.map((a) => ({ title: a.title, isUrgent: a.isUrgent })), latestWellness: snapshot.wellnessLogs[0] ? { stress: snapshot.wellnessLogs[0].stress, pain: snapshot.wellnessLogs[0].pain } : null, openActionCount: snapshot.actionItems.filter((a) => a.status === 'Draft').length, weakArguments: weakArguments.map((a) => ({ id: a.id, text: a.text })) };
    const prompt = promptTemplate.replace('{{snapshot}}', JSON.stringify(cleanSnapshot, null, 2));
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING, description: "The single line of insight text to display to the user, starting with 'SpudBud Insight:'." },
                    action: {
                        type: Type.OBJECT,
                        properties: { type: { type: Type.STRING, description: "Action type: 'NAVIGATE', 'PRIME_ADVOCACY', or 'HIGHLIGHT_STRATEGY'." }, payload: { type: Type.OBJECT, properties: { tab: { type: Type.STRING }, tool: { type: Type.STRING }, situation: { type: Type.STRING }, argumentId: { type: Type.NUMBER } } } },
                        required: ["type", "payload"]
                    }
                },
                required: ["text", "action"]
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function findRelevantEvidence(argumentText: string, allEvidence: Evidence[], promptTemplate: string) {
    const evidenceList = allEvidence.map(e => ({ id: e.id, description: e.description }));
    const prompt = promptTemplate.replace('{{argument}}', argumentText).replace('{{evidenceList}}', JSON.stringify(evidenceList, null, 2));
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: { evidenceIds: { type: Type.ARRAY, items: { type: Type.INTEGER } } },
                required: ["evidenceIds"]
            }
        }
    }));
    const result = JSON.parse(response.text);
    return result.evidenceIds || [];
}

export async function generateKnowledgeSummary(topic: string, caseData, promptTemplate: string) {
    const prompt = promptTemplate.replace('{{topic}}', topic).replace('{{caseData}}', JSON.stringify(caseData, null, 2));
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
    return response.text;
}

export async function generateDossier(topic: string, template: string, caseData, promptTemplate: string) {
    const prompt = promptTemplate
        .replace('{{topic}}', topic)
        .replace('{{template}}', template)
        .replace('{{caseData}}', JSON.stringify(caseData, null, 2));
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
    return response.text;
}

export async function suggestImpactScore(chargeDetails: { failure: string; expectedAction: string }, promptTemplate: string): Promise<{ score: number, justification: string }> {
    const prompt = promptTemplate
        .replace('{{failure}}', chargeDetails.failure)
        .replace('{{expectedAction}}', chargeDetails.expectedAction);
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.INTEGER },
                    justification: { type: Type.STRING }
                },
                required: ['score', 'justification']
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function analyzeJournalEntry(journalContent: string, promptTemplate: string): Promise<string> {
    const prompt = promptTemplate.replace('{{journalContent}}', journalContent);
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    }));
    return response.text;
}

export async function draftGratitudeMessage(context: string, promptTemplate: string): Promise<{ title: string, content: string }> {
    const prompt = promptTemplate.replace('{{context}}', context);
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING }
                },
                required: ['title', 'content']
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function suggestNewArguments(goal: string, caseSummary: any, promptTemplate: string): Promise<{ suggestions: string[] }> {
    const prompt = promptTemplate
        .replace('{{goal}}', goal)
        .replace('{{caseSummary}}', JSON.stringify(caseSummary, null, 2));
    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['suggestions']
            }
        }
    }));
    return JSON.parse(response.text);
}

export async function generateTimelineEventSummary(event: TimelineEvent, promptTemplate: string): Promise<string> {
    // We only need to send the core data, not UI-specific properties
    const eventData = {
        type: event.type,
        date: event.date,
        title: event.title,
        description: event.description,
    };
    
    const prompt = promptTemplate
        .replace('{{type}}', event.type)
        .replace('{{data}}', JSON.stringify(eventData));

    const response: GenerateContentResponse = await geminiApiCallWithRetry((ai) => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    }));
    return response.text;
}