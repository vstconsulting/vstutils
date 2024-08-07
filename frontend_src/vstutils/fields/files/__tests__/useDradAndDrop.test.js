import { ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useDragAndDrop } from '../useDragAndDrop';

test('useDragAndDrop', async () => {
    const onDragOver = vitest.fn();
    const onDragLeave = vitest.fn();
    const onDragFinished = vitest.fn();

    const wrapper = mount({
        template: '<div ref="div" />',
        setup() {
            const div = ref(null);
            useDragAndDrop({ dragZoneRef: div, onDragOver, onDragLeave, onDragFinished });
            return { div };
        },
    });

    await nextTick();

    await wrapper.trigger('dragover');
    expect(onDragOver).toBeCalledTimes(1);
    expect(onDragLeave).toBeCalledTimes(0);
    expect(onDragFinished).toBeCalledTimes(0);

    await wrapper.trigger('dragleave');
    expect(onDragOver).toBeCalledTimes(1);
    expect(onDragLeave).toBeCalledTimes(1);
    expect(onDragFinished).toBeCalledTimes(0);

    await wrapper.trigger('drop');
    expect(onDragOver).toBeCalledTimes(1);
    expect(onDragLeave).toBeCalledTimes(2);
    expect(onDragFinished).toBeCalledTimes(1);

    wrapper.destroy();
});
