import React from 'react';

export default function ArgumentDetailSection({ title, icon, items }) {
    if (!items || items.length === 0) return null;

    return React.createElement('div', null,
        React.createElement('h4', { class: 'text-sm font-semibold text-indigo-300 mb-2 flex items-center' },
            React.createElement('i', { class: `fa-solid ${icon} mr-2 w-4` }),
            title
        ),
        React.createElement('ul', { class: 'list-disc list-inside text-sm text-slate-300 space-y-1 pl-2' },
            items.map((item, index) => React.createElement('li', { key: index }, item))
        )
    );
}