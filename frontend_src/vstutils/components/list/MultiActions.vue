<template>
    <div class="dropdown dropup">
        <button
            id="multi-actions-button"
            class="btn btn-secondary dropdown-toggle"
            type="button"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
        >
            {{ $t('Execute action on {0}', [$tc('{n} instance', selected.length)]) }}
        </button>
        <div class="dropdown-menu" aria-labelledby="multi-actions-button">
            <template v-for="action in multiActions">
                <component :is="action.component" v-if="action.component" :key="action.name" :action="action">
                    <template #default="{ execute }">
                        <button
                            class="dropdown-item"
                            :class="`operation__${action.name}`"
                            type="button"
                            @click.prevent="execute({ instances: getSelectedAsInstances(), action })"
                            v-text="$st(action.title)"
                        />
                    </template>
                </component>
                <button
                    v-else
                    :key="action.name"
                    class="dropdown-item"
                    :class="`operation__${action.name}`"
                    type="button"
                    @click="$emit('execute-multi-action', action)"
                    v-text="$st(action.title)"
                />
            </template>
        </div>
    </div>
</template>

<script>
    /**
     * Component for drop-down list of multi-actions.
     */
    export default {
        name: 'MultiActions',
        props: {
            multiActions: { type: Array, required: true },
            selected: { type: Array, required: true },
            instances: { type: Array, required: true },
        },
        methods: {
            getSelectedAsInstances() {
                return this.instances.filter((instance) => this.selected.includes(instance._data.id));
            },
        },
    };
</script>

<style scoped>
    .dropdown {
        display: inline-block;
    }
</style>
