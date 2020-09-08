import actions from './actions';
import mutations from './mutations';
import * as getters from './getters';
import state from './state';

export default {
    namespaced: true,
    mutations,
    actions,
    state,
    getters,
};
