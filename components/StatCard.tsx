import React, { useState, useEffect } from 'react';

function useAnimatedValue(targetValue, duration = 500) {
    const [currentValue, setCurrentValue] = useState(targetValue);

    useEffect(() => {
        const startValue = currentValue;
        // Check if value is numeric before attempting animation
        if (typeof startValue !== 'number' || typeof targetValue !== 'number' || isNaN(startValue) || isNaN(targetValue)) {
            setCurrentValue(targetValue);
            return;
        }

        let startTime = null;

        const animation = (currentTime) => {
            if (startTime === null) startTime = currentTime;
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            const nextValue = Math.floor(startValue + (targetValue - startValue) * progress);
            setCurrentValue(nextValue);

            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        };

        requestAnimationFrame(animation);

    }, [targetValue, duration]);

    return currentValue;
}


export default function StatCard({ icon, label, value, colorClass }) {
    const animatedValue = useAnimatedValue(typeof value === 'number' ? value : 0);
    const displayValue = typeof value === 'number' ? animatedValue : value;

    const defaultColorClass = 'text-accent-primary';
    return React.createElement('div', { className: 'glass-card glow-border p-4 flex items-center' },
        React.createElement('div', { className: `w-12 h-12 rounded-lg flex items-center justify-center mr-4 bg-bg-tertiary` },
            React.createElement('i', { className: `fa-solid ${icon} text-xl ${colorClass || defaultColorClass}` })
        ),
        React.createElement('div', null,
            React.createElement('p', { className: 'text-sm text-text-secondary' }, label),
            React.createElement('p', { className: 'text-2xl font-bold text-text-primary' }, displayValue)
        )
    );
}