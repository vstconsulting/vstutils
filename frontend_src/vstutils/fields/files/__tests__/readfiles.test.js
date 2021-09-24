import { expect, test, describe, jest } from '@jest/globals';
import ResolutionValidatorMixin from '../named-binary-image/ResolutionValidatorMixin';
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

        await ResolutionValidatorMixin.methods.readFiles.call(
            {
                $parent: { field },
                field,
                onImageValidated: validatedCallback,
            },
            [],
        );

        expect(validatedCallback).toBeCalledTimes(1);
        expect(validatedCallback.mock.calls[0][0].length).toBe(0);
    });
});
