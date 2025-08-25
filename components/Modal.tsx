
import React, { useEffect } from 'react';

export default function Modal({ isOpen, onClose, children = null }) {
    useEffect(() => {
        const handleEsc = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    const handleContentClick = (e) => e.stopPropagation();

    return React.createElement('div', {
            className: "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity animate-fade-in",
            'aria-labelledby': "modal-title", role: "dialog", 'aria-modal': "true", onClick: onClose
        },
        React.createElement('div', {
                className: "glass-card p-6 w-full max-w-lg m-4 transform transition-all animate-fade-in",
                onClick: handleContentClick
            },
            children
        )
    );
};
