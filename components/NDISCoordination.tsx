
import React, { useState } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import PageTitle from './PageTitle.tsx';
import EmptyState from './EmptyState.tsx';

export default function NDISCoordination() {
    const { ndisData, addNdisActivity } = useSpudHub();
    const [task, setTask] = useState('');
    const [time, setTime] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (task && time) {
            addNdisActivity(task, time);
            setTask('');
            setTime('');
        }
    };

    const handleTaskChange = (e) => setTask(e.target.value);
    const handleTimeChange = (e) => setTime(e.target.value);

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'NDIS Coordination', icon: 'fa-hand-holding-medical' }),
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
            React.createElement('div', { className: 'lg:col-span-2 space-y-6' },
                React.createElement('div', { className: 'glass-card p-6' },
                    React.createElement('h2', { className: 'text-lg font-semibold mb-4' }, 'Active Plans'),
                    React.createElement('ul', { className: 'space-y-3' }, ndisData.plans.map(plan =>
                        React.createElement('li', { key: plan.id, className: 'p-3 bg-neutral-800/50 rounded' },
                            React.createElement('p', { className: 'font-semibold' }, plan.title, ` (for ${plan.for})`),
                            React.createElement('div', { className: 'w-full bg-neutral-700 rounded-full h-2.5 mt-2' },
                                React.createElement('div', {
                                    className: 'bg-orange-600 h-2.5 rounded-full',
                                    style: { width: `${(plan.claimed / plan.budget) * 100}%` }
                                })
                            ),
                            React.createElement('p', { className: 'text-xs text-right mt-1 text-gray-400' },
                                `$${plan.claimed.toLocaleString()} / $${plan.budget.toLocaleString()} Claimed`
                            )
                        )
                    ))
                ),
                React.createElement('div', { className: 'glass-card' },
                    React.createElement('div', { className: 'p-4 border-b border-neutral-800' },
                        React.createElement('h2', { className: 'text-lg font-semibold' }, 'Activity Log')
                    ),
                    ndisData.activities.length > 0 ? (
                        React.createElement('ul', { className: 'divide-y divide-neutral-800' }, ndisData.activities.map(item =>
                            React.createElement('li', { key: item.id, className: 'p-4 flex justify-between items-start' },
                                React.createElement('div', null,
                                    React.createElement('p', { className: 'font-semibold' }, item.task),
                                    React.createElement('p', { className: 'text-xs text-gray-400' }, new Date(item.date).toLocaleDateString())
                                ),
                                React.createElement('span', { className: 'font-bold text-orange-300' }, `${item.time} hrs`)
                            )
                        ))
                    ) : React.createElement(EmptyState, { icon: 'fa-clipboard-list', title: 'No Activities', message: 'Log activities using the form.' })
                )
            ),
            React.createElement('div', null,
                React.createElement('form', { onSubmit: handleSubmit, className: 'glass-card p-6 space-y-4' },
                    React.createElement('h2', { className: 'text-lg font-semibold' }, 'Log New Activity'),
                    React.createElement('div', null,
                        React.createElement('label', { htmlFor: 'task', className: 'block text-sm font-medium mb-1' }, 'Task Description'),
                        React.createElement('textarea', { id: 'task', name: 'task', value: task, onChange: handleTaskChange, className: 'form-textarea', rows: 4, placeholder: 'e.g., Phone call with support coordinator', required: true })
                    ),
                    React.createElement('div', null,
                        React.createElement('label', { htmlFor: 'time', className: 'block text-sm font-medium mb-1' }, 'Time Spent (hours)'),
                        React.createElement('input', { id: 'time', name: 'time', type: 'number', value: time, onChange: handleTimeChange, className: 'form-input', placeholder: 'e.g., 1.5', step: '0.1', required: true })
                    ),
                    React.createElement('button', { type: 'submit', className: 'btn btn-primary w-full' }, 'Log Activity')
                )
            )
        )
    );
}
