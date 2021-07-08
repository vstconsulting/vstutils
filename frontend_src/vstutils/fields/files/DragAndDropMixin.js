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

const allDragRelatedEvents = ['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'];
const dragOverEvents = ['dragover', 'dragenter'];
const dragLeaveEvents = ['dragleave', 'dragend', 'drop'];

/**
 * @vue/component
 */
export default {
    data: () => ({
        isAdvancedUploadAvailable,
    }),
    mounted() {
        this.setupListeners('addEventListener');
    },
    beforeDestroy() {
        this.setupListeners('removeEventListener');
    },
    methods: {
        setupListeners(method) {
            if (this.$refs.dragZone && this.isAdvancedUploadAvailable) {
                for (const eventName of allDragRelatedEvents) {
                    this.$refs.dragZone[method](eventName, preventAndStopHandler);
                }
                for (const eventName of dragOverEvents) {
                    this.$refs.dragZone[method](eventName, this.dragOver);
                }
                for (const eventName of dragLeaveEvents) {
                    this.$refs.dragZone[method](eventName, this.dragLeave);
                }
                this.$refs.dragZone[method]('drop', this.dragFinished);
            }
        },
        dragOver() {},
        dragLeave() {},
        dragFinished() {},
    },
};
