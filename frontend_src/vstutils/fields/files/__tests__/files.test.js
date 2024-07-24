import { createApp, mount } from '#unittests';
import { h } from 'vue';
import { deferredPromise } from '#vstutils/utils';

let app;

beforeAll(async () => {
    app = await createApp();
});

test('files renaming', async () => {
    const field = app.fieldsResolver.resolveField({
        name: 'files',
        type: 'array',
        items: {
            type: 'object',
            'x-format': 'namedbinfile',
            properties: {
                name: {
                    type: 'string',
                    'x-nullable': true,
                    minLength: 6,
                    maxLength: 7,
                },
                content: { type: 'string', 'x-nullable': true },
                mediaType: { type: 'string', 'x-nullable': true },
            },
        },
    });

    const { promise: setValuePromise, resolve } = deferredPromise();
    const listener = vitest.fn(() => resolve());

    const wrapper = mount({
        setup() {
            return () =>
                h(field.getComponent(), {
                    props: { data: { files: [] }, field, type: 'edit' },
                    on: { 'set-value': listener },
                });
        },
    });

    const fileInput = wrapper.find('input[type="file"]');

    Object.defineProperty(fileInput.element, 'files', {
        writable: true,
        value: [new File(['content'], '1.txt'), new File(['content'], '1234.txt')],
    });
    fileInput.trigger('input');

    await wrapper.vm.$nextTick();

    const renameForm = wrapper.find('form');
    const saveButton = renameForm.find('button[type="submit"]');

    expect(saveButton.attributes('disabled')).toBe('disabled');

    expect(renameForm.text()).toContain('Minimum filename length: 6');
    expect(renameForm.text()).toContain('Maximum filename length: 7');

    renameForm.findAll('input').at(0).setValue('12.txt');
    await wrapper.vm.$nextTick();
    expect(renameForm.text()).not.toContain('Minimum filename length: 6');
    expect(renameForm.text()).toContain('Maximum filename length: 7');

    renameForm.findAll('input').at(1).setValue('123.txt');
    await wrapper.vm.$nextTick();
    expect(renameForm.text()).not.toContain('Minimum filename length: 6');
    expect(renameForm.text()).not.toContain('Maximum filename length: 7');

    expect(saveButton.attributes('disabled')).toBeUndefined();

    await renameForm.trigger('submit');
    await setValuePromise;

    expect(listener).toBeCalledTimes(1);
    const value = listener.mock.calls[0][0].value;
    expect(value).toHaveLength(2);
    expect(value[0].name).toBe('12.txt');
    expect(value[1].name).toBe('123.txt');
});
