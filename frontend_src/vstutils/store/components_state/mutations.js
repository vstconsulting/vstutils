import Vue from 'vue';
import * as mutation_types from './mutation-types';
import default_nested_module from "./default_nested_module";
import actions from "./actions";
import state from "./state";
import * as getters from "./getters";
import { mergeDeep } from '../../utils';

const stateAttributes = [
    'mutations',
    'actions',
    'state',
    'getters',
];

export default {
    /**
     *
     * @param { object } state
     * @param { string } id
     */
    [mutation_types.SET_ACTIVE_COMPONENT](state, id) {
        Vue.set(state.data, 'active_component_id', id);
    },
    /**
     *
     * @param { object } state
     * @param { object } data
     */
    [mutation_types.CREATE_COMPONENT_STATE](state, {component, module}) {
        const moduleName = `${mutation_types.COMPONENTS_MODULE_NAME}/${component.componentId || 0}`;
        if (!this.hasModule(moduleName)) {
            let module_data = {...default_nested_module};
            module_data.state.statePath = moduleName;
            if (module && typeof module === 'object') {
                mergeDeep(module_data, module);
            }
            this.registerModule(moduleName, module_data);
            state.data.modules_list.push(moduleName);
        }

        if (component.activeComponent) {
            this.commit(`${mutation_types.COMPONENTS_MODULE_NAME}/${mutation_types.SET_ACTIVE_COMPONENT}`, moduleName)
        }
    },

    /**
     *
     * @param { object } state
     * @param { object } data
     */
    [mutation_types.DESTROY_COMPONENT_STATE](state, {component}) {
        const moduleName = `${mutation_types.COMPONENTS_MODULE_NAME}/${component.componentId || 0}`;
        if (this.hasModule(moduleName)) {
            this.unregisterModule(moduleName);
            let moduleIndex = state.data.modules_list.indexOf(moduleName);
            if (moduleIndex) {
                Vue.delete(state.data.modules_list, moduleIndex)
            }
        }

        if (component.activeComponent && state.data.activeComponent === moduleName) {
            this.commit(`${mutation_types.COMPONENTS_MODULE_NAME}/${mutation_types.SET_ACTIVE_COMPONENT}`, null)
        }
    }
};
