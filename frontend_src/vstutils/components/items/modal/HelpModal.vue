<template>
    <div style="display: contents">
        <portal to="root-bottom">
            <Modal v-show="showModal" :opt="{ footer: false }" @close="close">
                <template #header>
                    <h3>{{ $t(info.title) }}</h3>
                </template>
                <template #body>
                    <h4 class="with_bottom_border">
                        {{ $u.capitalize($tc('version', 2)) }}
                    </h4>
                    <ul>
                        <li v-for="(item, idx) in info['x-versions']" :key="idx">
                            <b>{{ $t(idx).toLowerCase() }}:</b>
                            {{ item }}
                        </li>
                    </ul>
                    <template v-for="(item, key) in info['x-links']">
                        <h4 :key="`header-${key}`" class="with_bottom_border" style="margin-top: 20px">
                            {{ $u.capitalize($t(key.toLowerCase())) }}
                        </h4>
                        <ul :key="`list-${key}`">
                            <template v-if="isArray(item)">
                                <li v-for="(prop, liIdx) in item" :key="liIdx">
                                    <a :href="prop.url" target="_blank" rel="noreferrer">
                                        {{ $u.capitalize($t(prop.name.toLowerCase())) }}
                                    </a>
                                </li>
                            </template>
                            <template v-else>
                                <li>
                                    <a :href="item.url" target="_blank" rel="noreferrer">
                                        {{ $u.capitalize($t(item.name.toLowerCase())) }}
                                    </a>
                                </li>
                            </template>
                        </ul>
                    </template>
                </template>
            </Modal>
        </portal>
        <button class="btn btn-secondary btn-block" style="margin-bottom: 10px" @click.stop.prevent="open">
            <span class="fa fa-question-circle" />
            {{ $u.capitalize($t('app info')) }}
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
