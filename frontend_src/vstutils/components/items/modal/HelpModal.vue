<template>
    <BootstrapModal :title="$t(info.title)" @close="close">
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
        <template #footer>
            <button class="btn btn-danger" @click="resetAll">
                {{ $t('Clear all cache with settings') }}
            </button>
        </template>
        <template #activator="{ openModal }">
            <ControlSidebarButton icon-class="fa fa-question-circle" @click.native.stop.prevent="openModal">
                {{ $u.capitalize($t('app info')) }}
            </ControlSidebarButton>
        </template>
    </BootstrapModal>
</template>

<script>
    import { cleanAllCacheAndReloadPage } from '@/vstutils/cleanCacheHelpers.js';
    import ModalWindowAndButtonMixin from '../../../fields/ModalWindowAndButtonMixin.js';
    import BootstrapModal from './../../BootstrapModal.vue';
    import ControlSidebarButton from '../ControlSidebarButton.vue';

    export default {
        name: 'HelpModal',
        components: { ControlSidebarButton, BootstrapModal },
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
            resetAll() {
                cleanAllCacheAndReloadPage({ resetAll: true });
            },
        },
    };
</script>
