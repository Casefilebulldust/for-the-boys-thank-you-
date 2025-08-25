
import React from 'react';

export default function PrintLayout({ children }) {
    return React.createElement('div', { className: "printable-area bg-white text-black font-sans p-8" },
        React.createElement('div', { className: "flex justify-between items-center border-b pb-4 mb-6" },
            React.createElement('h1', { className: "text-2xl font-bold text-gray-800" }, "Spud Hub OS - Generated Document"),
            React.createElement('p', { className: "text-sm text-gray-500" }, `Generated on: ${new Date().toLocaleDateString()}`)
        ),
        React.createElement('div', null, children)
    );
};