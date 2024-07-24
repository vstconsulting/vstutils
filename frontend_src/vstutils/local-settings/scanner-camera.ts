import { signals } from '#vstutils/signals';
import { CameraSelectField } from '#vstutils/fields/camera-select';

signals.once('models[_LocalSettings].fields.beforeInit', (fields) => {
    const scannerCameraField = new CameraSelectField({
        name: 'scannerCamera',
        title: 'Scanner camera',
    });
    // @ts-expect-error no types
    fields.scannerCamera = scannerCameraField;
});
