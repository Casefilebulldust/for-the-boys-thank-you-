import React, { useRef } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import PageTitle from './PageTitle.tsx';

const ThemeSelector = () => {
    const { activeTheme, setData } = useSpudHub();
    const themes = [
        { id: 'fire', name: 'Let Them Burn', icon: 'fa-fire' },
        { id: 'cyber', name: 'Cyber Strike', icon: 'fa-bolt' }
    ];

    return React.createElement('div', { className: 'glass-card p-6' },
        React.createElement('h2', { className: 'text-lg font-semibold' }, 'Visual Theme'),
        React.createElement('p', { className: 'text-sm text-text-secondary mt-1 mb-4' }, 'Select your preferred interface style.'),
        React.createElement('div', { className: 'flex space-x-4' },
            themes.map(theme => {
                const isActive = activeTheme === theme.id;
                return React.createElement('button', {
                    key: theme.id,
                    onClick: () => setData('activeTheme', theme.id),
                    className: `flex-1 p-4 rounded-lg text-center transition-all duration-200 border-2 ${isActive ? 'border-accent-primary bg-accent-primary/10' : 'border-border-primary hover:border-border-secondary bg-bg-secondary'}`
                },
                    React.createElement('i', { className: `fa-solid ${theme.icon} text-2xl mb-2 ${isActive ? 'text-accent-primary' : 'text-text-secondary'}` }),
                    React.createElement('p', { className: `font-semibold ${isActive ? 'text-text-primary' : 'text-text-secondary'}` }, theme.name)
                )
            })
        )
    );
};

const DataManagement = () => {
    const { addToast } = useToast();
    const { importData, ...allData } = useSpudHub();
    const fileInputRef = useRef(null);

    const handleExport = () => {
        const dataToExport = {
            promptSettings: allData.promptSettings,
            caseData: allData.caseData,
            ndisData: allData.ndisData,
            evidenceData: allData.evidenceData,
            familyData: allData.familyData,
            actionItems: allData.actionItems,
            wellnessLogs: allData.wellnessLogs,
            accountabilityEntries: allData.accountabilityEntries,
            strategyData: allData.strategyData,
            missions: allData.missions,
            campaigns: allData.campaigns,
            activeTheme: allData.activeTheme,
            personalVaultData: allData.personalVaultData,
            showCommandDeck: allData.showCommandDeck,
            revealShown: allData.revealShown
        };

        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().slice(0, 10);
        link.download = `spud-hub-backup-${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast('Data exported successfully.', 'success');
    };

    const handleImportClick = () => {
        const file = fileInputRef.current.files[0];
        if (!file) {
            addToast('Please select a file to import.', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            if (typeof text === 'string') {
                importData(text);
            } else {
                addToast('Could not read the selected file.', 'error');
            }
        };
        reader.onerror = () => addToast('Error reading file.', 'error');
        reader.readAsText(file);
    };
    
    return React.createElement('div', { className: 'glass-card p-6' },
        React.createElement('h2', { className: 'text-lg font-semibold' }, 'Data Management'),
        React.createElement('p', { className: 'text-sm text-text-secondary mt-1 mb-4' }, 'Export your entire case file for backup or to move to another device. Importing will overwrite all current data.'),
        React.createElement('button', { onClick: handleExport, className: 'btn btn-primary' },
            React.createElement('i', { className: 'fa-solid fa-download mr-2' }),
            'Export All Data'
        ),
        React.createElement('div', { className: 'border-t border-border-primary pt-4 mt-4' },
            React.createElement('h3', { className: 'font-semibold text-warning-primary' }, 'Import Data'),
            React.createElement('p', { className: 'text-sm text-text-secondary mt-1 mb-4' }, 'Importing a backup file will replace all existing data in this browser. This action cannot be undone.'),
            React.createElement('div', { className: 'flex items-center space-x-2' },
                React.createElement('input', { ref: fileInputRef, type: 'file', accept: '.json', className: 'form-input flex-1' }),
                React.createElement('button', { onClick: handleImportClick, className: 'btn btn-secondary' },
                    React.createElement('i', { className: 'fa-solid fa-upload mr-2' }),
                    'Import'
                )
            )
        )
    );
};

export default function SystemSettings() {
    const { handleResetData } = useSpudHub();

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'System Settings', icon: 'fa-cog' }),
        React.createElement('div', { className: 'space-y-6 max-w-2xl' },
            React.createElement(ThemeSelector),
            React.createElement('div', { className: 'glass-card p-6' },
                React.createElement('h2', { className: 'text-lg font-semibold' }, 'AI Configuration'),
                React.createElement('p', { className: 'text-sm text-text-secondary mt-1' },
                    'AI features are powered by Google Gemini. The API key is configured securely via the ',
                    React.createElement('code', { className: 'bg-bg-tertiary text-accent-primary px-1 py-0.5 rounded' }, 'API_KEY'),
                    ' environment variable. If AI features are not working, please ensure this variable is set correctly in your deployment environment.'
                )
            ),
            React.createElement(DataManagement),
            React.createElement('div', { className: 'glass-card p-6 border border-danger-primary/50' },
                React.createElement('h2', { className: 'text-lg font-semibold text-danger-primary' }, 'Danger Zone'),
                React.createElement('p', { className: 'text-sm text-text-secondary mt-1 mb-4' }, 'Resetting the application will permanently delete all data from this browser. This cannot be undone.'),
                React.createElement('button', {
                    onClick: handleResetData,
                    className: 'btn text-white',
                    style: { background: 'var(--danger-primary)' }
                }, React.createElement('i', { className: 'fa-solid fa-triangle-exclamation mr-2' }), 'Reset Application')
            )
        )
    );
}