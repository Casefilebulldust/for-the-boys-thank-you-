
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import PageTitle from './PageTitle.tsx';
import EmptyState from './EmptyState.tsx';
import Modal from './Modal.tsx';
import Spinner from './Spinner.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';

const JournalEntryModal = ({ isOpen, onClose, addWellnessLog }) => {
    const { addToast } = useToast();
    const [stress, setStress] = useState(5);
    const [pain, setPain] = useState(5);
    const [detailedContent, setDetailedContent] = useState('');
    
    // Video state
    const [isRecording, setIsRecording] = useState(false);
    const [videoBlob, setVideoBlob] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const cleanup = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
            setVideoUrl(null);
        }
        mediaRecorderRef.current = null;
        chunksRef.current = [];
    }, [videoUrl]);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    const handleStartRecording = async () => {
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            videoRef.current.srcObject = streamRef.current;
            mediaRecorderRef.current = new MediaRecorder(streamRef.current);
            mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
                setVideoBlob(blob);
                const url = URL.createObjectURL(blob);
                setVideoUrl(url);
                chunksRef.current = [];
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            addToast("Could not access camera/microphone. Please check permissions.", "error");
            console.error("Error starting recording:", err);
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsRecording(false);
    };

    const handleDownloadVideo = () => {
        if (!videoBlob) return;
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = `personal-record-${new Date().toISOString().slice(0, 10)}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        addToast("Video downloaded to your device.", "success");
    };
    
    const resetState = () => {
        setStress(5);
        setPain(5);
        setDetailedContent('');
        setIsRecording(false);
        setVideoBlob(null);
        cleanup();
    };

    const handleSave = () => {
        addWellnessLog({
            stress,
            pain,
            notes: `Journal entry created.`, // Simple note for the main view
            detailedContent,
            videoAssociated: !!videoBlob
        });
        resetState();
        onClose();
    };
    
    const handleClose = () => {
        resetState();
        onClose();
    };
    
    const getLevelColor = (level) => {
        if (level >= 8) return 'text-level-high';
        if (level >= 5) return 'text-level-medium';
        return 'text-level-low';
    };

    return React.createElement(Modal, { isOpen, onClose: handleClose },
        React.createElement('div', { className: 'space-y-4' },
            React.createElement('h2', { className: 'text-xl font-bold' }, 'Create Personal Journal Entry'),
            React.createElement('div', { className: 'p-4 bg-bg-secondary rounded-lg' },
                React.createElement('video', { ref: videoRef, autoPlay: true, muted: true, playsInline: true, className: `w-full rounded ${videoUrl ? 'aspect-video' : ''}` }),
                 videoUrl && !isRecording && React.createElement('p', {className: 'text-xs text-center mt-2 text-text-secondary'}, 'Video recording complete. Preview above.'),
                React.createElement('div', { className: 'flex gap-2 mt-4' },
                    React.createElement('button', {
                        onClick: isRecording ? handleStopRecording : handleStartRecording,
                        className: `btn flex-1 ${isRecording ? 'bg-danger-primary text-white' : 'btn-primary'}`
                    }, isRecording ? React.createElement(React.Fragment, null, React.createElement('i', {className: 'fa-solid fa-stop mr-2'}), 'Stop Recording') : React.createElement(React.Fragment, null, React.createElement('i', {className: 'fa-solid fa-video mr-2'}), 'Record Video')),
                    React.createElement('button', {
                        onClick: handleDownloadVideo,
                        disabled: !videoBlob,
                        className: 'btn btn-secondary'
                    }, React.createElement('i', {className: 'fa-solid fa-download mr-2'}), 'Download')
                )
            ),
            React.createElement('div', null,
                React.createElement('label', { htmlFor: 'detailedContent', className: 'block text-sm font-medium mb-1' }, 'Journal Notes'),
                React.createElement('textarea', { id: 'detailedContent', value: detailedContent, onChange: e => setDetailedContent(e.target.value), className: 'form-textarea', rows: 5, placeholder: "How are you feeling physically and emotionally? This is a safe space for your thoughts..." })
            ),
            React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
                 React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'stress_modal', className: 'block text-sm font-medium mb-1 flex justify-between' },
                        React.createElement('span', null, 'Stress Level'),
                        React.createElement('span', { className: `font-bold ${getLevelColor(stress)}` }, stress)
                    ),
                    React.createElement('input', { id: 'stress_modal', type: 'range', min: '0', max: '10', value: stress, onChange: e => setStress(Number(e.target.value)), className: 'w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer' })
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'pain_modal', className: 'block text-sm font-medium mb-1 flex justify-between' },
                        React.createElement('span', null, 'Pain Level'),
                        React.createElement('span', { className: `font-bold ${getLevelColor(pain)}` }, pain)
                    ),
                    React.createElement('input', { id: 'pain_modal', type: 'range', min: '0', max: '10', value: pain, onChange: e => setPain(Number(e.target.value)), className: 'w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer' })
                ),
            ),
            React.createElement('div', { className: 'flex justify-end gap-2 pt-2' },
                React.createElement('button', { type: 'button', onClick: handleClose, className: 'btn btn-secondary' }, 'Cancel'),
                React.createElement('button', { onClick: handleSave, className: 'btn btn-primary' }, 'Save Entry')
            )
        )
    );
};

const WellnessLogCard = ({ log }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getLevelColor = (level) => {
        if (level >= 8) return 'text-level-high';
        if (level >= 5) return 'text-level-medium';
        return 'text-level-low';
    };

    return React.createElement('div', { className: 'glass-card p-4 animate-fade-in' },
        React.createElement('div', { className: 'flex justify-between items-start' },
            React.createElement('div', { className: 'flex-1' },
                React.createElement('p', { className: 'font-semibold text-text-primary' }, new Date(log.date).toLocaleString()),
                log.notes && React.createElement('p', { className: 'text-sm text-text-secondary italic mt-1' }, `"${log.notes}"`)
            ),
            React.createElement('div', { className: 'flex items-center gap-4 text-sm' },
                React.createElement('span', null, 'Stress: ', React.createElement('span', { className: `font-bold ${getLevelColor(log.stress)}` }, log.stress)),
                React.createElement('span', null, 'Pain: ', React.createElement('span', { className: `font-bold ${getLevelColor(log.pain)}` }, log.pain)),
                 log.videoAssociated && React.createElement('i', { className: 'fa-solid fa-video text-info-primary', title: 'A video was recorded and saved with this entry.' })
            )
        ),
        log.detailedContent && React.createElement('div', { className: 'mt-3 pt-3 border-t border-border-primary' },
            isExpanded ? React.createElement(MarkdownRenderer, { markdownText: log.detailedContent }) : React.createElement('p', {className: 'text-sm text-text-secondary'}, `${log.detailedContent.substring(0, 100)}...`),
            React.createElement('button', { onClick: () => setIsExpanded(!isExpanded), className: 'text-accent-primary text-sm font-semibold mt-2' }, isExpanded ? 'Show Less' : 'Show More')
        )
    );
};

export default function WellnessTracker() {
    const { wellnessLogs, addWellnessLog } = useSpudHub();
    const [stress, setStress] = useState(5);
    const [pain, setPain] = useState(5);
    const [notes, setNotes] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        addWellnessLog({ stress: stress, pain: pain, notes });
        setStress(5);
        setPain(5);
        setNotes('');
    };

    const getLevelColor = (level) => {
        if (level >= 8) return 'text-level-high';
        if (level >= 5) return 'text-level-medium';
        return 'text-level-low';
    };

    const handleStressChange = (e) => setStress(Number(e.target.value));
    const handlePainChange = (e) => setPain(Number(e.target.value));
    const handleNotesChange = (e) => setNotes(e.target.value);

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Wellness Tracker', icon: 'fa-heart-pulse', children: null }),
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
            React.createElement('div', { className: 'lg:col-span-1' },
                React.createElement('form', { onSubmit: handleSubmit, className: 'glass-card p-6 space-y-4' },
                    React.createElement('h2', { className: 'text-lg font-semibold' }, 'Daily Check-in'),
                    React.createElement('div', null,
                        React.createElement('label', { htmlFor: 'stress', className: 'block text-sm font-medium mb-1 flex justify-between' },
                            React.createElement('span', null, 'Stress Level'),
                            React.createElement('span', { className: `font-bold ${getLevelColor(stress)}` }, stress)
                        ),
                        React.createElement('input', { id: 'stress', name: 'stress', type: 'range', min: '0', max: '10', value: stress, onChange: handleStressChange, className: 'w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer' })
                    ),
                    React.createElement('div', null,
                        React.createElement('label', { htmlFor: 'pain', className: 'block text-sm font-medium mb-1 flex justify-between' },
                            React.createElement('span', null, 'Pain Level'),
                            React.createElement('span', { className: `font-bold ${getLevelColor(pain)}` }, pain)
                        ),
                        React.createElement('input', { id: 'pain', name: 'pain', type: 'range', min: '0', max: '10', value: pain, onChange: handlePainChange, className: 'w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer' })
                    ),
                    React.createElement('div', null,
                        React.createElement('label', { htmlFor: 'notes', className: 'block text-sm font-medium mb-1' }, 'Notes (Optional)'),
                        React.createElement('textarea', { id: 'notes', name: 'notes', value: notes, onChange: handleNotesChange, className: 'form-textarea', rows: 3, placeholder: 'Any specific thoughts or feelings?' })
                    ),
                    React.createElement('button', { type: 'submit', className: 'btn btn-primary w-full' }, 'Log Check-in'),
                    React.createElement('div', { className: 'border-t border-border-primary my-4' }),
                    React.createElement('button', { type: 'button', onClick: () => setIsModalOpen(true), className: 'btn btn-secondary w-full' }, 
                         React.createElement('i', { className: 'fa-solid fa-book-medical mr-2'}),
                        'Create Journal Entry'
                    )
                )
            ),
            React.createElement('div', { className: 'lg:col-span-2' },
                React.createElement('div', null,
                    React.createElement('h2', { className: 'text-lg font-semibold mb-4' }, 'Recent Logs'),
                     wellnessLogs.length > 0 ? (
                        React.createElement('div', { className: 'space-y-4' }, wellnessLogs.slice(0, 10).map(log =>
                           React.createElement(WellnessLogCard, { key: log.id, log: log })
                        ))
                    ) : React.createElement('div', { className: 'glass-card p-4' }, React.createElement(EmptyState, { icon: 'fa-list-check', title: 'No Logs Yet', message: 'Use the form to add your first daily wellness check-in.', children: null }))
                )
            )
        ),
        React.createElement(JournalEntryModal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false), addWellnessLog: addWellnessLog })
    );
}