<template>
    <div class="dropdown">
        <button
            id="multi-actions-button"
            class="btn btn-secondary dropdown-toggle"
            type="button"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
        >
            Execute action on {{ numberOfSelected }} {{ $tc('instance', numberOfSelected) }}
        </button>
        <div class="dropdown-menu" aria-labelledby="multi-actions-button">
            <template v-for="action in multiActions">
                <component
                    :is="action.component"
                    v-if="action.component"
                    :key="action.name"
                    :action="action"
                />
                <button
                    v-else
                    :key="action.name"
                    class="dropdown-item"
                    type="button"
                    @click="$emit('execute-multi-action', action)"
                    v-text="action.title"
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
            numberOfSelected: { type: Number, required: true },
        },
    };
</script>

<style scoped>
    .dropdown {
        display: inline-block;
    }
</style>
