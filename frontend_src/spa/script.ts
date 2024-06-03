import { initApp } from '../index';

initApp({
    api: {
        url: new URL('/api/', window.location.origin).toString(),
    },
});
