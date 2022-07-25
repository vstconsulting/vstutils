import { describe, test, expect } from '@jest/globals';
import { CsvFileField } from '../index';
import { i18n } from '../../../../translation';

const tableConfig = [
    { prop: '_index', name: i18n.t('Index') },
    {
        prop: 'name',
        name: 'Some name',
        eClass: {
            missedValue: `
                        const value = row["name"];
                        return !value || value === '0';
                    `,
        },
    },
    { prop: 'description', name: 'description' },
];

describe('CSVFileFieldEdit', () => {
    const listDataToReturn = {
        some_file: [
            { name: 'Row 1', description: 'desc 1' },
            { name: 'Row 2', description: 'desc 2' },
        ],
    };
    const strDataToReturn = 'Row 1;desc 1\r\nRow 2;desc 2';

    test('config table props', () => {
        const field = new CsvFileField({
            title: 'File',
            name: 'some_file',
            type: 'string',
            format: 'csvfile',
            'x-options': {
                minColumnWidth: 600,
                parserConfig: {
                    delimiter: ';',
                    header: false,
                    skipEmptyLines: true,
                },
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

        expect(field.getTableConfig()).toMatchObject(tableConfig);
        expect(field.toInner(listDataToReturn)).toBe(strDataToReturn);
        expect(field.toInner({ some_file: 'Row 1;desc 1\r\nRow 2;desc 2' })).toBe(strDataToReturn);
    });
});
