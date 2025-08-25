
import React from 'react';

export default function Spinner({ fullScreen = false, size = 'fa-3x' }) {
    const className = fullScreen 
        ? "fixed inset-0 flex justify-center items-center bg-gray-950/50 z-50"
        : "flex justify-center items-center";
    return React.createElement('div', { className: className },
        React.createElement('i', { className: `fa-solid fa-spinner fa-spin ${size} text-accent-primary` })
    );
};