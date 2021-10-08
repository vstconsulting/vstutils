import { test, describe, beforeAll, expect } from '@jest/globals';
import { createApp } from '../../unittests/create-app.js';

describe('App', () => {
    /**
     * @type {App}
     */
    let app;

    beforeAll(() => {
        return createApp().then((a) => (app = a));
    });

    test('smart translation', () => {
        app.i18n.setLocaleMessage('ru', {
            Hello: 'Привет',
            world: 'мир',
        });
        app.i18n.locale = 'ru';

        expect(app.smartTranslate('Hello')).toBe('Привет');
        expect(app.smartTranslate('World')).toBe('Мир');
        expect(app.smartTranslate(undefined)).toBe('');
        expect(app.smartTranslate(null)).toBe('');
        expect(app.smartTranslate('VST')).toBe('VST');
    });
});
