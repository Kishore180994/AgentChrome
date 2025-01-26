import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Sidebar from './components/Sidebar';
import './index.css';

// Check if sidebar is already initialized
const container = document.getElementById('agent-chrome-root');
if (!container) {
  throw new Error('Sidebar container not found');
}

// Only initialize if not already initialized
if (!(container as any).__SIDEBAR_INITIALIZED__) {
  (container as any).__SIDEBAR_INITIALIZED__ = true;

  // Render sidebar
  createRoot(container).render(
    <StrictMode>
      <Sidebar />
    </StrictMode>
  );
} 