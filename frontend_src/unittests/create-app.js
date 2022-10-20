import { App } from '../spa.js';
import { AppConfiguration } from '../vstutils/AppConfiguration.ts';
import { FakeCache } from '../app_loader/Cache.js';
import { createLocalVue } from '@vue/test-utils';

import testSchema from '../__mocks__/testSchema.json';

export function createApp({ schema = testSchema } = {}) {
    const config = new AppConfiguration({
        isDebug: true,
        hostUrl: 'http://localhost',
        endpointUrl: 'http://localhost/api/endpoint/',
        isSuperuser: false,
        isStaff: false,
        schema,
    });
    const cache = new FakeCache();
    const app = new App(config, cache, createLocalVue());

    const loadLanguages = app.translationsManager.loadLanguages;
    app.translationsManager.loadLanguages = () =>
        Promise.resolve([
            { code: 'en', name: 'English' },
            { code: 'ru', name: 'Russian' },
        ]);

    const loadTranslations = app.translationsManager.loadTranslations;
    app.translationsManager.loadTranslations = () =>
        Promise.resolve({ version: 'versions | version | versions' });

    app.translationsManager.getTranslations = () =>
        Promise.resolve({ version: 'versions | version | versions' });

    const loadUser = app.api.loadUser;
    app.api.loadUser = () =>
        Promise.resolve({
            email: 'admin@admin.admin',
            first_name: '',
            id: 1,
            is_active: true,
            is_staff: false,
            last_name: '',
            username: 'testUser',
        });

    const loadSettings = app.loadSettings;
    app.loadSettings = () => Promise.resolve({});

    return app.start().then(() => {
        app.translationsManager.loadLanguages = loadLanguages;
        app.translationsManager.loadTranslations = loadTranslations;
        app.api.loadUser = loadUser;
        app.loadSettings = loadSettings;
        return app;
    });
}
