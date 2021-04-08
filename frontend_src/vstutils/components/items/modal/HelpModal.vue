<template>
    <div style="display: contents">
        <Modal v-show="showModal" :opt="{ footer: false }" @close="close">
            <template #header>
                <h3>{{ $t(info.title.toLowerCase()) | capitalize }}</h3>
            </template>
            <template #body>
                <h4 class="with_bottom_border">
                    {{ $tc('version', 2) | capitalize }}
                </h4>
                <ul>
                    <li v-for="(item, idx) in info['x-versions']" :key="idx">
                        <b>{{ $t(idx).toLowerCase() }}:</b>
                        {{ item }}
                    </li>
                </ul>
                <template v-for="(item, idx) in info['x-links']">
                    <h4 :key="`header-${idx}`" class="with_bottom_border" style="margin-top: 20px">
                        {{ $t(idx.toLowerCase()) | capitalize }}
                    </h4>
                    <ul :key="`list-${idx}`">
                        <template v-if="isArray(item)">
                            <li v-for="(prop, idx) in item" :key="idx">
                                <a :href="prop.url" target="_blank" rel="noreferrer">
                                    {{ $t(prop.name.toLowerCase()) | capitalize }}
                                </a>
                            </li>
                        </template>
                        <template v-else>
                            <li>
                                <a :href="item.url" target="_blank" rel="noreferrer">
                                    {{ $t(item.name.toLowerCase()) | capitalize }}
                                </a>
                            </li>
                        </template>
                    </ul>
                </template>
            </template>
        </Modal>
        <button class="btn btn-secondary btn-block" style="margin-bottom: 10px" @click.stop.prevent="open">
            <span class="fa fa-question-circle" />
            {{ $t('app info') | capitalize }}
        </button>
    </div>
</template>

<script>
    import ModalWindowAndButtonMixin from '../../../fields/ModalWindowAndButtonMixin.js';
    import Modal from './Modal.vue';

    export default {
        name: 'HelpModal',
        components: { Modal },
        mixins: [ModalWindowAndButtonMixin],
        data() {
            return {
                info: this.$app.schema.info,
            };
        },
        methods: {
            isArray(item) {
                return Array.isArray(item);
            },
        },
    };
</script>
