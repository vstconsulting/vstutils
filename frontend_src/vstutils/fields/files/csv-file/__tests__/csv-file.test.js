import { describe, test, expect } from '@jest/globals';
import { CsvFileField } from '../index';
import { i18n } from '../../../../translation';

describe('CSVFileFieldEdit', () => {
    const tableConfig = [
        { prop: '_index', name: i18n.t('Index') },
        { prop: '_action', name: i18n.t('Actions'), actionName: 'actionCommon', width: 200 },
        { prop: 'name', name: 'Some name', eClass: { missedValue: '"${name}" === "0"' } },
        { prop: 'description', name: 'description' },
    ];
    const data_to_return = {
        some_file: [
            { name: 'Row 1', description: 'desc 1' },
            { name: 'Row 2', description: 'desc 2' },
        ],
    };

    test('config table props', () => {
        const field = new CsvFileField({
            title: 'File',
            name: 'some_file',
            type: 'string',
            format: 'csvfile',
            'x-options': {
                delimiter: ';',
                minColumnWidth: 600,
                items: {
                    required: ['name'],
                    type: 'object',
                    properties: {
                        name: {
                            title: 'Some name',
                            type: 'string',
                        },
                        description: {
                            type: 'string',
                        },
                    },
                },
            },
        });

        expect(field.tableConfig).toMatchObject(tableConfig);
        expect(field.toInner(data_to_return)).toBe('Row 1;desc 1\r\nRow 2;desc 2');
    });
});
