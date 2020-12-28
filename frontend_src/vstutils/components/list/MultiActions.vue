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
            <button
                v-for="action in multiActions"
                :key="action.name"
                class="dropdown-item"
                type="button"
                @click="$emit('execute-multi-action', action)"
                v-text="action.title"
            />
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
