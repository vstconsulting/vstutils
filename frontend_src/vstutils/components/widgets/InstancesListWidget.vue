<template>
    <Card card-body-classes="p-0" v-bind="$props">
        <p v-if="isEmpty" class="m-3">
            {{ $t('list is empty') | capitalize }}
        </p>
        <table v-else class="table table-sm">
            <thead>
                <tr>
                    <th v-for="field in fieldsInstances" :key="field.name" :class="tableColumnClasses(field)">
                        {{ field.title }}
                        <Popover :content="field.description" />
                    </th>
                </tr>
            </thead>
            <tbody>
                <InstanceRow
                    v-for="instance in instances"
                    :key="instance.getPkValue()"
                    :instance="instance"
                />
            </tbody>
        </table>
    </Card>
</template>

<script>
    /* eslint-disable vue/one-component-per-file */
    import { tableColumnClasses } from '../../utils';
    import Popover from '../Popover.vue';
    import Card from '../Card.vue';

    /**
     * @vue/component
     */
    const InstanceRow = {
        functional: true,
        props: { instance: { type: Object, required: true } },
        render(h, { props, parent }) {
            const data = props.instance._getRepresentData();
            return h(
                'tr',
                parent.fieldsInstances.map((field) =>
                    h('td', { key: field.name, class: tableColumnClasses(field) }, [
                        h(field.component, { props: { type: 'list', field, data } }),
                    ]),
                ),
            );
        },
    };

    export default {
        components: { Card, InstanceRow, Popover },
        mixins: [Card],
        props: {
            fields: { type: Array, required: true },
            instances: { type: Array, default: null },
        },
        data: () => ({ tableColumnClasses }),
        computed: {
            isEmpty() {
                return !this.instances || this.instances.length === 0;
            },
            model() {
                return this.instances[0]?.constructor;
            },
            fieldsInstances() {
                return this.fields.map((fieldName) => this.model.fields.get(fieldName));
            },
        },
    };
</script>
