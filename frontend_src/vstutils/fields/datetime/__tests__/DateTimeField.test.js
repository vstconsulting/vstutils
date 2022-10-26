import { expect, test, describe } from '@jest/globals';
import { DateTimeField } from '../index';
import moment from 'moment-timezone';

describe('DateTimeField', () => {
    const dateString = '2021-07-22T09:48:09.874646Z';
    const defaultFormat = 'llll';
    const dateTimeField = new DateTimeField({
        name: 'date',
    });
    const dateTimeFormatedField = new DateTimeField({
        name: 'date',
        'x-options': { format: 'll' },
    });
    const testMoment = moment.tz(dateString, moment.tz.guess());

    test('DateTimeField toInner', () => {
        expect(dateTimeField.toInner({})).toBeUndefined();
        expect(dateTimeField.toInner({ date: null })).toBeUndefined();
        expect(dateTimeField.toInner({ date: new Date(dateString) })).toBe('2021-07-22T09:48:09Z');
        expect(dateTimeField.toInner({ date: dateString })).toBe('2021-07-22T09:48:09Z');
    });

    test('DateTimeField toRepresent', () => {
        expect(dateTimeField.toRepresent({})).toBeUndefined();
        expect(dateTimeField.toRepresent({ date: null })).toBeUndefined();
        expect(dateTimeField.toRepresent({ date: new Date(dateString) }).format(defaultFormat)).toBe(
            testMoment.format(defaultFormat),
        );
        expect(dateTimeField.toRepresent({ date: dateString }).format(defaultFormat)).toBe(
            testMoment.format(defaultFormat),
        );
    });

    test('DateTimeField format setup', () => {
        expect(dateTimeField.dateRepresentFormat).toBe(defaultFormat);
        expect(dateTimeFormatedField.dateRepresentFormat).toBe('ll');
    });
});
