import { expect, test, beforeAll, jest } from '@jest/globals';
import { createApp } from '@/unittests/create-app';
import { createSchema } from '@/unittests/schema';
import { useParentViews } from '../helpers';

let app;

beforeAll(async () => {
    app = await createApp({ schema: createSchema() });
});

test('useParentViews', async () => {
    const { items, itemsMap, push } = useParentViews();

    const usersView = app.views.get('/user/');
    usersView.resolveState = jest.fn(() => Promise.resolve());

    const userView = app.views.get('/user/{id}/');
    userView.resolveState = jest.fn(() => Promise.resolve());

    await app.router.push('/user/1337/');
    await push(userView._createStore());
    expect(items.value.length).toBe(2);
    expect(itemsMap.value.get('/user/')).toBe(items.value[0]);
    expect(itemsMap.value.get('/user/{id}/')).toBe(items.value[1]);
    expect(itemsMap.value.size).toBe(2);
    expect(usersView.resolveState).toBeCalledTimes(1);
    expect(userView.resolveState).toBeCalledTimes(1);

    await app.router.push('/user/123/');
    await push(userView._createStore());
    expect(items.value.length).toBe(2);
    expect(itemsMap.value.get('/user/')).toBe(items.value[0]);
    expect(itemsMap.value.get('/user/{id}/')).toBe(items.value[1]);
    expect(itemsMap.value.size).toBe(2);
    expect(usersView.resolveState).toBeCalledTimes(1);
    expect(userView.resolveState).toBeCalledTimes(2);
});
