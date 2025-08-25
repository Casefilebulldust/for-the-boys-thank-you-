import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import ToastContainer from '../components/Toast.tsx';

const ToastContext = createContext(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);

    const addToast = useCallback((message, type) => {
        const id = Date.now();
        setToasts(prevToasts => [{ id, message, type }, ...prevToasts.slice(0, 4)]);
    }, []);

    useEffect(() => {
        if (toasts.length > 0) {
            const timer = setTimeout(() => {
                removeToast(toasts[toasts.length - 1].id);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [toasts, removeToast]);

    const contextValue = { addToast };

    return React.createElement(ToastContext.Provider, { value: contextValue },
        children,
        React.createElement(ToastContainer, { toasts, removeToast })
    );
}
