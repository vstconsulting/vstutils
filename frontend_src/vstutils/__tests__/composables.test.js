import { reactive, computed } from 'vue';
import { createApp } from '#unittests';
import { StringField } from '#vstutils/fields/text';

import { getModelFieldsInstancesGroups, useHideableFieldsGroups } from '#vstutils/composables';

let app;

beforeAll(async () => {
    app = await createApp();
});

test('useModelFieldsGroups', () => {
    const Model = app.modelsResolver.bySchemaObject({
        properties: {
            field1: { type: 'string' },
            field2: { type: 'string' },
            field3: { type: 'string' },
        },
    });

    const data = { field3: 'some value' };

    Model.fieldsGroups = vitest.fn(() => [{ title: 'Some group', fields: ['field2'] }]);

    const filteredGroups = computed(() => getModelFieldsInstancesGroups(Model, data));

    expect(filteredGroups.value).toHaveLength(1);
    expect(filteredGroups.value[0].title).toBe('Some group');
    expect(filteredGroups.value[0].fields).toHaveLength(1);
    expect(filteredGroups.value[0].fields[0]).toBeInstanceOf(StringField);
    expect(filteredGroups.value[0].fields[0].name).toBe('field2');

    expect(Model.fieldsGroups).toBeCalledTimes(1);
    expect(Model.fieldsGroups).toBeCalledWith({ data });
});

test('useHideableFieldsGroups', () => {
    const Model = app.modelsResolver.bySchemaObject({
        properties: {
            field1: { type: 'string', readOnly: true },
            field2: { type: 'string', readOnly: true },
            field3: { type: 'string', readOnly: true },
        },
    });

    const options = reactive({ hideReadOnly: true });

    const { showField, hideField, visibleFieldsGroups } = useHideableFieldsGroups(
        computed(() => getModelFieldsInstancesGroups(Model, {})),
        options,
    );

    expect(visibleFieldsGroups.value).toHaveLength(0);

    options.hideReadOnly = false;
    expect(visibleFieldsGroups.value).toHaveLength(1);

    expect(visibleFieldsGroups.value[0].fields).toHaveLength(3);
    hideField(Model.fields.get('field1'));
    expect(visibleFieldsGroups.value[0].fields).toHaveLength(2);
    showField(Model.fields.get('field1'));
    expect(visibleFieldsGroups.value[0].fields).toHaveLength(3);
});
