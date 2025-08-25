

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
    const velocities = useRef({});
    const [draggedNode, setDraggedNode] = useState(null);
    const [hoveredNode, setHoveredNode] = useState(null);
    const svgRef = useRef(null);
    const width = 800;
    const height = 600;

    useEffect(() => {
        const newPositions = {};
        const newVelocities = {};
        nodes.forEach(node => {
            newPositions[node.id] = {
                x: width / 2 + (Math.random() - 0.5) * 100,
                y: height / 2 + (Math.random() - 0.5) * 100,
            };
            newVelocities[node.id] = { vx: 0, vy: 0 };
        });
        setPositions(newPositions);
        velocities.current = newVelocities;
    }, [nodes]);

    useEffect(() => {
        let animationFrameId;
        const simulationStep = () => {
            if (nodes.length === 0) return;
            const currentPositions = positions;
            const currentVelocities = velocities.current;

            const forces = {};
            nodes.forEach(node => { forces[node.id] = { fx: 0, fy: 0 }; });

            const chargeStrength = -800;
            const linkStrength = 0.06;
            const centerStrength = 0.01;
            const damping = 0.9;

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const nodeA = nodes[i], nodeB = nodes[j];
                    const posA = currentPositions[nodeA.id], posB = currentPositions[nodeB.id];
                    if (!posA || !posB) continue;
                    const dx = posB.x - posA.x, dy = posB.y - posA.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = chargeStrength / (distance * distance);
                    const fx = (dx / distance) * force, fy = (dy / distance) * force;
                    forces[nodeA.id].fx -= fx; forces[nodeA.id].fy -= fy;
                    forces[nodeB.id].fx += fx; forces[nodeB.id].fy += fy;
                }
            }

            links.forEach(link => {
                const posSource = currentPositions[link.source], posTarget = currentPositions[link.target];
                if (!posSource || !posTarget) return;
                const dx = posTarget.x - posSource.x, dy = posTarget.y - posSource.y;
                forces[link.source].fx += dx * linkStrength; forces[link.source].fy += dy * linkStrength;
                forces[link.target].fx -= dx * linkStrength; forces[link.target].fy -= dy * linkStrength;
            });

            nodes.forEach(node => {
                const pos = currentPositions[node.id];
                if (!pos) return;
                const dx = width / 2 - pos.x, dy = height / 2 - pos.y;
                forces[node.id].fx += dx * centerStrength; forces[node.id].fy += dy * centerStrength;
            });

            const newPositions = { ...currentPositions };
            nodes.forEach(node => {
                if (draggedNode === node.id) return;
                const vel = currentVelocities[node.id];
                const pos = newPositions[node.id];
                const force = forces[node.id];
                vel.vx = (vel.vx + force.fx) * damping;
                vel.vy = (vel.vy + force.fy) * damping;
                pos.x += vel.vx;
                pos.y += vel.vy;
            });

            setPositions(newPositions);
            animationFrameId = requestAnimationFrame(simulationStep);
        };
        animationFrameId = requestAnimationFrame(simulationStep);
        return () => cancelAnimationFrame(animationFrameId);
    }, [nodes, links, draggedNode, positions]);

    const getSVGCoordinates = (event) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const CTM = svgRef.current.getScreenCTM();
        return {
            x: (event.clientX - CTM.e) / CTM.a,
            y: (event.clientY - CTM.f) / CTM.d
        };
    };

    const handleMouseDown = (nodeId, event) => {
        event.preventDefault();
        setDraggedNode(nodeId);
        velocities.current[nodeId] = { vx: 0, vy: 0 };
    };

    const handleMouseMove = useCallback((event) => {
        if (draggedNode) {
            const { x, y } = getSVGCoordinates(event);
            setPositions(prev => ({ ...prev, [draggedNode]: { x, y } }));
        }
    }, [draggedNode]);

    const handleMouseUp = useCallback(() => setDraggedNode(null), []);
    
    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);
    
    const { neighborNodes, highlightedLinks } = useMemo(() => {
        if (!hoveredNode) return { neighborNodes: new Set(), highlightedLinks: new Set() };
        const neighbors = new Set([hoveredNode]);
        const highlighted = new Set();
        links.forEach((link, i) => {
            if (link.source === hoveredNode) { neighbors.add(link.target); highlighted.add(i); }
            else if (link.target === hoveredNode) { neighbors.add(link.source); highlighted.add(i); }
        });
        return { neighborNodes: neighbors, highlightedLinks: highlighted };
    }, [hoveredNode, links]);

    if (nodes.length === 0) {
        return React.createElement('div', { className: 'text-center text-text-secondary h-[600px] flex items-center justify-center' }, 'No data to display in the graph.');
    }

    return React.createElement('svg', { ref: svgRef, viewBox: `0 0 ${width} ${height}`, className: 'w-full h-auto' },
        React.createElement('g', { className: 'links' }, links.map((link, i) => {
            const sourcePos = positions[link.source];
            const targetPos = positions[link.target];
            if (!sourcePos || !targetPos) return null;
            const isHighlighted = highlightedLinks.has(i);
            return React.createElement('line', {
                key: i, x1: sourcePos.x, y1: sourcePos.y, x2: targetPos.x, y2: targetPos.y,
                className: 'nexus-link',
                style: {
                    opacity: hoveredNode && !isHighlighted ? 0.2 : 0.6,
                    strokeWidth: isHighlighted ? 2.5 : 1.5,
                    stroke: isHighlighted ? 'var(--accent-primary)' : 'var(--border-secondary)',
                }
            });
        })),
        React.createElement('g', { className: 'nodes' }, nodes.map(node => {
            const pos = positions[node.id];
            if (!pos) return null;
            const isHighlighted = neighborNodes.has(node.id);
            const isHovered = hoveredNode === node.id;
            return React.createElement('g', {
                key: node.id, transform: `translate(${pos.x}, ${pos.y})`, className: 'nexus-node',
                onMouseDown: (e) => handleMouseDown(node.id, e),
                onMouseOver: () => setHoveredNode(node.id),
                onMouseOut: () => setHoveredNode(null),
                style: { opacity: hoveredNode && !isHighlighted ? 0.3 : 1 }
            },
                React.createElement('circle', {
                    r: isHovered || draggedNode === node.id ? 12 : 10,
                    fill: nodeColors[node.type],
                    style: { filter: isHovered ? 'drop-shadow(0 0 8px currentColor)' : 'none' }
                }),
                React.createElement('text', {
                    y: 20, className: 'nexus-label',
                    style: { display: isHighlighted ? 'block' : 'none' }
                }, node.label)
            );
        }))
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