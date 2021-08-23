import { describe, jest, test, expect } from '@jest/globals';
import BinaryFileFieldReadFileButton from '../BinaryFileFieldReadFileButton';

describe('BinaryFileField', () => {
    test('overloaded mixin', () => {
        const this_ = { $emit: jest.fn() };
        const eventData = { target: { files: jest.fn() } };
        BinaryFileFieldReadFileButton.methods.onChange.call(this_, eventData);
        expect(this_.$emit.mock.calls.length).toBe(1);
        expect(this_.$emit.mock.calls[0][0]).toBe('read-file');
        expect(typeof BinaryFileFieldReadFileButton.data()).toBe('object');
    });
});
