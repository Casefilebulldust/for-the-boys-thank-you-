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

const TypingText = ({ text, onComplete, speed = 60 }) => {
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
            }, speed);
            return () => clearInterval(typingInterval);
        }
    }, [text, onComplete, speed]);

    return React.createElement('span', null, displayedText, React.createElement('span', { className: 'blinking-cursor' }));
};

export default function Reveal() {
    const { markRevealAsShown } = useSpudHub();
    const [phase, setPhase] = useState(0);

    const story = [
        "For 24 days...",
        "while my body has been failing...",
        "my mind has been building something for us.",
        "To show you the power of never giving up.",
        "This is our citadel."
    ];
    
    const [currentLine, setCurrentLine] = useState(0);

    useEffect(() => {
        const initialTimer = setTimeout(() => setPhase(1), 500);
        return () => clearTimeout(initialTimer);
    }, []);

    const handleLineComplete = () => {
        if (currentLine < story.length - 1) {
            setTimeout(() => setCurrentLine(prev => prev + 1), 500);
        } else {
            setTimeout(() => setPhase(2), 1500);
        }
    };
    
    return React.createElement('div', {
        className: 'fixed inset-0 bg-bg-primary flex flex-col items-center justify-center z-[100] transition-opacity duration-1000 p-4',
        style: { opacity: phase > 0 ? 1 : 0 }
    }, 
        // Phase 1: The Intro Typing
        React.createElement('div', {
            className: 'text-center transition-all duration-1000',
            style: { opacity: phase === 1 ? 1 : 0, transform: phase === 2 ? 'translateY(-100vh)' : 'translateY(0)' }
        },
            React.createElement(SpudLogo),
            React.createElement('h1', { className: 'text-4xl sm:text-5xl font-bold mt-4' }, "Spud Hub OS"),
            React.createElement('h2', { className: 'text-lg sm:text-xl font-semibold text-accent-primary mb-8' }, "Citadel of Flames Edition"),
            React.createElement('div', { className: 'text-lg sm:text-xl text-text-secondary h-24' },
                story.map((line, index) => 
                    index === currentLine && React.createElement('p', { key: index, className: 'animate-fade-in' }, 
                        React.createElement(TypingText, { text: line, onComplete: handleLineComplete, speed: 60 })
                    )
                )
            )
        ),
        // Phase 2: The Message
        React.createElement('div', {
            className: 'text-center max-w-3xl mx-auto transition-all duration-1000',
            style: { opacity: phase === 2 ? 1 : 0, display: phase === 2 ? 'block' : 'none' }
        },
            React.createElement('h3', { className: 'text-3xl font-bold text-accent-primary', style: { fontFamily: "'Nunito', sans-serif" } }, "For you, Bowyn and Hayden."),
            React.createElement('p', { className: 'text-lg text-text-primary mt-4', style: { fontFamily: "'Nunito', sans-serif" } }, 
                "I built this for you. It's my thank you for looking after me. It's my promise to always advocate for you, even when my body fails. My love for you is here, in this citadel. It is a weapon for our fight, a command center for our family. My body might be weak, but my mind is sharp, and my love for you is the fire that fuels it. I became a developer by accident, but I built this with purpose. For us."
            ),
            React.createElement('p', { className: 'text-xl font-bold text-text-primary mt-6', style: { fontFamily: "'Nunito', sans-serif" } }, "From here, we rebuild. Together."),
            React.createElement('p', { className: 'text-2xl font-bold text-accent-primary mt-4 animate-fade-in', style: { fontFamily: "'Nunito', sans-serif", animationDelay: '1s' } }, "You finally get your mum back."),
            React.createElement('button', {
                onClick: markRevealAsShown,
                className: 'btn btn-primary mt-12 transition-all duration-500 text-lg px-8 py-3 animate-fade-in',
                style: { animationDelay: '2.5s' }
            }, "Enter Our Citadel")
        )
    );
}