import { expect, jest, test, describe } from '@jest/globals';
import Vuex from 'vuex';
import { LIST_STORE_MODULE } from '../components_state/commonStoreModules.js';
import { mergeDeep, RequestTypes } from '../../utils';
import default_nested_module from '../components_state/default_nested_module.js';
import { createLocalVue } from '@vue/test-utils';
import { QuerySet } from '../../querySet';
import { Model, ModelClass } from '../../models';
import { IntegerField } from '../../fields/numbers/integer';
import { StringField } from '../../fields/text';

jest.mock('../../api');

describe('List store module', () => {
    const localVue = createLocalVue();
    localVue.use(Vuex);

    const store = new Vuex.Store({
        modules: {
            list: mergeDeep({}, default_nested_module, LIST_STORE_MODULE),
        },
    });

    @ModelClass()
    class User extends Model {
        static declaredFields = [new IntegerField({ name: 'id' }), new StringField({ name: 'username' })];
    }

    const qs = new QuerySet('user', { [RequestTypes.LIST]: User });

    test('Set queryset', async () => {
        store.commit('list/setQuerySet', qs);

        store.commit('list/setFilters', { username: 'testUser' });

        expect(store.getters['list/queryset']).not.toBe(qs);

        expect(qs.query).toStrictEqual({});
        expect(store.getters['list/queryset'].query).toStrictEqual({ username: 'testUser' });
    });
});
