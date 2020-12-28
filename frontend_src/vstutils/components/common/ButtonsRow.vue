<template>
    <div class="row">
        <div class="col-lg-12 buttons-row-wrapper">
            <OperationButton
                v-for="sublink in sublinks"
                :key="sublink.name"
                v-bind="sublink"
                @clicked="$emit('open-sublink', sublink)"
            />

            <template v-for="action in actions">
                <component :is="action.component" v-if="action.component" :key="action.name" :view="view" />
                <OperationButton
                    v-else
                    :key="action.name"
                    v-bind="action"
                    @clicked="$emit('execute-action', action)"
                />
            </template>
        </div>
    </div>
</template>

<script>
    import OperationButton from './OperationButton.vue';
    export default {
        name: 'ButtonsRow',
        components: { OperationButton },
        props: {
            view: { type: Object, required: true },
            actions: { type: Array, required: false, default: () => [] },
            sublinks: { type: Array, required: false, default: () => [] },
        },
    };
</script>

<style scoped>
    .buttons-row-wrapper {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
    }
    .buttons-row-wrapper::v-deep button {
        margin-top: 5px;
        margin-right: 5px;
    }
</style>
