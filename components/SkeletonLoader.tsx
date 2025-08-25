
import React from 'react';

export default function SkeletonLoader() {
    return React.createElement('div', { className: "space-y-4 p-4" },
        React.createElement('div', { className: "h-4 skeleton w-1/4" }),
        React.createElement('div', { className: "space-y-2" },
            React.createElement('div', { className: "h-3 skeleton" }),
            React.createElement('div', { className: "h-3 skeleton w-5/6" }),
            React.createElement('div', { className: "h-3 skeleton w-3/4" })
        ),
         React.createElement('div', { className: "h-3 skeleton w-1/2 mt-4" })
    );
}