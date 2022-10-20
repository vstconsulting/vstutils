import { test, beforeAll, expect } from '@jest/globals';
import { ref } from 'vue';
import { createApp } from '../../../unittests/create-app';
import { createSchema } from '../../../unittests/schema';
import { useEntityViewClasses, useSelection } from '../helpers';

let app;

beforeAll(async () => {
    app = await createApp({ schema: createSchema() });
});

test('useEntityViewClasses', () => {
    const Model = app.modelsResolver.bySchemaObject({
        properties: {
            id: {
                title: 'Id',
                type: 'integer',
                readOnly: true,
            },
            is_refund: {
                title: 'Is refund',
                type: 'boolean',
                readOnly: true,
            },
            store: {
                minLength: 1,
                title: 'Store',
                type: 'string',
                readOnly: true,
            },
            status: {
                enum: [
                    'UNCONFIRMED',
                    'CONFIRMED',
                    'PAID',
                    'READY',
                    'DELIVERY',
                    'COMPLETED',
                    'CANCELLED',
                    'REFUNDED',
                ],
                title: 'Status',
                type: 'string',
            },
        },
    });
    const data = ref({
        id: 12,
        is_refund: false,
        store: 'LolShop',
        status: 'CONFIRMED',
    });

    const classes = useEntityViewClasses(ref(Model), data);

    expect(classes.value).toMatchObject(['field-is_refund-false', 'field-status-CONFIRMED']);

    data.value.is_refund = true;
    expect(classes.value).toMatchObject(['field-is_refund-true', 'field-status-CONFIRMED']);
});

test('useSelection', () => {
    const Model = app.modelsResolver.bySchemaObject({
        properties: {
            id: {
                title: 'Id',
                type: 'integer',
                readOnly: true,
            },
        },
    });
    const instances = [
        new Model({ id: 1 }),
        new Model({ id: 2 }),
        new Model({ id: 3 }),
        new Model({ id: 4 }),
    ];

    const { selection, allSelected, setSelection, unselectIds, toggleSelection, toggleAllSelection } =
        useSelection(ref(instances));

    toggleSelection(1);
    expect(selection.value).toStrictEqual([1]);
    toggleSelection(3);
    expect(selection.value).toStrictEqual([1, 3]);
    toggleSelection(4);
    expect(selection.value).toStrictEqual([1, 3, 4]);

    toggleSelection(3);
    expect(selection.value).toStrictEqual([1, 4]);

    unselectIds([1]);
    expect(selection.value).toStrictEqual([4]);

    toggleAllSelection();
    expect(allSelected.value).toStrictEqual(true);
    expect(selection.value).toStrictEqual([1, 2, 3, 4]);

    toggleAllSelection();
    expect(allSelected.value).toStrictEqual(false);
    expect(selection.value).toStrictEqual([]);

    setSelection([1, 3]);
    expect(selection.value).toStrictEqual([1, 3]);
});
