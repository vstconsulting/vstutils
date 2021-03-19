import { expect, test, describe } from '@jest/globals';
import { createApp } from '../unittests/create-app.js';

describe('App', () => {
    test('Create and init', () => {
        return createApp().then((app) => {
            expect(app.user.username).toBe('testUser');
        });

        // FIXME render function is missing
        // const wrapper = shallowMount(app.application);
    });
});
