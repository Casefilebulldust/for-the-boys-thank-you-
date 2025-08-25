
import React from 'react';

function Toast({ toast, onRemove }) {
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    const colors = { success: 'border-green-500', error: 'border-red-500', info: 'border-blue-500' };

    return React.createElement('div', { className: `glass-card flex items-center p-3 mb-3 text-white rounded-lg shadow-lg animate-fade-in border-l-4 ${colors[toast.type]}` },
        React.createElement('div', { className: "inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg" },
            React.createElement('i', { className: `fa-solid ${icons[toast.type]}` })
        ),
        React.createElement('div', { className: "ms-3 text-sm font-normal" }, toast.message),
        React.createElement('button', {
            type: "button",
            className: "ms-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 text-white hover:bg-white/20",
            onClick: () => onRemove(toast.id),
            'aria-label': "Close"
        },
            React.createElement('span', { className: "sr-only" }, "Close"),
            React.createElement('i', { className: "fa-solid fa-times" })
        )
    );
}

export default function ToastContainer({ toasts, removeToast }) {
    if (!toasts || toasts.length === 0) return null;

    return React.createElement('div', { className: "fixed top-24 sm:top-5 right-5 z-[100] w-full max-w-xs" },
        toasts.map(toast => React.createElement(Toast, { key: toast.id, toast: toast, onRemove: removeToast }))
    );
}