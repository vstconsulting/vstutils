import { createApp, createSchema, useTestCtx } from '#unittests';
import { hookViewOperation } from '../signals';

test('operations hooks', async () => {
    const onBefore = vitest.fn((() => {
        return {
            prevent: true,
        };
    }) satisfies Parameters<typeof hookViewOperation>[0]['onBefore']);

    hookViewOperation({ path: '/user/new/', operation: 'save', onBefore });

    await createApp({ schema: createSchema() });
    const { screen, app, user } = useTestCtx();

    await app.router.push('/user/new/');

    const saveBtn = await screen.findByTitle('Save');
    await user.click(saveBtn);

    expect(onBefore).toBeCalledTimes(1);
    expect(onBefore).toBeCalledWith({
        operation: app.views.get('/user/new/')!.actions.get('save'),
    });
});
