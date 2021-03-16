import signals from '../signals.js';
import Gravatar from './Gravatar.js';
import TFAPage from './TFAPage.vue';

export { Gravatar };

// Set view field to username
signals.once('allModels.created', ({ models }) => {
    for (const modelName of ['OneUser', 'User']) {
        const model = models.get(modelName);
        model.viewField = model.fields.get('username');
    }
});

// Redirect all /profile/... requests to /user/{currentUser.id}/...
signals.once('app.afterInit', ({ app }) => {
    const currentUserViewPath = `/user/${app.api.getUserId()}`;
    const profilePath = '/profile';
    app.router.beforeEach((to, from, next) => {
        if (to.path.startsWith(profilePath)) {
            next({ path: to.path.replace(profilePath, currentUserViewPath) });
        } else {
            next();
        }
    });
});

// Setup tfa configuration page
signals.once('openapi.loaded', (schema) => {
    schema.paths['/user/{id}/twofa/']['x-edit-style'] = true;
});
signals.once('allModels.created', ({ models }) => {
    models.get('TwoFA').viewField = null;
});
signals.once('allViews.created', ({ views }) => {
    const userView = views.get('/user/{id}/');
    const tfaSublink = userView.sublinks.get('twofa');
    tfaSublink.title = 'Two factor authentication';
    tfaSublink.iconClasses = ['fas', 'fa-lock'];

    const tfaView = views.get('/user/{id}/twofa/');
    tfaView.mixins.push(TFAPage);
    tfaView.params.method = 'PUT';
});
