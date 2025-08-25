import React, { useState, useEffect } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';

const SpudLogo = () => React.createElement('svg', {
        width: "100",
        height: "100",
        viewBox: "0 0 24 24",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        "aria-hidden": "true"
    },
    React.createElement('defs', null,
        React.createElement('linearGradient', { id: 'spudFireGradient', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
            React.createElement('stop', { offset: '0%', stopColor: '#fb923c' }),
            React.createElement('stop', { offset: '100%', stopColor: '#f97316' })
        )
    ),
    React.createElement('path', {
        d: "M17.3,3.7C14.3,2.2,10.2,2.9,7.5,5.6S4.2,12.7,5.7,16.4c1.5,3.7,5.6,5.5,8.9,4.2c3.3-1.3,5.1-5,4.2-8.5 C18.1,8.9,18.4,5.9,17.3,3.7z M14,5c0.6,0,1,0.4,1,1s-0.4,1-1,1s-1-0.4-1-1S13.4,5,14,5z M9,8c0.6,0,1,0.4,1,1s-0.4,1-1,1 s-1-0.4-1-1S8.4,8,9,8z M11,12c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S11.6,12,11,12z",
        fill: 'url(#spudFireGradient)'
    })
);

export default function CommandDeck() {
    const { hideCommandDeck } = useSpudHub();
    const [phase, setPhase] = useState(0);
    const tagline = "Forged in fire. Fueled by love. Armed with truth.";
    const [displayedTagline, setDisplayedTagline] = useState('');

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 500),   // Fade in logo
            setTimeout(() => setPhase(2), 2000),  // Show title
            setTimeout(() => setPhase(3), 2500),  // Start typing tagline
            setTimeout(() => setPhase(4), 2500 + 50 * tagline.length + 500), // Show button after tagline
        ];
        return () => timers.forEach(clearTimeout);
    }, []);

    useEffect(() => {
        if (phase >= 3) {
            let i = 0;
            const typingInterval = setInterval(() => {
                setDisplayedTagline(tagline.substring(0, i + 1));
                i++;
                if (i === tagline.length) {
                    clearInterval(typingInterval);
                }
            }, 50);
            return () => clearInterval(typingInterval);
        }
    }, [phase]);

    return React.createElement('div', {
        className: 'fixed inset-0 bg-bg-primary flex flex-col items-center justify-center z-[100] transition-opacity duration-1000',
        style: { opacity: phase > 0 ? 1 : 0 }
    },
        React.createElement('div', {
            className: 'text-center transition-all duration-500',
            style: { transform: `scale(${phase >= 1 ? 1 : 0.9})`, opacity: phase >= 1 ? 1 : 0 }
        },
            React.createElement(SpudLogo),
            React.createElement('h1', {
                className: 'text-4xl sm:text-5xl font-bold mt-4 transition-opacity duration-500',
                style: { opacity: phase >= 2 ? 1 : 0 }
            }, "Spud Hub OS"),
            React.createElement('h2', {
                className: 'text-lg sm:text-xl font-semibold text-accent-primary transition-opacity duration-500',
                style: { opacity: phase >= 2 ? 1 : 0 }
            }, "Citadel of Flames Edition"),
            phase >= 3 && React.createElement('p', {
                className: 'text-text-secondary mt-4 h-6'
            }, React.createElement('span', null, displayedTagline), React.createElement('span', {className: 'blinking-cursor'})),
        ),
        React.createElement('button', {
            onClick: hideCommandDeck,
            className: 'btn btn-primary mt-12 transition-all duration-500',
            style: { transform: `scale(${phase >= 4 ? 1 : 0.9})`, opacity: phase >= 4 ? 1 : 0 }
        }, "Enter the Citadel")
    );
}