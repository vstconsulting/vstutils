<template>
    <portal ref="portal" to="root-bottom">
        <div class="full-screen-view" :class="{ 'no-dark-mode': noDarkMode }">
            <div class="wrapper">
                <div class="btn-wrapper">
                    <button type="button" :title="$ts('Close')" @click="$emit('close')">
                        <i aria-hidden="true" class="fa fa-times" />
                    </button>
                </div>
                <div class="content">
                    <slot />
                </div>
            </div>
        </div>
    </portal>
</template>

<script setup lang="ts">
    import { useEventListener } from '@vueuse/core';

    defineProps<{
        noDarkMode?: boolean;
    }>();

    const emit = defineEmits<{
        (e: 'close'): void;
    }>();

    useEventListener(document, 'keydown', (e) => {
        if (e.code === 'Escape') {
            emit('close');
        }
    });
</script>

<style scoped lang="scss">
    .dark-mode {
        .full-screen-view:not(.no-dark-mode) {
            background-color: #343a40;
        }
    }

    .full-screen-view {
        z-index: 9999;
        position: fixed;
        overflow: hidden;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        width: 100dvw;
        height: 100dvh;
        background-color: white;

        .wrapper {
            $padding: 2rem;

            position: relative;
            padding: $padding;

            .btn-wrapper {
                position: absolute;
                padding: inherit;
                right: 0;
                top: 0;

                button {
                    padding: 0.5rem;
                    color: gray;
                    background: transparent;
                    border: none;
                    outline: none;

                    &:hover {
                        color: #555555;
                        border: none;
                        outline: none;
                    }
                }
            }

            .content {
                width: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                height: calc(100vh - 2 * $padding);
            }
        }
    }
</style>
