import { expect, jest, test, describe } from '@jest/globals';
import { AppConfiguration } from '../../../AppConfiguration';
import testSchema from '../../../../__mocks__/testSchema.json';
import { FakeCache } from '../../../../app_loader/Cache';
import { App } from '../../../../spa';
import { globalFields } from '../../fields';
import { globalModels } from '../../../models';
import { apiConnector, APIResponse } from '../../../api';
import { FKField } from '../fk';

jest.mock('../../../api');

describe('FKfield', () => {
    test('Test Fk model', async () => {
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

        await app.start();

        const authorFkField = app.modelsClasses.get('Post').fields.get('author');
        const Post = app.modelsClasses.get('Post');

        expect(authorFkField.format).toBe('fk');
        expect(authorFkField.querysets.length).toBeGreaterThanOrEqual(1);
        expect(authorFkField.querysets[0].url).toBe('/author/');
        expect(authorFkField.querysets[0].models.list.name).toBe(authorFkField.fkModel.name);
        expect(authorFkField.fkModel.name).toBe('Author');
        expect(authorFkField).toBeInstanceOf(FKField);

        const post1 = new Post({ id: 1, name: 'post1', author: 1 });
        const post2 = new Post({ id: 2, name: 'post1', author: 2 });
        const instances = [post1, post2];
        apiConnector._requestHandler = (req) => {
            if (Array.isArray(req.path)) req.path = req.path.join('/');
            if (req.path === 'author') {
                expect(req.query).toStrictEqual({ id: '1,2', limit: 2 });
                return new APIResponse(200, {
                    count: 2,
                    next: null,
                    previous: null,
                    results: [
                        { id: 1, name: 'a1', posts: [] },
                        { id: 2, name: 'a2', posts: [] },
                    ],
                });
            }
        };
        expect(post1._data.author).toBe(1);
        expect(post2._data.author).toBe(2);
        await authorFkField.afterInstancesFetched(instances);
        expect(post1._data.author).toMatchObject({ id: 1, name: 'a1', posts: [] });
        expect(post2._data.author).toMatchObject({ id: 2, name: 'a2', posts: [] });
    });
});
