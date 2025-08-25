import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const PrintContext = createContext(undefined);

export function usePrint() {
    const context = useContext(PrintContext);
    if (!context) {
        throw new Error('usePrint must be used within a PrintProvider');
    }
    return context;
}

export function PrintProvider({ children }) {
    const [isPrinting, setIsPrinting] = useState(false);
    const [printContent, setPrintContent] = useState(null);

    const triggerPrint = useCallback((content) => {
        setPrintContent(content);
        setIsPrinting(true);
    }, []);

    useEffect(() => {
        if (isPrinting) {
            const handleAfterPrint = () => {
                setIsPrinting(false);
                setPrintContent(null);
                window.removeEventListener('afterprint', handleAfterPrint);
            };
            window.addEventListener('afterprint', handleAfterPrint);
            setTimeout(() => window.print(), 50);

            return () => window.removeEventListener('afterprint', handleAfterPrint);
        }
    }, [isPrinting]);

    const value = { isPrinting, printContent, triggerPrint };

    return React.createElement(PrintContext.Provider, { value: value }, children);
}
