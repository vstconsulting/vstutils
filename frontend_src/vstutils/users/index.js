import signals from '../signals.js';
import Gravatar from './Gravatar.js';
import TFAPage from './TFAPage.vue';
import { IntegerField } from '../fields/numbers/integer.js';
import { generatePassword } from '../utils';
import './settings.js';
export { Gravatar };

const usersPath = '/user/';
const usersDetailPath = `${usersPath}{id}/`;

function addGeneratePasswordAction(view) {
    view.actions.set('generate_password', {
        name: 'generate_password',
        title: 'Generate password',
    });
    view.mixins.push({
        methods: {
            generate_passwordInstance() {
                const password = generatePassword();
                this.setFieldValue({ field: 'password', value: password });
                this.setFieldValue({ field: 'password2', value: password });
            },
        },
    });
}

// Redirect all /profile/... requests to /user/{currentUser.id}/...
signals.once('app.afterInit', ({ app }) => {
    const currentUserViewPath = `${usersPath}${app.api.getUserId()}`;
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
    schema.paths[`${usersDetailPath}twofa/`]['x-edit-style'] = true;
});
signals.once('allModels.created', ({ models }) => {
    models.get('TwoFA').viewField = null;
});
signals.once('allViews.created', ({ views }) => {
    // Configure user page
    const userView = views.get(usersDetailPath);

    userView.sublinks.delete('_settings');

    const tfaSublink = userView.sublinks.get('twofa');
    tfaSublink.title = 'Two factor authentication';
    tfaSublink.iconClasses = ['fas', 'fa-lock'];

    const tfaView = views.get(`${usersDetailPath}twofa/`);
    tfaView.mixins.push(TFAPage);
    tfaView.params.method = 'PUT';

    // Hide settings view
    views.get(`${usersDetailPath}_settings/`).hidden = true;

    // Add generate password actions
    const changePasswordView = views.get('/user/{id}/change_password/');
    if (changePasswordView) {
        addGeneratePasswordAction(changePasswordView);
    }
    const newUserView = views.get('/user/new/');
    if (newUserView) {
        addGeneratePasswordAction(newUserView);
    }
});

class UserIDField extends IntegerField {
    toInner(data = {}) {
        if (this._getValueFromData(data) === 'profile') {
            return 'profile';
        }
        return super.toInner(data);
    }
}

signals.once('allViews.created', ({ views }) => {
    const qssWithUserIdInPath = new Set(
        Array.from(views.values())
            .filter((view) => view.path.startsWith('/user/{id}/') && view.objects)
            .map((view) => view.objects),
    );
    for (const qs of qssWithUserIdInPath) {
        if (qs.pathParams.length > 0) {
            qs.pathParams[0] = new UserIDField(qs.pathParams[0].options);
        }
    }
});
