import { expect, test, describe } from '@jest/globals';
import { NamedBinaryFileField } from '../index';

describe('NamedBinFile test', () => {
    const binFileField = new NamedBinaryFileField({
        required: true,
        title: 'Namedbinfile',
        type: 'string',
        format: 'namedbinfile',
        name: 'namedbinfile',
    });
    test('validate value', () => {
        const data = {
            content: '2q34=',
            name: 'file',
            mediaType: 'text/txt',
        };
        expect(binFileField.validateValue(data)).toBe(data);
        const bin_data = {
            namedbinfile: {
                content: 'iVBORw0KGgoAAAANSUhEUgAAASkAAADcCAIAAACj08DLAAAACX',
                mediaType: 'image/png',
                name: 'Screenshot_20201117_150121.png',
            },
        };
        expect(binFileField.toInner(bin_data)).toBe(bin_data.namedbinfile);
    });
});
