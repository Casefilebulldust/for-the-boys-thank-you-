import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToastProvider } from './contexts/ToastContext.tsx';
import { SpudHubProvider } from './contexts/SpudHubContext.tsx';
import { PrintProvider } from './contexts/PrintContext.tsx';
import App from './App.tsx';

// === RENDER APP TO DOM ===
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    React.createElement(React.StrictMode, null,
        React.createElement(ToastProvider, null,
            React.createElement(SpudHubProvider, null,
                React.createElement(PrintProvider, null,
                    React.createElement(App)
                )
            )
        )
    )
);