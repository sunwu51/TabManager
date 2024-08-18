/* global chrome */
import App from './App';
import { createRoot } from 'react-dom/client';
import './index.css'


chrome.runtime.onMessage.addListener(async function (e) {
    console.log(e);
});

const root = createRoot(document.getElementById('root'));
root.render(
    <App />
);
