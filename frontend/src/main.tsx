import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/shared/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Application Error</div>}>
            <App />
        </ErrorBoundary>
    </StrictMode>,
)
