import { init } from './ui';

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
