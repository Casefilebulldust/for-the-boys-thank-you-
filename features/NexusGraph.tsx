
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import PageTitle from '../components/PageTitle.tsx';
import Spinner from '../components/Spinner.tsx';
import { getNexusInsights } from '../services/geminiService.ts';
import { NexusNode } from '../services/types.ts';
import MarkdownRenderer from '../components/MarkdownRenderer.tsx';

const nodeColors = {
    'Evidence': 'var(--success-primary)',
    'Argument': 'var(--warning-primary)',
    'Charge': 'var(--danger-primary)',
    'Mission': 'var(--info-primary)',
    'Goal': 'var(--accent-primary)',
};

const NexusGraphComponent = ({ nodes, links }) => {
    const [positions, setPositions] = useState({});
    const width = 800;
    const height = 600;

    useEffect(() => {
        // Simple circular layout algorithm
        const numNodes = nodes.length;
        if (numNodes === 0) return;
        const radius = Math.min(width, height) / 2 - 50;
        const newPositions = {};
        nodes.forEach((node, i) => {
            const angle = (i / numNodes) * 2 * Math.PI;
            newPositions[node.id] = {
                x: width / 2 + radius * Math.cos(angle),
                y: height / 2 + radius * Math.sin(angle),
            };
        });
        setPositions(newPositions);
    }, [nodes]);

    if (nodes.length === 0) {
        return React.createElement('div', { className: 'text-center text-text-secondary' }, 'No data to display in the graph.');
    }

    return React.createElement('svg', { viewBox: `0 0 ${width} ${height}`, className: 'w-full h-auto' },
        React.createElement('g', { className: 'links' },
            links.map((link, i) => {
                const sourcePos = positions[link.source];
                const targetPos = positions[link.target];
                if (!sourcePos || !targetPos) return null;
                return React.createElement('line', {
                    key: i,
                    x1: sourcePos.x, y1: sourcePos.y,
                    x2: targetPos.x, y2: targetPos.y,
                    className: 'nexus-link'
                });
            })
        ),
        React.createElement('g', { className: 'nodes' },
            nodes.map(node => {
                const pos = positions[node.id];
                if (!pos) return null;
                return React.createElement('g', { key: node.id, transform: `translate(${pos.x}, ${pos.y})`, className: 'nexus-node' },
                    React.createElement('circle', { r: 10, fill: nodeColors[node.type] }),
                    React.createElement('text', { y: 20, className: 'nexus-label' }, node.label)
                );
            })
        )
    );
};


export default function NexusGraph() {
    const { nexusGraphData, geminiApiKey, promptSettings } = useSpudHub();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [insights, setInsights] = useState('');

    const handleAnalyzeGraph = useCallback(async () => {
        if (!geminiApiKey) {
            addToast("Please add your Gemini API key in System Settings.", "error");
            return;
        }
        setIsLoading(true);
        setInsights('');
        try {
            const result = await getNexusInsights(geminiApiKey, nexusGraphData.nodes, nexusGraphData.links, promptSettings.getNexusInsights);
            setInsights(result);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Analysis Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [geminiApiKey, nexusGraphData, promptSettings, addToast]);

    const Legend = () => (
        React.createElement('div', { className: 'flex flex-wrap gap-x-4 gap-y-2 text-xs' },
            Object.entries(nodeColors).map(([type, color]) => 
                React.createElement('div', { key: type, className: 'flex items-center' },
                    React.createElement('div', { className: 'w-3 h-3 rounded-full mr-2', style: { backgroundColor: color } }),
                    type
                )
            )
        )
    );

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Nexus Graph', icon: 'fa-project-diagram' }),
        React.createElement('div', { className: 'grid grid-cols-1 xl:grid-cols-3 gap-6' },
            React.createElement('div', { className: 'xl:col-span-2' },
                React.createElement('div', { className: 'glass-card p-4' },
                    React.createElement(NexusGraphComponent, nexusGraphData),
                    React.createElement('div', { className: 'mt-4 p-2 border-t border-border-primary' },
                        React.createElement(Legend)
                    )
                )
            ),
            React.createElement('div', { className: 'space-y-6' },
                React.createElement('div', { className: 'glass-card p-6' },
                    React.createElement('h2', { className: 'text-lg font-semibold' }, 'Strategic Analysis'),
                    React.createElement('p', { className: 'text-sm text-text-secondary mt-1 mb-4' }, 'Analyze the entire case structure to identify the most critical vulnerability or opportunity.'),
                    React.createElement('button', {
                        onClick: handleAnalyzeGraph,
                        disabled: isLoading,
                        className: 'btn btn-primary w-full'
                    }, isLoading ? React.createElement(Spinner, {}) : React.createElement(React.Fragment, null, React.createElement('i', { className: 'fa-solid fa-brain mr-2' }), 'Analyze Graph')),
                    isLoading && !insights && React.createElement('p', { className: 'text-sm text-center text-text-secondary mt-4' }, 'SpudBud is analyzing the connections...'),
                    insights && React.createElement('div', { className: 'mt-4' },
                         React.createElement(MarkdownRenderer, { markdownText: `**SpudBud Insight:**\n\n${insights}` })
                    )
                )
            )
        )
    );
}