import { SpudHubData } from './services/types.ts';

export const defaultPrompts = {
    getNexusInsights: `Act as a master legal strategist, SpudBud.Analyze the provided Nexus Graph data which represents the user's entire case structure. Identify the single most critical insight.
    
    NEXUS GRAPH DATA:
    - Nodes: {{nodes}}
    - Links: {{links}}
    
    INSTRUCTIONS:
    1.  Analyze the connections (or lack thereof) between Evidence, Arguments, Goals, and Charges.
    2.  Identify the MOST CRITICAL strategic vulnerability or opportunity.
    3.  Provide a concise, actionable insight as a single paragraph.
    
    PRIORITY OF INSIGHTS:
    1.  **Weakly Supported Arguments:** Find an important argument with little or no linked evidence.
    2.  **Isolated Evidence:** Find a crucial piece of evidence that isn't linked to any argument.
    3.  **High-Impact Charges:** Find a "Charge" node that is well-supported by evidence and linked to a core strategic "Goal". This is a point of leverage.
    4.  **Unconnected Goals:** Find a strategic "Goal" that has no supporting arguments.
    
    EXAMPLE INSIGHT:
    "Your strategic argument 'Document unauthorized surveillance' is critically weak, with no direct evidence linked to it. This is a major vulnerability. Your immediate priority should be to locate and link any emails, logs, or reports that can substantiate this claim to prevent it from being dismissed."
    
    Generate the single most important insight now.`,

    analyzeFailureImpact: `Act as a paralegal AI assistant, SpudBud. Analyze the following documented failure by a government agency and provide a concise analysis of its potential impact.
    
    AGENCY FAILURE:
    - Agency: {{agency}}
    - Date: {{date}}
    - Failure: "{{failure}}"
    - Required Action Not Taken: "{{expectedAction}}"
    
    INSTRUCTIONS:
    1.  Adopt a formal, objective, and analytical tone.
    2.  Briefly explain the potential legal or procedural ramifications of this specific failure.
    3.  Consider the consequences regarding evidence, child safety, due process, or breaches of statutory duty.
    4.  Keep the analysis to a short, impactful paragraph (2-4 sentences).
    
    EXAMPLE ANALYSIS:
    "The failure of QPS Hendra to seize and analyze devices as requested constitutes a significant dereliction of duty. This inaction likely led to the spoliation of critical digital evidence, directly hindering the ability to prove technology-facilitated domestic violence and perverting the course of justice. This failure can be framed as a breach of their operational procedures for domestic violence incidents."
    
    Generate the impact analysis now.`,
    
    extractEntitiesAndTags: `Act as a paralegal AI assistant. Analyze the evidence description to extract key entities and suggest relevant tags.

    EVIDENCE DESCRIPTION: "{{description}}"

    INSTRUCTIONS:
    1.  Read the description carefully.
    2.  Extract key entities:
        - "dates": Any specific dates mentioned (e.g., "July 27, 2025"). Return in YYYY-MM-DD format.
        - "names": Any full names of people (e.g., "Hayden Lee", "Sean Wrightson").
        - "refs": Any official case numbers or reference codes (e.g., "BRC6145/2025", "QP2500909379").
        - "orgs": Any names of organizations, schools, or agencies (e.g., "Child Safety", "Wilston State School").
    3.  Suggest 3-5 concise, relevant "tags" based on themes (e.g., "Medical Report", "DVO Breach", "School