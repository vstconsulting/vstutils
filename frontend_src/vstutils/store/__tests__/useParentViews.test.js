import { createApp } from '#unittests/create-app';
import { createSchema } from '#unittests/schema';
import { useParentViews } from '../helpers';

let app;

beforeAll(async () => {
    app = await createApp({ schema: createSchema() });
});

test('useParentViews', async () => {
    let currentPath = '';
    const { items, itemsMap, push } = useParentViews({ getPath: () => currentPath });

    const usersView = app.views.get('/user/');
    usersView.resolveState = vitest.fn(() => Promise.resolve());

    const userView = app.views.get('/user/{id}/');
    userView.resolveState = vitest.fn(() => Promise.resolve());

    currentPath = '/user/1337/';
    await push(userView._createStore());
    expect(items.value.length).toBe(2);
    expect(itemsMap.value.get('/user/')).toBe(items.value[0]);
    expect(itemsMap.value.get('/user/{id}/')).toBe(items.value[1]);
    expect(itemsMap.value.size).toBe(2);
    expect(usersView.resolveState).toBeCalledTimes(1);
    expect(userView.resolveState).toBeCalledTimes(1);

    currentPath = '/user/123/';
    await push(userView._createStore());
    expect(items.value.length).toBe(2);
    expect(itemsMap.value.get('/user/')).toBe(items.value[0]);
    expect(itemsMap.value.get('/user/{id}/')).toBe(items.value[1]);
    expect(itemsMap.value.size).toBe(2);
    expect(usersView.resolveState).toBeCalledTimes(1);
    expect(userView.resolveState).toBeCalledTimes(2);
});
