<template>
    <div class="buttons-row-wrapper">
        <!-- Not grouped -->
        <OperationButton
            v-for="sublink in notGroupedSublinks"
            :key="sublink.name"
            v-bind="sublink"
            @clicked="$emit('open-sublink', sublink)"
        />
        <template v-for="action in notGroupedActions">
            <component :is="action.component" v-if="action.component" :key="action.name" :view="view" />
            <OperationButton
                v-else
                :key="action.name"
                v-bind="action"
                @clicked="$emit('execute-action', action)"
            />
        </template>

        <!-- Sublinks -->
        <template v-if="groupedSublinks.length > 1">
            <CompactOperations
                v-if="groupedSublinks.length"
                :title="$t('sublinks') | capitalize"
                :view="view"
                :operations="groupedSublinks"
                @clicked="$emit('open-sublink', $event)"
            />
        </template>
        <template v-else>
            <OperationButton
                v-for="sublink in groupedSublinks"
                :key="sublink.name"
                v-bind="sublink"
                @clicked="$emit('open-sublink', sublink)"
            />
        </template>

        <!-- Actions -->
        <template v-if="groupedActions.length > 1">
            <CompactOperations
                v-if="groupedActions"
                :title="$t('actions') | capitalize"
                :view="view"
                :operations="groupedActions"
                @clicked="$emit('execute-action', $event)"
            />
        </template>
        <template v-else>
            <template v-for="action in groupedActions">
                <component :is="action.component" v-if="action.component" :key="action.name" :view="view" />
                <OperationButton
                    v-else
                    :key="action.name"
                    v-bind="action"
                    @clicked="$emit('execute-action', action)"
                />
            </template>
        </template>
    </div>
</template>

<script>
    import OperationButton from './OperationButton.vue';
    import CompactOperations from './CompactOperations.vue';

    export default {
        name: 'ButtonsRow',
        components: { CompactOperations, OperationButton },
        props: {
            view: { type: Object, required: true },
            actions: { type: Array, required: false, default: () => [] },
            sublinks: { type: Array, required: false, default: () => [] },
        },
        computed: {
            groupedActions() {
                return this.actions.filter((action) => !action.doNotGroup);
            },
            notGroupedActions() {
                return this.actions.filter((action) => action.doNotGroup);
            },
            groupedSublinks() {
                return this.sublinks.filter((sublink) => !sublink.doNotGroup);
            },
            notGroupedSublinks() {
                return this.sublinks.filter((sublink) => sublink.doNotGroup);
            },
        },
    };
</script>

<style scoped>
    .buttons-row-wrapper {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        flex-grow: 1;
        margin-bottom: 0;
        padding-bottom: 0;
        padding-right: 15px;
    }
    .buttons-row-wrapper::v-deep button {
        margin-top: 5px;
        margin-right: 5px;
        height: 35px;
    }
</style>
