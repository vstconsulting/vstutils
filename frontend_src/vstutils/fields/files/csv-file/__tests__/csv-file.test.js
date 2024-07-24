import { CsvFileField } from '../index';
import { getTableConfig } from '../DataTable.vue';
import { createApp, createSchema } from '#unittests';
import { guiPopUp } from '#vstutils/popUp';

const tableConfig = [
    { prop: '_index', name: 'Index' },
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
    { prop: 'description', name: 'Description' },
];

describe('CSVFileFieldEdit', () => {
    let field;

    beforeAll(async () => {
        await createApp({ schema: createSchema() });

        field = new CsvFileField({
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
    });

    const listDataToReturn = {
        some_file: [
            { name: 'Row 1', description: 'desc 1' },
            { name: 'Row 2', description: 'desc 2' },
        ],
    };
    const strDataToReturn = 'Row 1;desc 1\r\nRow 2;desc 2';

    test('config table props', () => {
        expect(field.rowModel.fields.size).toBe(2);
        expect(getTableConfig(field.rowModel, field.readOnly)).toMatchObject(tableConfig);
        expect(field.toInner(listDataToReturn)).toBe(strDataToReturn);
        expect(field.toInner({ some_file: 'Row 1;desc 1\r\nRow 2;desc 2' })).toBe(strDataToReturn);
    });

    test('invalid file', () => {
        guiPopUp.error = vitest.fn();

        expect(field.parseFile('"""')).toBeUndefined();
        expect(guiPopUp.error).toBeCalledTimes(1);
        expect(guiPopUp.error).toBeCalledWith('Cannot parse CSV file in field "File"');
    });
});
