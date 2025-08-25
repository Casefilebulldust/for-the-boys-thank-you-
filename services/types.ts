export interface CaseReference {
    name: string;
    ref: string;
}

export interface NdisPlan {
    id: number;
    title: string;
    for: string;
    budget: number;
    claimed: number;
}

export interface NdisActivity {
    id: number;
    date: string;
    task: string;
    time: number;
}

export interface NdisData {
    plans: NdisPlan[];
    activities: NdisActivity[];
}

export interface EvidenceEntities {
    dates: string[];
    names: string[];
    refs: string[];
    orgs: string[];
}
export interface Evidence {
    id: number;
    fileName: string;
    description: string;
    tags: string[];
    date: string; // ISO String
    entities: EvidenceEntities;
}

export interface AgendaItem {
    id: number;
    title: string;
    time: string;
    isUrgent: boolean;
    isPersonal?: boolean;
}

export interface ChildAdvocacyItem {
    id: number;
    goal: string;
    status: 'active' | 'complete';
    actions: string[];
}

export interface Child {
    id: number;
    name: string;
    age: number;
    status: string;
    needs: string[];
    linkedEvidenceIds: number[];
    advocacyPlan: ChildAdvocacyItem[];
}

export interface Supporter {
    id: number;
    name: string;
}

export interface GratitudeEntry {
    id: number;
    supporterId: number;
    date: string; // ISO String
    title: string;
    content: string; // Markdown
}

export interface FamilyData {
    agenda: AgendaItem[];
    children: Child[];
    supporters: Supporter[];
    gratitudeJournal: GratitudeEntry[];
}

export interface ActionItem {
    id: number;
    to: string;
    subject: string;
    status: 'Draft' | 'Sent' | 'Awaiting Reply' | 'Complete';
    notes: string;
    body: string;
    dueDate?: string; // ISO String
}

export type WellnessLinkContext = {
    type: 'mission' | 'agenda' | 'argument';
    id: number;
    text: string;
}
export interface WellnessLog {
    id: number;
    date: string;
    stress: number;
    pain: number;
    notes: string;
    linkedContext?: WellnessLinkContext | null;
    detailedContent?: string;
    videoAssociated?: boolean;
}

export interface AccountabilityEntry {
    id: number;
    date: string;
    agency: string;
    failure: string;
    expectedAction: string;
    impactScore: number; // 1-10 scale
    status: 'Logged' | 'Submitted' | 'Response Received' | 'Closed';
    evidenceId?: number;
    impactAnalysis?: string;
}

export interface StrategyArgument {
    id: number;
    text: string;
    evidenceIds: number[];
    strength: 'Unknown' | 'Weak' | 'Moderate' | 'Strong' | 'Very Strong';
}

export interface StrategyGoal {
    id: number;
    text: string;
    arguments: StrategyArgument[];
}

export interface CaseData {
    caseReferences: CaseReference[];
}

export interface PromptSettings {
    [key:string]: string;
}

export interface InsightAction {
    type: 'NAVIGATE' | 'PRIME_ADVOCACY' | 'HIGHLIGHT_STRATEGY' | 'CREATE_MISSION';
    payload: {
        tab?: string;
        tool?: string;
        situation?: string;
        argumentId?: number;
        objective?: string;
    };
}

export interface ThreatMatrixItem {
    text: string;
    action: InsightAction;
}

export interface ThreatMatrix {
    urgentThreats: ThreatMatrixItem[];
    strategicOpportunities: ThreatMatrixItem[];
    resourceDrainers: ThreatMatrixItem[];
    quickWins: ThreatMatrixItem[];
}

// === Mission Types Enhanced ===

export type MissionStepAction = InsightAction;

export interface MissionSubTask {
    id: number;
    text: string;
    isComplete: boolean;
}

export interface MissionStep {
    id: number;
    title: string;
    description: string;
    status: 'pending' | 'complete';
    action: MissionStepAction;
    notes: string;
    subTasks: MissionSubTask[];
}

export interface Mission {
    id: number;
    title: string;
    objective: string;
    status: 'suggested' | 'active' | 'complete';
    steps: MissionStep[];
    campaignId?: number;
}

export interface Campaign {
    id: number;
    title: string;
    objective: string;
    status: 'active' | 'complete';
}

// === System & AI Types ===

export type Theme = 'fire' | 'cyber';

export interface ContextualSuggestion {
    text: string;
    action: InsightAction;
}

// === Nexus Graph Types ===
export type NexusNodeType = 'Evidence' | 'Argument' | 'Charge' | 'Mission' | 'Goal';

export interface NexusNode {
    id: string; // e.g., 'evidence-123', 'argument-456'
    label: string;
    type: NexusNodeType;
    originalId: number;
}

export interface NexusLink {
    source: string; // id of source node
    target: string; // id of target node
}

export interface NexusGraphData {
    nodes: NexusNode[];
    links: NexusLink[];
}

// === Personal Vault ===
export interface PersonalVaultEntry {
    id: number;
    date: string; // ISO String
    content: string; // Could be markdown or plain text
    title: string;
}

// === Master Timeline ===
export interface TimelineEvent {
    id: string; // e.g., 'evidence-123'
    date: string; // ISO String
    type: 'Evidence' | 'Charge' | 'Wellness' | 'Action';
    title: string;
    description: string;
    icon: string;
    colorClass: string;
    targetTab: string;
}


export interface SpudHubData {
    geminiApiKey: string;
    promptSettings: PromptSettings;
    caseData: CaseData;
    ndisData: NdisData;
    evidenceData: Evidence[];
    familyData: FamilyData;
    actionItems: ActionItem[];
    wellnessLogs: WellnessLog[];
    accountabilityEntries: AccountabilityEntry[];
    strategyData: StrategyGoal[];
    missions: Mission[];
    campaigns: Campaign[];
    activeTheme: Theme;
    personalVaultData: PersonalVaultEntry[];
    showCommandDeck: boolean;
    revealShown: boolean;
}