import signals from '../signals';

signals.once('models[_UserSettings].fields.beforeInit', (fields) => {
    fields.custom.title = 'Custom settings';
    fields.main.title = 'Main settings';
});
