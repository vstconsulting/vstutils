import signals from '../signals.js';
import { path_pk_key, randomString } from '../utils';
import ProfileViewConstructor from './ProfileViewConstructor.js';

import Gravatar from './Gravatar.js';

export { Gravatar, ProfileViewConstructor };

/**
 * Function returns profile string.
 * @returns {string}
 */
function getProfileString() {
    return 'profile';
}

/**
 * Object with mixins for some profile pages.
 */
let profile_mixins = {};
profile_mixins['/user/{' + path_pk_key + '}/'] = {
    methods: {
        getBreadcrumbNameForCurrentPath: getProfileString,
    },
    computed: {
        title: getProfileString,
    },
};
profile_mixins['/user/{' + path_pk_key + '}/edit/'] = {
    computed: {
        title: getProfileString,
    },
};

let profile_constructor = new ProfileViewConstructor(profile_mixins);

/**
 * Function generates profile views.
 * This function is supposed to be called from 'allViews.inited' signal.
 * @param {object} obj Object with properties from signal.
 */
function addProfileViews(obj) {
    let str = '/user/{' + path_pk_key + '}/';
    let views = obj.views;
    let paths_for_profile = Object.keys(views).filter((path) => path.indexOf(str) === 0);

    paths_for_profile.forEach((path) => {
        let new_path = path.replace('user/{' + path_pk_key + '}', 'profile');
        views[new_path] = profile_constructor.generateProfileView(views, path);
    });
}

/**
 * Function. that is supposed to be called from tabSignal, connected with user models.
 * @param {object} obj Object with signal arguments.
 */
function userModelHandler(obj) {
    obj.model.view_name = 'username';
}

let userModels = ['OneUser', 'User'];
userModels.forEach((model) => {
    let signal = 'models[{0}].created'.format([model]);
    signals.connect(signal, userModelHandler);
});

signals.connect('models[User].fields.beforeInit', (fields) => {
    fields.email.hidden = true;
});

['CreateUser', 'ChangePassword'].forEach((model) => {
    signals.connect('models[{0}].fields.beforeInit'.format([model]), (fields) => {
        ['old_password', 'password', 'password2'].forEach((field) => {
            if (fields[field]) {
                fields[field].format = 'password';
            }
        });
    });
});
/**
 * Signal adds custom redirect methods, that should be executed after user password was changed.
 */
signals.connect('views[/user/{' + path_pk_key + '}/change_password/].afterInit', (obj) => {
    obj.view.mixins.push({
        methods: {
            // eslint-disable-next-line no-unused-vars
            getRedirectUrl(opt) {
                return this.$route.path.replace('/change_password', '');
            },
            openRedirectUrl(options) {
                let reload_page = false;

                if (this.$route.path.indexOf('/profile') === 0) {
                    reload_page = true;
                }

                if (
                    this.$route.path.indexOf('/user') === 0 &&
                    this.$route.params[path_pk_key] === window.app.api.getUserId()
                ) {
                    reload_page = true;
                }

                if (
                    this.$route.path.indexOf('/user') !== 0 &&
                    this.$route.path.indexOf('/user') !== -1 &&
                    this.$route.params.user_id === window.app.api.getUserId()
                ) {
                    reload_page = true;
                }

                this.openPage(options);

                if (reload_page) {
                    window.location.reload();
                }
            },
        },
    });
});

signals.connect('allViews.inited', addProfileViews);

/**
 * Mixin for a view that is supposed to be used for creating/editing some user's password.
 */
const view_with_user_password_mixin = {
    methods: {
        /**
         * Method, that generates random password and sets it to the 'password' and 'password2' fields.
         */
        generate_passwordInstance() {
            const password = randomString(8);

            ['password', 'password2'].forEach((field) => {
                this.commitMutation('setFieldValue', { field, value: password });
            });
        },
    },
};

/**
 * Function, that creates signals, that add to the user views opportunity to generate random password.
 * @param {string} path Path os user view.
 */
export function addChangePasswordOperationToView(path) {
    signals.connect('views[' + path + '].afterInit', (obj) => {
        obj.view.mixins.push(view_with_user_password_mixin);
    });

    signals.connect('views[' + path + '].created', (obj) => {
        obj.view.schema.operations.generate_password = {
            name: 'generate_password',
            title: 'generate password',
        };
    });
}
window.addChangePasswordOperationToView = addChangePasswordOperationToView;

/**
 * Adds to following views opportunity to generate random users password.
 */
['/user/new/', '/user/{' + path_pk_key + '}/change_password/', '/profile/change_password/'].forEach(
    addChangePasswordOperationToView,
);
