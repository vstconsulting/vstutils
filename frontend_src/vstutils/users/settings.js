import { signals } from '#vstutils/signals';

signals.once('models[_UserSettings].fields.beforeInit', (fields) => {
    fields.custom.title = 'Custom settings';
    fields.main.title = 'Main settings';
});
