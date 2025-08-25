
import React from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import HeadsUpDisplay from './HeadsUpDisplay.tsx';

export default function Header() {
    const { activeTab } = useSpudHub();
    return React.createElement('header', { className: 'bg-black/70 backdrop-blur-sm border-b border-neutral-800 p-4 no-print' },
        React.createElement('h1', { className: 'text-lg font-semibold text-gray-200' }, activeTab),
        React.createElement('div', { className: 'mt-2' }, React.createElement(HeadsUpDisplay))
    );
}