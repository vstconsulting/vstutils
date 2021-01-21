import { expect, test, describe } from '@jest/globals';
import {
    capitalize,
    hexToRgbA,
    isEmptyObject,
    mergeDeep,
    sliceLongString,
    stringToBoolean,
} from '../index.js';

describe('utils', () => {
    test('stringToBoolean', () => {
        expect(stringToBoolean('true')).toBeTruthy();
        expect(stringToBoolean('True')).toBeTruthy();
        expect(stringToBoolean('TRUE')).toBeTruthy();
        expect(stringToBoolean('yes')).toBeTruthy();
        expect(stringToBoolean('Yes')).toBeTruthy();
        expect(stringToBoolean('YES')).toBeTruthy();
        expect(stringToBoolean('1')).toBeTruthy();

        expect(stringToBoolean('false')).toBeFalsy();
        expect(stringToBoolean('False')).toBeFalsy();
        expect(stringToBoolean('FALSE')).toBeFalsy();
        expect(stringToBoolean('no')).toBeFalsy();
        expect(stringToBoolean('No')).toBeFalsy();
        expect(stringToBoolean('NO')).toBeFalsy();
        expect(stringToBoolean('0')).toBeFalsy();
        expect(stringToBoolean(null)).toBeFalsy();
    });

    test('capitalizeString', () => {
        const strings = ['hello', 'Hello', 'HELLO', 'hELLO'];
        const answer = 'Hello';

        expect(capitalize()).toBe('');

        for (const str of strings) {
            expect(capitalize(str)).toBe(answer);
        }
    });

    test('sliceLongString', () => {
        const shortString = 'string';
        const longString =
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor' +
            ' incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation' +
            ' ullamco laboris nisi ut aliquip ex ea commodo consequat.';
        const expectedLongString =
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, ' +
            'sed do eiusmod tempor incididunt ut labore ...';

        const args = [
            [false, 'false'],
            [shortString, 'string'],
            [longString, expectedLongString],
        ];

        for (const [arg, expected] of args) {
            expect(sliceLongString(arg)).toBe(expected);
        }

        expect(sliceLongString(shortString, 6)).toBe(shortString);
        expect(sliceLongString(shortString, 5)).toBe('strin...');
    });

    test('isEmptyObject', () => {
        const obj = {
            a: 1,
            b: true,
            c: ['string', 2],
        };

        expect(isEmptyObject({})).toBeTruthy();
        expect(isEmptyObject([])).toBeTruthy();
        expect(isEmptyObject(obj)).toBeFalsy();
        expect(isEmptyObject([1])).toBeFalsy();
    });

    test('String.prototype.format', () => {
        const testValues = [
            {
                str: '/user/{0}/',
                argument: 1,
                expected: '/user/1/',
            },
            {
                str: '/user/1/{0}/',
                argument: 'settings',
                expected: '/user/1/settings/',
            },
            {
                str: '/user/{0}/{1}/',
                argument: [1, 'settings'],
                expected: '/user/1/settings/',
            },
            {
                str: '/user/{pk}/{sublink}/',
                argument: { pk: 1, sublink: 'settings' },
                expected: '/user/1/settings/',
            },
        ];

        for (const { str, argument, expected } of testValues) {
            expect(str.format(argument)).toBe(expected);
        }
    });

    test('hexToRgbA', () => {
        const testValues = [
            { hex: 'ffffff', alpha: undefined, rgba: undefined },
            { hex: '#ffffff', alpha: undefined, rgba: 'rgba(255,255,255,1)' },
            { hex: '#ffffff', alpha: 0.8, rgba: 'rgba(255,255,255,0.8)' },
            { hex: '#fDac03', alpha: -1, rgba: 'rgba(253,172,3,1)' },
            { hex: '#fDac03', alpha: 2, rgba: 'rgba(253,172,3,1)' },
        ];

        for (const { hex, alpha, rgba } of testValues) {
            expect(hexToRgbA(hex, alpha)).toBe(rgba);
        }
    });

    test('mergeDeep - make deep copy', () => {
        let original = {
            emptyObj: {},
            obj: {
                num: 1,
                1: 'num',
                nestedEmptyObj: {},
                nestedObj: { a: 1, b: 2, arr: [{ name: 'first' }, 1337, 'sdf'] },
                nullValue: null,
                undefinedValue: undefined,
            },
            c: [],
        };
        let target = {};
        let copy = mergeDeep(target, original);

        expect(copy).toBe(target);
        expect(copy).toStrictEqual(original);
        expect(copy.emptyObj).not.toBe(original.emptyObj);
        expect(copy.obj.nestedEmptyObj).not.toBe(original.obj.nestedEmptyObj);
        expect(copy.obj.nestedObj).not.toBe(original.obj.nestedObj);
        expect(copy.obj.nestedObj.arr).not.toBe(original.obj.nestedObj.arr);

        // Arrays are not supported yet
        expect(copy.obj.nestedObj.arr[0]).toBe(original.obj.nestedObj.arr[0]);
    });
});
