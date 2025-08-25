import React from 'react';
import { useSpudHub } from './contexts/SpudHubContext.tsx';
import { usePrint } from './contexts/PrintContext.tsx';
import Sidebar from './layout/Sidebar.tsx';
import Header from './layout/Header.tsx';
import PrintLayout from './components/PrintLayout.tsx';
import Spinner from './components/Spinner.tsx';
import SpudBudCompanion from './components/SpudBudCompanion.tsx';
import WarRoom from './features/WarRoom.tsx';
import LiveOps from './features/LiveOps.tsx';
import StrategicAnalysis from './features/StrategicAnalysis.tsx';
import Missions from './features/Missions.tsx';
import IntakeHub from './features/IntakeHub.tsx';
import EvidenceLocker from './features/EvidenceLocker.tsx';
import FamilyHub from './features/FamilyHub.tsx';
import ActionTracker from './features/ActionTracker.tsx';
import AdvocacyAssistant from './features/AdvocacyAssistant.tsx';
import WellnessTracker from './features/WellnessTracker.tsx';
import NDISCoordination from './features/NDISCoordination.tsx';
import AccountabilityCitadel from './features/AccountabilityCitadel.tsx';
import CaseStrategy from './features/CaseStrategy/CaseStrategy.tsx';
import NexusGraph from './features/NexusGraph.tsx';
import MindsetResilience from './features/MindsetResilience.tsx';
import KnowledgeBase from './features/KnowledgeBase.tsx';
import SystemSettings from './features/SystemSettings.tsx';
import PersonalVault from './features/PersonalVault.tsx';
import CommandDeck from './components/CommandDeck.tsx';
import Reveal from './features/Reveal.tsx';

// === ROOT APP COMPONENT ===
export default function App() {
    const { activeTab, isDataLoading, activeTheme, showCommandDeck, revealShown } = useSpudHub();
    const { isPrinting, printContent } = usePrint();
    
    React.useEffect(() => {
        document.body.className = `theme-${activeTheme} antialiased`;
    }, [activeTheme]);

    if (!revealShown) {
        return React.createElement(Reveal);
    }

    if (showCommandDeck) {
        return React.createElement(CommandDeck);
    }

    if (isPrinting) {
        return React.createElement(PrintLayout, null, printContent);
    }

    const renderActiveTab = () => {
        if (isDataLoading) return React.createElement(Spinner, { fullScreen: true });
        switch (activeTab) {
            case 'War Room': return React.createElement(WarRoom);
            case 'Live Operations': return React.createElement(LiveOps);
            case 'Strategic Analysis': return React.createElement(StrategicAnalysis);
            case 'Missions': return React.createElement(Missions);
            case 'Intake Hub': return React.createElement(IntakeHub);
            case 'Evidence Locker': return React.createElement(EvidenceLocker);
            case 'Family Hub': return React.createElement(FamilyHub);
            case 'Action Tracker': return React.createElement(ActionTracker);
            case 'Advocacy Assistant': return React.createElement(AdvocacyAssistant);
            case 'Wellness Tracker': return React.createElement(WellnessTracker);
            case 'NDIS Coordination': return React.createElement(NDISCoordination);
            case 'Accountability Citadel': return React.createElement(AccountabilityCitadel);
            case 'Case Strategy': return React.createElement(CaseStrategy);
            case 'Nexus Graph': return React.createElement(NexusGraph);
            case 'Mindset & Resilience': return React.createElement(MindsetResilience);
            case 'Dossier Generator': return React.createElement(KnowledgeBase);
            case 'System Settings': return React.createElement(SystemSettings);
            case 'Personal Vault': return React.createElement(PersonalVault);
            default: return React.createElement(WarRoom);
        }
    };

    return React.createElement('div', { className: 'flex h-screen' },
        React.createElement(Sidebar),
        React.createElement('main', { className: 'flex-1 flex flex-col overflow-hidden' },
            React.createElement(Header),
            React.createElement('div', { className: 'flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8' }, renderActiveTab())
        ),
        React.createElement(SpudBudCompanion)
    );
};