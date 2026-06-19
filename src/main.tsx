import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

if (typeof window !== 'undefined' && window.navigator.userAgent.indexOf('Html5Plus') !== -1) {
  document.addEventListener('plusready', renderApp, false);
} else {
  renderApp();
}
