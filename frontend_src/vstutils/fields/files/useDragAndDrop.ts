import type { Ref } from 'vue';
import { watch, onBeforeUnmount } from 'vue';

const isAdvancedUploadAvailable = (function () {
    const div = document.createElement('div');
    return (
        ('draggable' in div || ('ondragstart' in div && 'ondrop' in div)) &&
        'FormData' in window &&
        'FileReader' in window
    );
})();

function preventAndStopHandler(e: Event) {
    e.preventDefault();
    e.stopPropagation();
}

const dragOverEvents = ['dragover', 'dragenter'];
const dragLeaveEvents = ['dragleave', 'dragend', 'drop'];
const allDragRelated = ['drag', 'dragstart', ...dragOverEvents, ...dragLeaveEvents];

export function useDragAndDrop({
    dragZoneRef,
    onDragOver,
    onDragLeave,
    onDragFinished,
}: {
    dragZoneRef: Ref<HTMLElement | null>;
    onDragOver?: (e: DragEvent) => void;
    onDragLeave?: (e: DragEvent) => void;
    onDragFinished?: (e: DragEvent) => void;
}) {
    if (!isAdvancedUploadAvailable) {
        return;
    }

    function setupListeners(method: 'addEventListener' | 'removeEventListener') {
        const el = dragZoneRef.value!;
        for (const eventName of allDragRelated) {
            el[method](eventName, preventAndStopHandler);
        }
        if (onDragOver) {
            for (const eventName of dragOverEvents) {
                el[method](eventName, onDragOver as EventListener);
            }
        }
        if (onDragLeave) {
            for (const eventName of dragLeaveEvents) {
                el[method](eventName, onDragLeave as EventListener);
            }
        }
        if (onDragFinished) {
            el[method]('drop', onDragFinished as EventListener);
        }
    }

    onBeforeUnmount(() => {
        if (dragZoneRef.value) {
            setupListeners('removeEventListener');
        }
    });

    const unwatch = watch(dragZoneRef, () => {
        if (dragZoneRef.value) {
            setupListeners('addEventListener');
            unwatch();
        }
    });
}
