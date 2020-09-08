import {DESTROY_COMPONENT_STATE} from './mutation-types';

/**
*
* @param { function } commit
* @param { object } data
*/
export default {
    async [DESTROY_COMPONENT_STATE] ({ commit }, { component }) {
        commit({type: DESTROY_COMPONENT_STATE, component})
    }
}
