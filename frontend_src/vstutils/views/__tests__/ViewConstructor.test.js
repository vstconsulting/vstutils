import { describe, expect, test, beforeAll } from '@jest/globals';
import { HttpMethods, RequestTypes } from '../../utils';
import openapi_dictionary from '../../api/openapi.js';
import ViewConstructor from '../ViewConstructor.js';
import testSchema from './../../../__mocks__/testSchema.json';
import { PageEditView, ViewTypes } from '../View.ts';
import { addDefaultFields, FieldsResolver } from '../../fields';
import { ModelsResolver } from '../../models';
import { createSchema } from '../../../unittests/schema';
import { StringField } from '../../fields/text';
import { ArrayField } from '../../fields/array';
import { NumberField } from '../../fields/numbers';
import { OrderingChoicesField } from '@/vstutils/fields/choices';
import { createApp } from '../../../unittests/create-app';

describe('ViewConstructor', () => {
    let views;
    let modelsClasses;

    beforeAll(() => {
        const fieldsResolver = new FieldsResolver(testSchema);
        addDefaultFields(fieldsResolver);
        const modelsResolver = new ModelsResolver(fieldsResolver, testSchema);
        const viewConstructor = new ViewConstructor(openapi_dictionary, modelsResolver, fieldsResolver);
        views = viewConstructor.generateViews(testSchema);
        modelsClasses = modelsResolver._definitionsModels;
    });

    test.each(['/fragment1/fragment2/fragment3/fragment4/author/', '/author/'])(
        'authors view (%s)',
        (path) => {
            const authorsView = views.get(path);
            expect(authorsView).toBeDefined();

            let qs = authorsView.objects;
            expect(qs.models[RequestTypes.LIST]).toStrictEqual([null, modelsClasses.get('Author')]);
            expect(qs.models[RequestTypes.RETRIEVE]).toStrictEqual([null, modelsClasses.get('OneAuthor')]);
            expect(qs.models[RequestTypes.PARTIAL_UPDATE]).toStrictEqual([
                modelsClasses.get('AuthorUpdate'),
                modelsClasses.get('AuthorUpdate'),
            ]);

            const subWithPostSublink = authorsView.sublinks.get('sub_with_post');
            expect(subWithPostSublink).toBeDefined();
            expect(subWithPostSublink.name).toBe('sub_with_post');
            expect(subWithPostSublink.title).toBe('Sub with post');
            expect(subWithPostSublink.href).toBe(`${path}sub_with_post/`);

            const newSublink = authorsView.sublinks.get('new');
            expect(newSublink).toBeDefined();
            expect(newSublink.name).toBe('new');
            expect(newSublink.title).toBe('Create');
            expect(newSublink.appendFragment).toBe('new');

            const removeAction = authorsView.multiActions.get('remove');
            expect(removeAction).toBeDefined();
            expect(removeAction.name).toBe('remove');
            expect(removeAction.title).toBe('Remove');

            expect(authorsView.sublinks.size).toBe(2);
            expect(authorsView.actions.size).toBe(1);
            expect(authorsView.multiActions.size).toBe(1);
        },
    );

    test.each(['/fragment1/fragment2/fragment3/fragment4/author/new/', '/author/new/'])(
        'new author view',
        (path) => {
            const view = views.get(path);

            const qs = view.objects;
            expect(qs).toBeDefined();

            expect(view.listView.path).toBe(path.replace(/new\/$/, ''));

            const saveAction = view.actions.get('save');
            expect(saveAction).toBeDefined();
            expect(saveAction.name).toBe('save');
            expect(saveAction.title).toBe('Save');

            expect(view.actions.size).toBe(1);
            expect(view.sublinks.size).toBe(0);
        },
    );

    test.each(['/fragment1/fragment2/fragment3/fragment4/author/{id}/post/', '/author/{id}/post/'])(
        'nested posts list (%s)',
        (path) => {
            /** type {ListView} */
            const view = views.get(path);

            expect(view.nestedQueryset).toBe(views.get('/post/').objects);

            const qs = view.objects;
            expect(qs.models[RequestTypes.LIST]).toStrictEqual([null, modelsClasses.get('Post')]);
            expect(qs.models[RequestTypes.RETRIEVE]).toStrictEqual([null, modelsClasses.get('OnePost')]);
            expect(qs.models[RequestTypes.UPDATE]).toBeUndefined();
            expect(qs.models[RequestTypes.PARTIAL_UPDATE]).toStrictEqual([
                modelsClasses.get('OnePost'),
                modelsClasses.get('OnePost'),
            ]);

            const archiveAllAction = view.actions.get('archive_all');
            expect(archiveAllAction).toBeDefined();
            expect(archiveAllAction.isEmpty).toBeTruthy();
            expect(archiveAllAction.title).toBe('Archive All Posts');
            expect(archiveAllAction.method).toBe(HttpMethods.DELETE);
            expect(archiveAllAction.path).toBe(`${path}archive_all/`);

            const appendNestedAction = view.actions.get('add');
            expect(appendNestedAction).toBeDefined();
            expect(appendNestedAction.name).toBe('add');
            expect(appendNestedAction.title).toBe('Add');
            expect(appendNestedAction.component).toBeInstanceOf(Object);

            const createNestedAction = view.sublinks.get('new');
            expect(createNestedAction).toBeDefined();
            expect(createNestedAction.name).toBe('new');
            expect(createNestedAction.title).toBe('Create');

            const removeMultiAction = view.multiActions.get('remove');
            expect(removeMultiAction).toBeDefined();
            expect(removeMultiAction.name).toBe('remove');
            expect(removeMultiAction.title).toBe('Remove');
            expect(removeMultiAction.isEmpty).toBeUndefined();

            expect(view.multiActions.has('archive')).toBeFalsy();

            const changeTitleMultiAction = view.multiActions.get('change_title');
            expect(changeTitleMultiAction).toBeDefined();
            expect(changeTitleMultiAction.name).toBe('change_title');
            expect(changeTitleMultiAction.title).toBe('Change title');
            expect(changeTitleMultiAction.isEmpty).toBeFalsy();

            expect(view.sublinks.size).toBe(1);
            expect(view.actions.size).toBe(3);
            expect(view.multiActions.size).toBe(2);
        },
    );

    test.each([
        '/fragment1/fragment2/fragment3/fragment4/author/{id}/post/{post_id}/',
        '/author/{id}/post/{post_id}/',
    ])('nested post detail (%s)', (path) => {
        const authorPost = views.get(path);
        expect(authorPost).toBeDefined();
        expect(authorPost.type).toBe(ViewTypes.PAGE_EDIT);

        expect(authorPost.pkParamName).toBe('post_id');

        const archiveAction = authorPost.actions.get('archive');
        expect(archiveAction).toBeDefined();
        expect(archiveAction.isEmpty).toBeTruthy();
        const changeTitleAction = authorPost.actions.get('change_title');
        expect(changeTitleAction).toBeDefined();
        expect(changeTitleAction.isEmpty).toBeFalsy();
        expect(changeTitleAction.view.params.requestModel).toBe(modelsClasses.get('ChangeTitle'));
        const saveAction = authorPost.actions.get('save');
        expect(saveAction).toBeDefined();
        expect(saveAction.isEmpty).toBeFalsy();
        const reloadAction = authorPost.actions.get('reload');
        expect(reloadAction).toBeDefined();
        expect(reloadAction.isEmpty).toBeFalsy();

        expect(authorPost.sublinks.size).toBe(2);
        expect(authorPost.actions.size).toBe(6);
    });

    test.each([
        '/fragment1/fragment2/fragment3/fragment4/author/{id}/post/{post_id}/change_title/',
        '/author/{id}/post/{post_id}/change_title/',
        '/post/{id}/change_title/',
    ])('nested post detail (%s)', (path) => {
        const changeTitleView = views.get(path);
        expect(changeTitleView).toBeDefined();
        expect(changeTitleView.type).toBe(ViewTypes.ACTION);
        expect(changeTitleView.params.requestModel).toBe(modelsClasses.get('ChangeTitle'));
        expect(changeTitleView.params.responseModel).toBe(modelsClasses.get('ChangeTitleResult'));

        const executeAction = changeTitleView.actions.get('execute');
        expect(executeAction).toBeDefined();
        expect(executeAction.title).toBe('Change title');

        expect(changeTitleView.sublinks.size).toBe(0);
        expect(changeTitleView.actions.size).toBe(1);
    });

    test('posts view', () => {
        const postsView = views.get('/post/');
        expect(postsView).toBeDefined();

        const newSublink = postsView.sublinks.get('new');
        expect(newSublink).toBeDefined();
        expect(newSublink.name).toBe('new');
        expect(newSublink.title).toBe('Create');
        expect(newSublink.appendFragment).toBe('new');

        expect(postsView.sublinks.size).toBe(1);
        expect(postsView.actions.size).toBe(2);
    });

    test.each([
        '/author/{id}/post/{post_id}/',
        '/fragment1/fragment2/fragment3/fragment4/author/{id}/post/{post_id}/',
        '/nested/nested/post/{id}/',
        '/post/{id}/',
    ])('post edit only view (%s)', (path) => {
        const postEditView = views.get(path);
        expect(postEditView).toBeInstanceOf(PageEditView);
        expect(postEditView.isEditStyleOnly).toBeTruthy();
        expect(postEditView.actions.has('edit')).toBeFalsy();
        const removeAction = postEditView.actions.get('remove');
        expect(removeAction).toBeDefined();
        expect(removeAction.name).toBe('remove');
        expect(removeAction.title).toBe('Remove');
        expect(views.has(path + 'edit/')).toBeFalsy();
    });

    test.each([
        '/author/{id}/post/{post_id}/',
        '/fragment1/fragment2/fragment3/fragment4/author/{id}/post/{post_id}/',
        '/post/{id}/',
    ])('nested detail "sub" view (%s)', (path) => {
        const postDetailView = views.get(path);

        const subViewSublink = postDetailView.sublinks.get('sub');
        expect(subViewSublink).toBeDefined();
        expect(subViewSublink.name).toBe('sub');
        expect(subViewSublink.title).toBe('Sub');
        expect(subViewSublink.href).toBe(`${path}sub/`);

        const subView = views.get(subViewSublink.href);
        expect(subView).toBeDefined();

        const qs = subView.objects;
        expect(qs.models[RequestTypes.RETRIEVE]).toStrictEqual([null, modelsClasses.get('SubView')]);
        expect(qs.models[RequestTypes.UPDATE]).toBeUndefined();
        expect(qs.models[RequestTypes.PARTIAL_UPDATE]).toStrictEqual([
            modelsClasses.get('SubView'),
            modelsClasses.get('SubView'),
        ]);

        const editSublink = subView.sublinks.get('edit');
        expect(editSublink).toBeDefined();
        expect(editSublink.name).toBe('edit');
        expect(editSublink.title).toBe('Edit');

        const removeAction = subView.actions.get('remove');
        expect(removeAction).toBeDefined();
        expect(removeAction.name).toBe('remove');
        expect(removeAction.title).toBe('Remove');

        const editSubView = views.get(`${path}sub/edit/`);
        expect(editSubView.objects).toBe(subView.objects);

        expect(subView.sublinks.size).toBe(1);
        expect(subView.actions.size).toBe(1);
    });

    test.each(['/author/', '/fragment1/fragment2/fragment3/fragment4/author/', '/author/'])(
        'nested detail "sub_with_post" view (%s)',
        (path) => {
            const authorsList = views.get(path);

            expect(authorsList.pageView).toBe(views.get(`${path}{id}/`));

            const subViewSublink = authorsList.sublinks.get('sub_with_post');
            expect(subViewSublink).toBeDefined();
            expect(subViewSublink.name).toBe('sub_with_post');
            expect(subViewSublink.title).toBe('Sub with post');
            expect(subViewSublink.href).toBe(`${path}sub_with_post/`);

            const subView = views.get(subViewSublink.href);
            expect(subView).toBeDefined();

            const qs = subView.objects;
            expect(qs.models[RequestTypes.RETRIEVE]).toStrictEqual([null, modelsClasses.get('SubView')]);
            expect(qs.models[RequestTypes.CREATE]).toStrictEqual([
                modelsClasses.get('SubView'),
                modelsClasses.get('SubView'),
            ]);

            const newSublink = subView.sublinks.get('new');
            expect(newSublink).toBeDefined();
            expect(newSublink.name).toBe('new');
            expect(newSublink.title).toBe('Create');
            expect(newSublink.appendFragment).toBe('new');

            const removeAction = subView.actions.get('remove');
            expect(removeAction).toBeDefined();
            expect(removeAction.name).toBe('remove');
            expect(removeAction.title).toBe('Remove');

            expect(subView.sublinks.size).toBe(1);
            expect(subView.actions.size).toBe(1);
        },
    );

    test('that there are no duplicated routes', () => {
        const routes = [];
        for (const view of views.values()) {
            const routeAlreadyExists = routes.includes(view.path);
            if (routeAlreadyExists) {
                // eslint-disable-next-line no-unused-vars
                const samePathViews = Array.from(views).filter(([path, v]) => v.path === view.path);
                throw new Error(`${samePathViews.length} views have same path (${view.path})`);
            }
            routes.push(view.path);
        }
    });

    test('parent views', () => {
        function* getParents(view) {
            if (view.parent) {
                yield view.parent;
                yield* getParents(view.parent);
            }
        }
        const deepNestedDetailMeta = views.get(
            '/fragment1/fragment2/fragment3/fragment4/author/{id}/post/{post_id}/meta/{meta_id}/',
        );

        const parentsPaths = Array.from(getParents(deepNestedDetailMeta)).map((parent) => parent.path);
        const expectedPaths = [
            views.get('/fragment1/fragment2/fragment3/fragment4/author/{id}/post/{post_id}/meta/'),
            views.get('/fragment1/fragment2/fragment3/fragment4/author/{id}/post/{post_id}/'),
            views.get('/fragment1/fragment2/fragment3/fragment4/author/{id}/post/'),
            views.get('/fragment1/fragment2/fragment3/fragment4/author/{id}/'),
            views.get('/fragment1/fragment2/fragment3/fragment4/author/'),
        ].map((view) => view.path);

        expect(parentsPaths).toStrictEqual(expectedPaths);
    });
});

test('detail view filters', async () => {
    const schema = createSchema({
        paths: {
            '/some/{id}/': {
                parameters: [{ name: 'id', in: 'path', required: true, type: 'integer' }],
                get: {
                    operationId: 'some_get',
                    responses: {
                        200: { schema: { properties: { id: { type: 'number' } } } },
                    },
                    parameters: [
                        { name: 'filter', in: 'query', required: false, type: 'string' },
                        {
                            name: 'number_array',
                            in: 'query',
                            required: false,
                            type: 'array',
                            collectionFormat: 'pipes',
                            items: { type: 'number' },
                        },
                    ],
                },
            },
            '/without_filters/{id}/': {
                parameters: [{ name: 'id', in: 'path', required: true, type: 'integer' }],
                get: {
                    operationId: 'without_filters_get',
                    responses: {
                        200: { schema: { properties: { id: { type: 'number' } } } },
                    },
                    parameters: [],
                },
            },
        },
    });
    const app = await createApp({ schema });

    const view = app.views.get('/some/{id}/');
    const model = view.filtersModelClass;
    expect(model).not.toBeNull();
    expect(model.fields.size).toBe(2);
    expect(model.fields.get('filter')).toBeInstanceOf(StringField);
    expect(model.fields.get('number_array')).toBeInstanceOf(ArrayField);
    expect(model.fields.get('number_array').itemField).toBeInstanceOf(NumberField);

    expect(app.views.get('/without_filters/{id}/').filtersModelClass).toBeNull();
});

test('ordering filter field', async () => {
    const schema = createSchema({
        paths: {
            '/some_list/': {
                get: {
                    operationId: 'some_list',
                    parameters: [
                        {
                            name: 'ordering',
                            in: 'query',
                            type: 'array',
                            collectionFormat: 'csv',
                            items: {
                                type: 'string',
                                format: 'ordering_choices',
                                enum: ['id', '-id'],
                            },
                        },
                    ],
                    responses: { 200: {} },
                },
            },
        },
    });
    const app = await createApp({ schema });
    const view = app.views.get('/some_list/');
    expect(view.filters.ordering).toBeInstanceOf(ArrayField);
    expect(view.filters.ordering.itemField).toBeInstanceOf(OrderingChoicesField);
});
