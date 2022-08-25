import { expect, test, describe } from '@jest/globals';
import { ValidationError } from '../../validation';
import { MaskedField } from '../masked';

describe('MaskedField', () => {
    const regexMask = new MaskedField({
        name: 'regexMask',
        format: 'masked',
        'x-options': { mask: '/regex/' },
    });
    const patternMask = new MaskedField({
        name: 'patternMask',
        format: 'masked',
        'x-options': { mask: 'pattern' },
    });
    const patternWithDefinitionsMask = new MaskedField({
        name: 'patternWithDefinitionsMask',
        format: 'masked',
        'x-options': {
            mask: {
                mask: 'pattern',
                definitions: {
                    p: '/regex/',
                    a: 'pattern',
                },
            },
        },
    });
    const nestedMask = new MaskedField({
        name: 'nestedMask',
        format: 'masked',
        'x-options': {
            mask: {
                mask: 'pattern',
                blocks: {
                    block1: {
                        mask: '/regex/',
                    },
                    block2: {
                        mask: 'pattern',
                    },
                },
            },
        },
    });
    const dynamicMask = new MaskedField({
        name: 'dynamicMask',
        format: 'masked',
        'x-options': {
            mask: {
                mask: [
                    { mask: '/regex/' },
                    { mask: 'pattern' },
                    {
                        mask: 'pattern',
                        definitions: {
                            k: '/regex/',
                            w: 'pattern',
                        },
                    },
                    {
                        mask: 'pattern',
                        blocks: {
                            block1: {
                                mask: '/regex/',
                            },
                            block2: {
                                mask: 'pattern',
                            },
                        },
                    },
                ],
            },
        },
    });

    test('simple masks', () => {
        expect(regexMask.mask).toMatchObject({ mask: /regex/ });
        expect(patternMask.mask).toMatchObject({ mask: 'pattern' });
    });

    test('complex masks', () => {
        expect(patternWithDefinitionsMask.mask).toMatchObject({
            mask: 'pattern',
            definitions: {
                p: /regex/,
                a: 'pattern',
            },
        });
        expect(nestedMask.mask).toMatchObject({
            mask: 'pattern',
            blocks: {
                block1: {
                    mask: /regex/,
                },
                block2: {
                    mask: 'pattern',
                },
            },
        });
    });

    test('dynamic mask', () => {
        expect(dynamicMask.mask.mask[0]).toMatchObject({ mask: /regex/ });
        expect(dynamicMask.mask.mask[1]).toMatchObject({ mask: 'pattern' });
        expect(dynamicMask.mask.mask[2]).toMatchObject({
            mask: 'pattern',
            definitions: {
                k: /regex/,
                w: 'pattern',
            },
        });
        expect(dynamicMask.mask.mask[3]).toMatchObject({
            mask: 'pattern',
            blocks: {
                block1: {
                    mask: /regex/,
                },
                block2: {
                    mask: 'pattern',
                },
            },
        });
    });

    test('invalid masks throw validation errors', () => {
        expect(
            () =>
                new MaskedField({
                    name: 'invalidDefinitionMask',
                    format: 'masked',
                    'x-options': {
                        mask: {
                            mask: 'pattern',
                            definitions: { invalid: '/regex/' },
                        },
                    },
                }),
        ).toThrow(ValidationError);
    });
});
