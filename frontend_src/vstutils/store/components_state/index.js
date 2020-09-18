import Vue from 'vue';

export default {
    namespaced: true,
    state: {
        modulesList: [],
    },
    mutations: {
        addModule(state, moduleName) {
            state.modulesList.push(moduleName);
        },

        removeModule(state, moduleName) {
            const moduleIndex = state.modulesList.indexOf(moduleName);
            if (moduleIndex !== -1) {
                Vue.delete(state.modulesList, moduleIndex);
            }
        },
    },
    getters: {},
};
