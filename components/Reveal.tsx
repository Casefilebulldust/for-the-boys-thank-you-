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
        ),
        React.createElement('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' },
            React.createElement('feGaussianBlur', { stdDeviation: '3', result: 'coloredBlur' }),
            React.createElement('feMerge', null, 
                React.createElement('feMergeNode', { in: 'coloredBlur' }),
                React.createElement('feMergeNode', { in: 'SourceGraphic' })
            )
        )
    ),
    React.createElement('path', {
        d: "M17.3,3.7C14.3,2.2,10.2,2.9,7.5,5.6S4.2,12.7,5.7,16.4c1.5,3.7,5.6,5.5,8.9,4.2c3.3-1.3,5.1-5,4.2-8.5 C18.1,8.9,18.4,5.9,17.3,3.7z M14,5c0.6,0,1,0.4,1,1s-0.4,1-1,1s-1-0.4-1-1S13.4,5,14,5z M9,8c0.6,0,1,0.4,1,1s-0.4,1-1,1 s-1-0.4-1-1S8.4,8,9,8z M11,12c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S11.6,12,11,12z",
        fill: 'url(#spudFireGradient)',
        style: { filter: 'url(#glow)'}
    })
);

const TypingText = ({ text, onComplete }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        if (text) {
            let i = 0;
            setDisplayedText('');
            const typingInterval = setInterval(() => {
                if (i < text.length) {
                    setDisplayedText(prev => prev + text.charAt(i));
                    i++;
                } else {
                    clearInterval(typingInterval);
                    if (onComplete) onComplete();
                }
            }, 60);
            return () => clearInterval(typingInterval);
        }
    }, [text, onComplete]);

    return React.createElement('span', null, displayedText, React.createElement('span', { className: 'blinking-cursor' }));
};

export default function Reveal() {
    const { markRevealAsShown, hideCommandDeck } = useSpudHub();
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 500),   // Fade in logo
            setTimeout(() => setPhase(2), 2000),  // Start typing line 1
            setTimeout(() => setPhase(3), 4000),  // Start typing line 2
            setTimeout(() => setPhase(4), 7000),  // Start typing line 3
            setTimeout(() => setPhase(5), 10500), // Start typing line 4
            setTimeout(() => setPhase(6), 13000), // Show main message
            setTimeout(() => setPhase(7), 18500), // Show button
        ];
        return () => timers.forEach(clearTimeout);
    }, []);

    const handleEnterCitadel = () => {
        markRevealAsShown();
        hideCommandDeck();
    };

    const renderPhaseContent = () => {
        return React.createElement(React.Fragment, null,
            // Logo and Title
            React.createElement('div', {
                className: 'text-center transition-all duration-1000',
                style: { opacity: phase >= 1 ? 1 : 0, transform: phase >= 6 ? 'scale(0.8) translateY(-150px)' : 'scale(1) translateY(0)' }
            },
                React.createElement(SpudLogo),
                React.createElement('h1', { className: 'text-4xl sm:text-5xl font-bold mt-4' }, "Spud Hub OS"),
                React.createElement('h2', { className: 'text-lg sm:text-xl font-semibold text-accent-primary' }, "Citadel of Flames Edition")
            ),
            // Phased text reveal
            React.createElement('div', {
                className: 'absolute top-1/2 left-1/2 -translate-x-1/2 mt-32 text-center text-lg sm:text-xl text-text-secondary w-full px-4 transition-opacity duration-1000',
                style: { opacity: phase < 6 ? 1 : 0 }
            },
                phase >= 2 && React.createElement('p', { className: `transition-opacity duration-500 ${phase > 2 ? 'opacity-50' : 'opacity-100'}` }, 
                    React.createElement(TypingText, { text: 'For 24 days...', onComplete: () => {} })
                ),
                phase >= 3 && React.createElement('p', { className: `mt-2 transition-opacity duration-500 ${phase > 3 ? 'opacity-50' : 'opacity-100'}` }, 
                    React.createElement(TypingText, { text: 'while my body has been failing me...', onComplete: () => {} })
                ),
                phase >= 4 && React.createElement('p', { className: `mt-2 transition-opacity duration-500 ${phase > 4 ? 'opacity-50' : 'opacity-100'}` }, 
                    React.createElement(TypingText, { text: 'my mind has been building something for us.', onComplete: () => {} })
                ),
                phase >= 5 && React.createElement('p', { className: 'mt-2' }, 
                    React.createElement(TypingText, { text: 'Something to keep my promise.', onComplete: () => {} })
                )
            ),
            // Main message
            React.createElement('div', {
                className: 'text-center max-w-2xl mx-auto px-4 transition-opacity duration-1000',
                style: { opacity: phase >= 6 ? 1 : 0 }
            },
                React.createElement('h3', { className: 'text-3xl font-bold text-accent-primary', style: { fontFamily: "'Nunito', sans-serif" } }, "For you, Bowyn and Hayden."),
                React.createElement('p', { className: 'text-lg text-text-primary mt-4', style: { fontFamily: "'Nunito', sans-serif" } }, 
                    "I built this for you. It's my thank you for looking after me. Every line of code, every feature, is a piece of my love for you both. It's a weapon for our fight, a command center for our family. My body might be weak, but my mind is sharp, and my love for you is the fire that fuels it. I might have become a developer by accident, but I built this with purpose. For us."
                ),
                React.createElement('p', { className: 'text-xl font-bold text-text-primary mt-6', style: { fontFamily: "'Nunito', sans-serif" } }, "From here, we rebuild. Together."),
            ),
            // Final button
            React.createElement('button', {
                onClick: handleEnterCitadel,
                className: 'btn btn-primary mt-12 transition-all duration-500 text-lg px-8 py-3',
                style: { transform: `scale(${phase >= 7 ? 1 : 0.9})`, opacity: phase >= 7 ? 1 : 0 }
            }, "Reveal Our Citadel")
        );
    };

    return React.createElement('div', {
        className: 'fixed inset-0 bg-bg-primary flex flex-col items-center justify-center z-[100] transition-opacity duration-1000',
        style: { opacity: phase > 0 ? 1 : 0 }
    }, renderPhaseContent());
}