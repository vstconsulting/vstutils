import signals from '../signals.js';
import Gravatar from './Gravatar.js';
import TFAPage from './TFAPage.vue';

export { Gravatar };

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
    // Configure user page
    const userView = views.get('/user/{id}/');

    userView.sublinks.delete('_settings');

    const tfaSublink = userView.sublinks.get('twofa');
    tfaSublink.title = 'Two factor authentication';
    tfaSublink.iconClasses = ['fas', 'fa-lock'];

    const tfaView = views.get('/user/{id}/twofa/');
    tfaView.mixins.push(TFAPage);
    tfaView.params.method = 'PUT';

    // Hide settings view
    views.get('/user/{id}/_settings/').hidden = true;
});
