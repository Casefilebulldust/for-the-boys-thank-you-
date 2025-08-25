import React, { useState, useEffect, useRef } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import PageTitle from './PageTitle.tsx';

const ThemeSelector = () => {
    const { activeTheme, updateTheme } = useSpudHub();
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
                    onClick: () => updateTheme(theme.id),
                    className: `flex-1 p-4 rounded-lg text-center transition-all duration-200 border-2 ${isActive ? 'border-accent-primary bg-accent-primary/10' : 'border-border-primary hover:border-border-secondary bg-bg-secondary'}`
                },
                    React.createElement('i', { className: `fa-solid ${theme.icon} text-2xl mb-2 ${isActive ? 'text-accent-primary' : 'text-text-secondary'}` }),
                    React.createElement('p', { className: `font-semibold ${isActive ? 'text-text-primary' : 'text-text-secondary'}` }, theme.name)
                )
            })
        )
    );
};

export default function SystemSettings() {
    const { geminiApiKey, updateApiKey, handleExportData, handleImportData, handleResetData } = useSpudHub();
    const [localApiKey, setLocalApiKey] = useState(geminiApiKey);
    const importRef = useRef(null);

    useEffect(() => {
        setLocalApiKey(geminiApiKey);
    }, [geminiApiKey]);

    const handleSaveKey = () => {
        updateApiKey(localApiKey);
    };

    const onImportClick = () => {
        importRef.current.click();
    };

    const onFileImport = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImportData(file);
        }
    };

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'System Settings', icon: 'fa-cog' }),
        React.createElement('div', { className: 'space-y-6 max-w-2xl' },
            React.createElement(ThemeSelector),
            React.createElement('div', { className: 'glass-card p-6' },
                React.createElement('h2', { className: 'text-lg font-semibold' }, 'AI Configuration'),
                React.createElement('p', { className: 'text-sm text-text-secondary mt-1 mb-4' }, 'To enable AI features, please provide your Google Gemini API key. This key is stored securely in your browser\'s local storage and is never shared.'),
                React.createElement('div', { className: 'flex items-center space-x-2' },
                    React.createElement('input', { type: 'password', value: localApiKey, onChange: e => setLocalApiKey(e.target.value), className: 'form-input flex-1', placeholder: 'Enter your Gemini API Key' }),
                    React.createElement('button', { onClick: handleSaveKey, className: 'btn btn-primary' }, 'Save')
                )
            ),
            React.createElement('div', { className: 'glass-card p-6' },
                React.createElement('h2', { className: 'text-lg font-semibold' }, 'Data Management'),
                React.createElement('p', { className: 'text-sm text-text-secondary mt-1 mb-4' }, 'Export a local backup of your data, or import a backup file to restore your OS. Use this to move data between computers.'),
                React.createElement('div', { className: 'flex space-x-4' },
                    React.createElement('button', { onClick: handleExportData, className: 'btn btn-secondary' }, React.createElement('i', { className: 'fa-solid fa-download mr-2' }), 'Export Data'),
                    React.createElement('button', { onClick: onImportClick, className: 'btn btn-secondary' }, React.createElement('i', { className: 'fa-solid fa-upload mr-2' }), 'Import Data'),
                    React.createElement('input', { type: 'file', ref: importRef, className: 'hidden', onChange: onFileImport, accept: '.json' })
                )
            ),
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
