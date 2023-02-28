import { test, describe, expect } from '@jest/globals';
import { URIField } from '../URIField';

describe('URIField', () => {
    describe('default validation', () => {
        const defaultField = new URIField({ name: 'url' });

        test.each(['http://example.com', 'http://[::192.9.5.5]/ipng', 'https://उदाहरण.परीक्षा'])(
            'valid %s',
            (value) => {
                expect(() => defaultField.validateValue({ url: value })).not.toThrow();
            },
        );
        test.each(['invalid://example.com', 'http://??/', '//', 'foo.com', 'http://.example'])(
            'invalid %s',
            (value) => {
                expect(() => defaultField.validateValue({ url: value })).toThrow();
            },
        );
    });

    test('custom protocols validation', () => {
        const field = new URIField({
            name: 'url',
            'x-options': {
                protocols: ['ptth', 'ssh'],
            },
        });

        expect(() => field.validateValue({ url: 'http://example.com' })).toThrow();
        expect(() => field.validateValue({ url: 'ptth://example.com' })).not.toThrow();
        expect(() => field.validateValue({ url: 'ssh://example.com' })).not.toThrow();
    });
});
