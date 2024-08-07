import { createApp, createSchema } from '#unittests';
import { getApp } from '#vstutils/utils';

describe('Models generation', () => {
    beforeAll(async () => {
        await createApp({ schema: createSchema() });
    });

    test('display mode is set', () => {
        const app = getApp();

        const DefaultModel = app.modelsResolver.bySchemaObject({
            type: 'object',
            properties: { name: { type: 'string' } },
        });
        expect(DefaultModel.displayMode).toBe('DEFAULT');

        const StepModel = app.modelsResolver.bySchemaObject({
            type: 'object',
            properties: { name: { type: 'string' } },
            'x-display-mode': 'STEP',
        });
        expect(StepModel.displayMode).toBe('STEP');

        const InvalidModel = app.modelsResolver.bySchemaObject({
            type: 'object',
            properties: { name: { type: 'string' } },
            // @ts-expect-error For test invalid value used
            'x-display-mode': 'invalid',
        });
        expect(InvalidModel.displayMode).toBe('DEFAULT');
    });
});
