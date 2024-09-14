import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

console.log('index.js is running');

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    console.log('Attempting to render the app');
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('App rendered successfully');
  } catch (error) {
    console.error('Error rendering the app:', error);
    rootElement.innerHTML = `<div>
      <h1>Error loading the application</h1>
      <p>Please check the console for more details and report this issue.</p>
      <pre>${error.toString()}</pre>
    </div>`;
  }
} else {
  console.error('Root element not found');
}

reportWebVitals();