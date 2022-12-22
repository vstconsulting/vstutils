import { expect, test, describe, jest } from '@jest/globals';
import { useResolutionValidator } from '../named-binary-image/useResolutionValidator';
import { NamedBinaryImageField } from '../named-binary-image';
import { X_OPTIONS } from '../../../utils';

describe('File fields', () => {
    test('Call read files', async () => {
        const field = new NamedBinaryImageField({
            name: 'field',
            [X_OPTIONS]: {
                extensions: ['image/jpeg'],
            },
        });

        const validatedCallback = jest.fn();

        const { readFiles } = useResolutionValidator(field, validatedCallback);

        await readFiles([]);

        expect(validatedCallback).toBeCalledTimes(1);
        expect(validatedCallback.mock.calls[0][0].length).toBe(0);
    });
});
