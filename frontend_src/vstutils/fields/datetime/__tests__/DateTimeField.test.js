import { DateTimeField } from '../index';
import { mount } from '@vue/test-utils';
import moment from 'moment-timezone';
import { createApp } from '#unittests/create-app.ts';
import VueI18n from 'vue-i18n';

let app;

beforeAll(async () => {
    app = await createApp();
});

describe('DateTimeField', () => {
    const dateString = '2021-07-22T09:48:09.874646Z';
    const defaultFormat = 'llll';
    const dateTimeField = new DateTimeField({
        name: 'date',
    });
    const dateTimeFormatedField = new DateTimeField({
        name: 'date',
        'x-options': { format: 'll' },
    });
    const testMoment = moment.tz(dateString, moment.tz.guess());

    test('DateTimeField toInner', () => {
        expect(dateTimeField.toInner({})).toBeUndefined();
        expect(dateTimeField.toInner({ date: null })).toBeUndefined();
        expect(dateTimeField.toInner({ date: new Date(dateString) })).toBe('2021-07-22T09:48:09Z');
        expect(dateTimeField.toInner({ date: dateString })).toBe('2021-07-22T09:48:09Z');
    });

    test('DateTimeField toRepresent', () => {
        expect(dateTimeField.toRepresent({})).toBeUndefined();
        expect(dateTimeField.toRepresent({ date: null })).toBeUndefined();
        expect(dateTimeField.toRepresent({ date: new Date(dateString) }).format(defaultFormat)).toBe(
            testMoment.format(defaultFormat),
        );
        expect(dateTimeField.toRepresent({ date: dateString }).format(defaultFormat)).toBe(
            testMoment.format(defaultFormat),
        );
    });

    test('DateTimeField format setup', () => {
        expect(dateTimeField.dateRepresentFormat).toBe(defaultFormat);
        expect(dateTimeFormatedField.dateRepresentFormat).toBe('ll');
    });

    test('DateTameField format output', () => {
        const newDateTimeField = new DateTimeField({
            name: 'date',
            'x-options': { format: 'dddd, MMMM Do YYYY, h:mm:ss a' },
        });
        const wrapper = mount(
            {
                template: `<date-time-field :field="field" :data="data" :type="type" />`,
                components: { DateTimeField: newDateTimeField.getComponent() },
                data() {
                    return {
                        field: newDateTimeField,
                        data: { date: moment('2022-11-01 09:30:26.34553') },
                        type: 'readonly',
                    };
                },
            },
            { localVue: app.vue, i18n: new VueI18n() },
        );

        expect(wrapper.element.textContent).toContain('Tuesday, November 1st 2022, 9:30:26 am');
    });
});
