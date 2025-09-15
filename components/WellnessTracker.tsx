


import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSpudHub } from '../contexts/SpudHubContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import PageTitle from './PageTitle.tsx';
import EmptyState from './EmptyState.tsx';
import Modal from './Modal.tsx';
import Spinner from './Spinner.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import { analyzeJournalEntry } from '../services/geminiService.ts';

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
                React.createElement('label', { htmlFor: 'journal-notes', className: 'block text-sm font-medium mb-1' } as any, 'Journal Notes'),
                React.createElement('textarea', { id: 'journal-notes', name: 'detailedContent', value: detailedContent, onChange: e => setDetailedContent(e.target.value), className: 'form-textarea', rows: 5, placeholder: "How are you feeling physically and emotionally? This is a safe space for your thoughts..." } as any)
            ),
            React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
                 React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'stress-level', className: 'block text-sm font-medium mb-1 flex justify-between' } as any,
                        React.createElement('span', null, 'Stress Level'),
                        React.createElement('span', { className: `font-bold ${getLevelColor(stress)}` }, stress)
                    ),
                    React.createElement('input', { id: 'stress-level', name: 'stress', type: 'range', min: '0', max: '10', value: stress, onChange: e => setStress(Number(e.target.value)), className: 'w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer' } as any)
                ),
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: 'pain-level', className: 'block text-sm font-medium mb-1 flex justify-between' } as any,
                        React.createElement('span', null, 'Pain Level'),
                        React.createElement('span', { className: `font-bold ${getLevelColor(pain)}` }, pain)
                    ),
                    React.createElement('input', { id: 'pain-level', name: 'pain', type: 'range', min: '0', max: '10', value: pain, onChange: e => setPain(Number(e.target.value)), className: 'w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer' } as any)
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
    const { promptSettings, isAiAvailable } = useSpudHub();
    const { addToast } = useToast();
    const [isExpanded, setIsExpanded] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const getLevelColor = (level) => {
        if (level >= 8) return 'text-level-high';
        if (level >= 5) return 'text-level-medium';
        return 'text-level-low';
    };

    const handleAnalyze = async () => {
        if (!isAiAvailable) return addToast("AI features require an API Key.", "error");
        setIsAnalyzing(true);
        try {
            const result = await analyzeJournalEntry(log.detailedContent, promptSettings.analyzeJournalEntry);
            setAnalysis(result);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            addToast(`Analysis error: ${error.message}`, "error");
        } finally {
            setIsAnalyzing(false);
        }
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
        ),
        log.detailedContent && isExpanded && isAiAvailable && React.createElement('div', { className: 'mt-3 pt-3 border-t border-border-primary' },
            analysis ? 
                React.createElement('div', {className: 'p-3 bg-bg-secondary rounded-lg'}, React.createElement(MarkdownRenderer, { markdownText: `**SpudBud's Reflection:**\n\n${analysis}` })) :
                React.createElement('button', { onClick: handleAnalyze, disabled: isAnalyzing, className: 'btn btn-secondary btn-sm' }, 
                    isAnalyzing ? React.createElement(Spinner, {size: 'fa-sm'}) : React.createElement(React.Fragment, null, React.createElement('i', {className: 'fa-solid fa-brain mr-2'}), 'Get AI Reflection')
                )
        )
    );
};

export default function WellnessTracker() {
    const { wellnessLogs, addWellnessLog } = useSpudHub();
    const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);

    const handleQuickLog = (stress, pain) => {
        addWellnessLog({ stress, pain, notes: `Quick log: Stress ${stress}, Pain ${pain}.` });
    };

    return React.createElement('div', { className: 'animate-fade-in' },
        React.createElement(PageTitle, { title: 'Wellness Tracker', icon: 'fa-heart-pulse' },
            React.createElement('button', { onClick: () => setIsJournalModalOpen(true), className: 'btn btn-primary' }, 
                React.createElement('i', { className: 'fa-solid fa-book-medical mr-2'}),
                'New Journal Entry'
            )
        ),
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-6' },
            React.createElement('div', { className: 'md:col-span-2' },
                 React.createElement('div', { className: 'space-y-4' },
                    wellnessLogs.length > 0 ? wellnessLogs.map(log => 
                        React.createElement(WellnessLogCard, { key: log.id, log: log })
                    ) : React.createElement('div', {className: 'glass-card'}, React.createElement(EmptyState, { icon: 'fa-heart-circle-xmark', title: 'No Wellness Logs', message: 'Use the controls to add a quick log or create a detailed journal entry.'}))
                )
            ),
            React.createElement('div', { className: 'space-y-4' },
                React.createElement('div', { className: 'glass-card p-6' },
                    React.createElement('h2', { className: 'text-lg font-semibold mb-3' }, 'Quick Log'),
                    React.createElement('p', { className: 'text-sm text-text-secondary mb-4' }, 'How are you feeling right now?'),
                    React.createElement('div', { className: 'flex justify-around' },
                        React.createElement('button', { onClick: () => handleQuickLog(3, 3), className: 'btn btn-secondary flex-col h-20 w-20' }, React.createElement('i', {className: 'fa-solid fa-face-smile text-2xl mb-1 text-success-primary'}), React.createElement('span', {className: 'text-xs'}, 'Okay')),
                        React.createElement('button', { onClick: () => handleQuickLog(6, 6), className: 'btn btn-secondary flex-col h-20 w-20' }, React.createElement('i', {className: 'fa-solid fa-face-meh text-2xl mb-1 text-warning-primary'}), React.createElement('span', {className: 'text-xs'}, 'Struggling')),
                        React.createElement('button', { onClick: () => handleQuickLog(9, 9), className: 'btn btn-secondary flex-col h-20 w-20' }, React.createElement('i', {className: 'fa-solid fa-face-dizzy text-2xl mb-1 text-danger-primary'}), React.createElement('span', {className: 'text-xs'}, 'Overwhelmed'))
                    )
                )
            )
        ),
        React.createElement(JournalEntryModal, { 
            isOpen: isJournalModalOpen, 
            onClose: () => setIsJournalModalOpen(false),
            addWellnessLog: addWellnessLog
        })
    );
}
