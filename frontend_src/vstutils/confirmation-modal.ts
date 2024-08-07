import { shallowRef } from 'vue';

/**
 * @internal
 */
export const _currentConfirmationModal = shallowRef<{
    title: string;
    text: string;
    confirmButtonText?: string;
    cancelButtonText?: string;

    confirm: () => void;
    reject: () => void;
}>();

export function showConfirmationModal(params: {
    title: string;
    text: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
}): Promise<boolean> {
    return new Promise((resolve) => {
        _currentConfirmationModal.value = {
            ...params,
            confirm: () => {
                _currentConfirmationModal.value = undefined;
                resolve(true);
            },
            reject: () => {
                _currentConfirmationModal.value = undefined;
                resolve(false);
            },
        };
    });
}
