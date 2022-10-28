import { expect, test, describe } from '@jest/globals';
import MultipleNamedBinFileField from '../files/multiple-named-binary-file/MultipleNamedBinaryFileField';

describe('MultipleNamedBinFileField', () => {
    test('toRepresent', () => {
        const options = { format: 'multiplenamedbinfile', name: 'value', type: 'string' };
        const field = new MultipleNamedBinFileField(options);

        let data = {
            id: 9,
            key: { _data: { id: 6, category: 11, name: 'docs' } },
            value: '[{"name": "file.name", "content": "someContent", "mediaType": null}, {"name": "file2.name", "content": "moreSomeContent", "mediaType": null}]',
        };
        let representData = field.toRepresent(data);
        expect(representData).toStrictEqual([
            {
                name: 'file.name',
                content: 'someContent',
                mediaType: null,
            },
            { name: 'file2.name', content: 'moreSomeContent', mediaType: null },
        ]);

        data = {
            id: 9,
            key: { _data: { id: 6, category: 11, name: 'docs' } },
            value: [
                {
                    name: 'file3.name',
                    content: 'someContent',
                    mediaType: null,
                },
                { name: 'file4.name', content: 'moreSomeContent', mediaType: null },
            ],
        };

        representData = field.toRepresent(data);
        expect(representData).toStrictEqual([
            {
                name: 'file3.name',
                content: 'someContent',
                mediaType: null,
            },
            { name: 'file4.name', content: 'moreSomeContent', mediaType: null },
        ]);
    });
});
