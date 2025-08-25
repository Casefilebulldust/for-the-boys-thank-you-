
import React from 'react';

export default function EmptyState({ icon, title, message, children = null }) {
    return React.createElement('div', { className: 'text-center p-8 border-2 border-dashed border-slate-700 rounded-lg animate-fade-in' },
        React.createElement('i', { className: `fa-solid ${icon} fa-3x text-slate-500 mb-4` }),
        React.createElement('h3', { className: 'text-xl font-bold text-slate-200' }, title),
        React.createElement('p', { className: 'text-slate-400 mt-2 mb-4 max-w-md mx-auto' }, message),
        children
    );
}