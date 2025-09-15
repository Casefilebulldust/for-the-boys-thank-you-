import React, { useState } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import PageTitle from './PageTitle.tsx';
import EmptyState from './EmptyState.tsx';
import Modal from './Modal.tsx';
import { NdisPlan, NdisActivity } from '../services/types.ts';
import { useToast } from '../contexts/ToastContext.tsx';

const NdisPlanModal = ({ isOpen, onClose, onSave, plan }) => {
    const [formData, setFormData] = useState(plan);
    React.useEffect(() => setFormData(plan), [plan]);

    if (!isOpen || !formData) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: name === 'budget' || name === 'claimed' ? Number(value) : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return React.createElement(Modal, { isOpen, onClose },
        React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
            React.createElement('h2', { className: 'text-xl font-bold' }, plan.id ? 'Edit NDIS Plan' : 'Add NDIS Plan'),
            React.createElement('input', { type: 'text', name: 'title', value: formData.title, onChange: handleChange, className: 'form-input', placeholder: 'Plan Title', required: true }),
            React.createElement('input', { type: 'text', name: 'for', value: formData.for, onChange: handleChange, className: 'form-input', placeholder: 'For (e.g., Hayden)', required: true }),
            React.createElement('input', { type: 'number', name: 'budget', value: formData.budget, onChange: handleChange, className: 'form-input', placeholder: 'Total Budget', required: true }),
            React.createElement('input', { type: 'number', name: 'claimed', value: formData.claimed, onChange: handleChange, className: 'form-input', placeholder: 'Amount Claimed', required: true }),
            React.createElement('div', { className: 'flex justify-end gap-2 pt-2' },
                React.createElement('button', { type: 'button', onClick: onClose, className: 'btn btn-secondary' }, 'Cancel'),
                React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Save')
            )
        )
    );
};


export default function NDISCoordination() {
    const { ndisData, setData } = useSpudHub();
    const { addToast } = useToast();
    const [task, setTask] = useState('');
    const [time, setTime] = useState('');
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<NdisPlan | null>(null);

    const handleLogActivity = (e) => {
        e.preventDefault();
        if (task && time) {
            const newActivity: NdisActivity = { id: Date.now(), date: new Date().toISOString(), task, time: parseFloat(time) };
            setData('ndisData', { ...ndisData, activities: [newActivity, ...ndisData.activities] });
            setTask('');
            setTime('');
            addToast("Activity logged.", "success");
        }
    };

    const handleSavePlan = (planData) => {
        if (planData.id) {
            setData('ndisData', { ...ndisData, plans: ndisData.plans.map(p => p.id === planData.id ? planData : p) });
            addToast("Plan updated.", "success");
        } else {
            const newPlan = { ...planData, id: Date.now() };
            setData('ndisData', { ...ndisData, plans: [...ndisData.plans, newPlan] });
            addToast("New plan added.", "success");
        }
    };

    const handleNewPlan = () => {
        setEditingPlan({ title: '', for: '', budget: 0, claimed: 0 } as NdisPlan);
        setIsPlanModalOpen(true);
    };

    const handleEditPlan = (plan: NdisPlan) => {
        setEditingPlan(plan);
        setIsPlanModalOpen(true);
    };

    const handleDeletePlan = (id: number) => {
        if (window.confirm("Are you sure you want to delete this plan?")) {
            setData('ndisData', { ...ndisData, plans: ndisData.plans.filter(p => p.id !== id) });
            addToast("Plan deleted.", "success");
        }
    };

    const handleDeleteActivity = (id: number) => {
         if (window.confirm("Are you sure you want to delete this activity log?")) {
            setData('ndisData', { ...ndisData, activities: ndisData.activities.filter(a => a.id !== id) });
            addToast("Activity deleted.", "success");
        }
    };


    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'NDIS Coordination', icon: 'fa-hand-holding-medical' },
            React.createElement('button', {onClick: handleNewPlan, className: 'btn btn-primary'}, React.createElement('i', {className: 'fa-solid fa-plus mr-2'}), 'Add Plan')
        ),
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
            React.createElement('div', { className: 'lg:col-span-2 space-y-6' },
                React.createElement('div', { className: 'glass-card p-6' },
                    React.createElement('h2', { className: 'text-lg font-semibold mb-4' }, 'Active Plans'),
                     ndisData.plans.length > 0 ? React.createElement('ul', { className: 'space-y-4' }, ndisData.plans.map(plan =>
                        React.createElement('li', { key: plan.id, className: 'p-4 bg-bg-secondary rounded-lg' },
                            React.createElement('div', {className: 'flex justify-between items-start'},
                                React.createElement('div', null,
                                    React.createElement('p', { className: 'font-semibold' }, plan.title, ` (for ${plan.for})`),
                                    React.createElement('p', { className: 'text-xs text-right mt-1 text-text-secondary' },
                                        `$${plan.claimed.toLocaleString()} / $${plan.budget.toLocaleString()} Claimed`
                                    )
                                ),
                                React.createElement('div', {className: 'flex gap-2'}, 
                                    React.createElement('button', {onClick: () => handleEditPlan(plan), className: 'btn btn-secondary btn-sm p-2 w-8 h-8'}, React.createElement('i', {className: 'fa-solid fa-pencil'})),
                                    React.createElement('button', {onClick: () => handleDeletePlan(plan.id), className: 'btn btn-secondary btn-sm p-2 w-8 h-8 text-danger-primary'}, React.createElement('i', {className: 'fa-solid fa-trash'}))
                                )
                            ),
                            React.createElement('div', { className: 'w-full bg-bg-tertiary rounded-full h-2.5 mt-2' },
                                React.createElement('div', {
                                    className: 'bg-accent-secondary h-2.5 rounded-full',
                                    style: { width: `${(plan.claimed / plan.budget) * 100}%` }
                                })
                            )
                        )
                    )) : React.createElement(EmptyState, { icon: 'fa-file-invoice-dollar', title: 'No Plans Added', message: 'Add an NDIS plan to start tracking budgets.'})
                ),
                React.createElement('div', { className: 'glass-card' },
                    React.createElement('div', { className: 'p-4 border-b border-border-primary' },
                        React.createElement('h2', { className: 'text-lg font-semibold' }, 'Activity Log')
                    ),
                    ndisData.activities.length > 0 ? (
                        React.createElement('ul', { className: 'divide-y divide-border-primary' }, ndisData.activities.map(item =>
                            React.createElement('li', { key: item.id, className: 'p-4 flex justify-between items-start' },
                                React.createElement('div', null,
                                    React.createElement('p', { className: 'font-semibold' }, item.task),
                                    React.createElement('p', { className: 'text-xs text-text-secondary' }, new Date(item.date).toLocaleDateString())
                                ),
                                React.createElement('div', {className: 'flex items-center gap-4'},
                                    React.createElement('span', { className: 'font-bold text-accent-primary' }, `${item.time} hrs`),
                                    React.createElement('button', {onClick: () => handleDeleteActivity(item.id), className: 'btn btn-secondary btn-sm p-2 w-7 h-7 text-danger-primary'}, React.createElement('i', {className: 'fa-solid fa-trash text-xs'}))
                                )
                            )
                        ))
                    ) : React.createElement(EmptyState, { icon: 'fa-clipboard-list', title: 'No Activities', message: 'Log activities using the form.' })
                )
            ),
            React.createElement('div', null,
                React.createElement('form', { onSubmit: handleLogActivity, className: 'glass-card p-6 space-y-4' },
                    React.createElement('h2', { className: 'text-lg font-semibold' }, 'Log New Activity'),
                    React.createElement('div', null,
                        React.createElement('label', { htmlFor: 'ndis-task', className: 'block text-sm font-medium mb-1' } as any, 'Task Description'),
                        React.createElement('textarea', { id: 'ndis-task', name: 'task', value: task, onChange: e => setTask(e.target.value), className: 'form-textarea', rows: 4, placeholder: 'e.g., Phone call with support coordinator', required: true } as any)
                    ),
                    React.createElement('div', null,
                        React.createElement('label', { htmlFor: 'ndis-time', className: 'block text-sm font-medium mb-1' } as any, 'Time Spent (hours)'),
                        React.createElement('input', { id: 'ndis-time', name: 'time', type: 'number', value: time, onChange: e => setTime(e.target.value), className: 'form-input', placeholder: 'e.g., 1.5', step: '0.1', required: true } as any)
                    ),
                    React.createElement('button', { type: 'submit', className: 'btn btn-primary w-full' }, 'Log Activity')
                )
            )
        ),
        React.createElement(NdisPlanModal, {
            isOpen: isPlanModalOpen,
            onClose: () => setIsPlanModalOpen(false),
            onSave: handleSavePlan,
            plan: editingPlan
        })
    );
}