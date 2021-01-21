import { expect, jest, test, describe } from '@jest/globals';
import { App } from '../spa.js';
import { AppConfiguration } from '../vstutils/AppConfiguration.js';
import { FakeCache } from '../app_loader/Cache.js';
import { globalFields } from '../vstutils/fields';
import { globalModels } from '../vstutils/models';
import testSchema from '../__mocks__/testSchema.json';
import { apiConnector, APIResponse } from '../vstutils/api';

jest.mock('../vstutils/api');

describe('App', () => {
    test('Create and init', async () => {
        const config = new AppConfiguration({
            isDebug: true,
            hostUrl: 'http://localhost:8080',
            endpointUrl: 'http://localhost:8080/api/endpoint/',
            projectName: 'TestProject',
            projectVersion: '1.0.0',
            fullVersion: '1.0.0_1.0.0_4.2.2b5',
            fullUserVersion: '1.0.0_1.0.0_4.2.2b5_1',
            isSuperuser: false,
            isStaff: false,
            schema: testSchema,
        });
        const cache = new FakeCache();
        const app = new App(config, cache, globalFields, globalModels);

        apiConnector._requestHandler = ({ path }) => {
            if (Array.isArray(path)) path = path.join('/');

            if (path === 'user/1') {
                return new APIResponse(200, {
                    email: 'admin@admin.admin',
                    first_name: '',
                    id: 1,
                    is_active: true,
                    is_staff: false,
                    last_name: '',
                    username: 'testUser',
                });
            } else if (path === '/_lang/') {
                return new APIResponse(200, {
                    count: 2,
                    next: null,
                    previous: null,
                    results: [
                        { code: 'en', name: 'English' },
                        { code: 'ru', name: 'Russian' },
                    ],
                });
            } else if (path === '_lang/en') {
                return new APIResponse(200, {
                    code: 'en',
                    name: 'English',
                    translations: { version: 'versions | version | versions' },
                });
            } else {
                return new APIResponse(404);
            }
        };

        await app.start();

        expect(app.user.username).toBe('testUser');

        // FIXME render function is missing
        // const wrapper = shallowMount(app.application);
    });
});
