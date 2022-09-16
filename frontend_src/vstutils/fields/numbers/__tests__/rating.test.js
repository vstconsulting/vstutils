import { expect, test, describe } from '@jest/globals';
import { RatingField } from '../rating';
import { X_OPTIONS } from '../../../utils';

describe('RatingField', () => {
    test('check rating empty null values', () => {
        const ratingField = new RatingField({
            name: 'rating',
            required: true,
            'x-nullable': true,
            [X_OPTIONS]: {
                min_value: 1,
            },
        });
        expect(ratingField.getInitialValue()).toBeNull();
    });

    test('check rating empty min values', () => {
        const ratingField = new RatingField({
            name: 'rating',
            required: true,
            'x-nullable': false,
            [X_OPTIONS]: {
                min_value: 1,
            },
        });
        expect(ratingField.getInitialValue()).toBe(1);
    });
});
