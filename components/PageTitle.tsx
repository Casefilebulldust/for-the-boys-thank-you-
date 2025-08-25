
import React from 'react';

export default function PageTitle({ title, icon, children = null }) {
    return React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 animate-fade-in border-b border-neutral-800 pb-4' },
        React.createElement('div', { className: 'flex items-center' },
            React.createElement('i', { className: `fa-solid ${icon} text-3xl text-orange-400 mr-4` }),
            React.createElement('h1', { className: 'text-3xl font-bold text-gray-100' }, title)
        ),
        React.createElement('div', { className: 'mt-4 sm:mt-0' }, children)
    );
}