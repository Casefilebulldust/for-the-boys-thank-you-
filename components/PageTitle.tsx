import React from 'react';

export default function PageTitle({ title, icon, children = null }) {
    return React.createElement('div', { className: 'flex justify-between items-center mb-6' },
        React.createElement('h1', { className: 'text-2xl font-bold flex items-center' },
            React.createElement('i', { className: `fa-solid ${icon} mr-4 text-accent-primary` }),
            title
        ),
        children && React.createElement('div', null, children)
    );
}
