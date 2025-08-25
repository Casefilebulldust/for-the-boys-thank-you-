import React from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';

const SpudLogo = () => React.createElement('svg', {
        width: "36",
        height: "36",
        viewBox: "0 0 24 24",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        "aria-hidden": "true"
    },
    React.createElement('defs', null,
        React.createElement('linearGradient', { id: 'spudFireGradient', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
            React.createElement('stop', { offset: '0%', stopColor: '#fb923c' }),
            React.createElement('stop', { offset: '100%', stopColor: '#f97316' })
        ),
        React.createElement('linearGradient', { id: 'spudCyberGradient', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
             React.createElement('stop', { offset: '0%', stopColor: '#5f5cff' }),
             React.createElement('stop', { offset: '100%', stopColor: '#00f2ea' })
        )
    ),
    React.createElement('path', {
        d: "M17.3,3.7C14.3,2.2,10.2,2.9,7.5,5.6S4.2,12.7,5.7,16.4c1.5,3.7,5.6,5.5,8.9,4.2c3.3-1.3,5.1-5,4.2-8.5 C18.1,8.9,18.4,5.9,17.3,3.7z M14,5c0.6,0,1,0.4,1,1s-0.4,1-1,1s-1-0.4-1-1S13.4,5,14,5z M9,8c0.6,0,1,0.4,1,1s-0.4,1-1,1 s-1-0.4-1-1S8.4,8,9,8z M11,12c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S11.6,12,11,12z",
        className: 'spud-logo-path'
    }),
    React.createElement('style', null, `
        .theme-fire .spud-logo-path { fill: url(#spudFireGradient); }
        .theme-cyber .spud-logo-path { fill: url(#spudCyberGradient); }
    `)
);


export default function Sidebar() {
    const { activeTab, setActiveTab } = useSpudHub();
    const navItems = [
        { name: 'War Room', icon: 'fa-chess-king' },
        { name: 'Live Operations', icon: 'fa-bolt' },
        { name: 'Strategic Analysis', icon: 'fa-brain' }, 
        { name: 'Missions', icon: 'fa-bullseye' }, 
        { name: 'Case Strategy', icon: 'fa-chess-board' }, 
        { name: 'Accountability Citadel', icon: 'fa-gavel' },
        { name: 'Evidence Locker', icon: 'fa-boxes-stacked' },
        { name: 'Intake Hub', icon: 'fa-inbox' }, 
        { name: 'Action Tracker', icon: 'fa-tasks' }, 
        { name: 'Family Hub', icon: 'fa-users' }, 
        { name: 'Wellness Tracker', icon: 'fa-heart-pulse' }, 
        { name: 'NDIS Coordination', icon: 'fa-hand-holding-medical' }, 
        { name: 'Nexus Graph', icon: 'fa-project-diagram' }, 
        { name: 'Mindset & Resilience', icon: 'fa-spa' },
        { name: 'Dossier Generator', icon: 'fa-book' }, 
        { name: 'Personal Vault', icon: 'fa-lock' },
        { name: 'Operating System', icon: 'fa-terminal' },
        { name: 'System Settings', icon: 'fa-cog' },
    ];
    return React.createElement('nav', { className: 'w-64 bg-black/50 backdrop-blur-md p-4 flex flex-col no-print border-r border-border-primary' },
        React.createElement('div', { className: 'flex items-center mb-8' },
            React.createElement(SpudLogo), React.createElement('h1', { className: 'text-2xl font-bold ml-3 text-text-primary' }, "Spud Hub OS")
        ),
        React.createElement('ul', { className: 'flex-1 space-y-2 overflow-y-auto' },
            navItems.map(item =>
                React.createElement('li', { key: item.name },
                    React.createElement('button', { 
                        onClick: () => setActiveTab(item.name), 
                        className: `w-full flex items-center p-2 rounded-md text-left transition-all duration-200 relative ${activeTab === item.name ? 'text-white font-semibold shadow-lg' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'}` ,
                        style: activeTab === item.name ? {
                            background: `linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))`,
                            boxShadow: `0 4px 15px -3px var(--accent-glow)`
                        } : {}
                    },
                        activeTab === item.name && React.createElement('div', { className: 'absolute left-0 top-0 h-full w-1 bg-white/50 rounded-r-full' }),
                        React.createElement('i', { className: `fa-solid ${item.icon} w-6 text-center` }),
                        React.createElement('span', { className: 'ml-3' }, item.name)
                    )
                )
            )
        )
    );
};