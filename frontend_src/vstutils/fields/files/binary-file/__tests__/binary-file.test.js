import BinaryFileFieldReadFileButton from '../BinaryFileFieldReadFileButton';

describe('BinaryFileField', () => {
    test('overloaded mixin', () => {
        const this_ = { $emit: vitest.fn() };
        const eventData = { target: { files: vitest.fn() } };
        BinaryFileFieldReadFileButton.methods.onChange.call(this_, eventData);
        expect(this_.$emit.mock.calls.length).toBe(1);
        expect(this_.$emit.mock.calls[0][0]).toBe('read-file');
        expect(typeof BinaryFileFieldReadFileButton.data()).toBe('object');
    });
});
