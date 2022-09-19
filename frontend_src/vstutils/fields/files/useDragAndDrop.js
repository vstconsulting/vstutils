import { watch, onBeforeUnmount } from 'vue';

const isAdvancedUploadAvailable = (function () {
    const div = document.createElement('div');
    return (
        ('draggable' in div || ('ondragstart' in div && 'ondrop' in div)) &&
        'FormData' in window &&
        'FileReader' in window
    );
})();

function preventAndStopHandler(e) {
    e.preventDefault();
    e.stopPropagation();
}

const dragOverEvents = ['dragover', 'dragenter'];
const dragLeaveEvents = ['dragleave', 'dragend', 'drop'];
const allDragRelated = ['drag', 'dragstart', ...dragOverEvents, ...dragLeaveEvents];

export function useDragAndDrop({ dragZoneRef, onDragOver, onDragLeave, onDragFinished }) {
    if (!isAdvancedUploadAvailable) {
        return;
    }

    function setupListeners(method) {
        for (const eventName of allDragRelated) {
            dragZoneRef.value[method](eventName, preventAndStopHandler);
        }
        if (onDragOver) {
            for (const eventName of dragOverEvents) {
                dragZoneRef.value[method](eventName, onDragOver);
            }
        }
        if (onDragLeave) {
            for (const eventName of dragLeaveEvents) {
                dragZoneRef.value[method](eventName, onDragLeave);
            }
        }
        if (onDragFinished) {
            dragZoneRef.value[method]('drop', onDragFinished);
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
