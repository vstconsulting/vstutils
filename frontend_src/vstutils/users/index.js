import signals from '../signals.js';
import { path_pk_key } from '../utils';
import ProfileViewConstructor from './ProfileViewConstructor.js';

import Gravatar from './Gravatar.js';

export { Gravatar, ProfileViewConstructor };

// let profile_constructor = new ProfileViewConstructor(profile_mixins);
//
// /**
//  * Function generates profile views.
//  * This function is supposed to be called from 'allViews.inited' signal.
//  * @param {object} obj Object with properties from signal.
//  */
// function addProfileViews(obj) {
//     let str = '/user/{' + path_pk_key + '}/';
//     let views = obj.views;
//     let paths_for_profile = Object.keys(views).filter((path) => path.indexOf(str) === 0);
//
//     paths_for_profile.forEach((path) => {
//         let new_path = path.replace('user/{' + path_pk_key + '}', 'profile');
//         views.set(new_path, profile_constructor.generateProfileView(views, path));
//     });
// }
//

// Set view field to username
signals.once('allModels.created', ({ models }) => {
    for (const modelName of ['OneUser', 'User']) {
        const model = models.get(modelName);
        model.viewField = model.fields.get('username');
    }
});

// signals.connect('models[User].fields.beforeInit', (fields) => {
//     fields.email.hidden = true;
// });
//
// ['CreateUser', 'ChangePassword'].forEach((model) => {
//     signals.connect('models[{0}].fields.beforeInit'.format([model]), (fields) => {
//         ['old_password', 'password', 'password2'].forEach((field) => {
//             if (fields[field]) {
//                 fields[field].format = 'password';
//             }
//         });
//     });
// });
// /**
//  * Signal adds custom redirect methods, that should be executed after user password was changed.
//  */
// signals.connect('views[/user/{' + path_pk_key + '}/change_password/].afterInit', (obj) => {
//     obj.view.mixins.push({
//         methods: {
//             // eslint-disable-next-line no-unused-vars
//             getRedirectUrl(opt) {
//                 return this.$route.path.replace('/change_password', '');
//             },
//             openRedirectUrl(options) {
//                 let reload_page = false;
//
//                 if (this.$route.path.indexOf('/profile') === 0) {
//                     reload_page = true;
//                 }
//
//                 if (
//                     this.$route.path.indexOf('/user') === 0 &&
//                     this.$route.params[path_pk_key] === window.app.api.getUserId()
//                 ) {
//                     reload_page = true;
//                 }
//
//                 if (
//                     this.$route.path.indexOf('/user') !== 0 &&
//                     this.$route.path.indexOf('/user') !== -1 &&
//                     this.$route.params.user_id === window.app.api.getUserId()
//                 ) {
//                     reload_page = true;
//                 }
//
//                 this.openPage(options);
//
//                 if (reload_page) {
//                     window.location.reload();
//                 }
//             },
//         },
//     });
// });
//
// signals.connect('allViews.inited', addProfileViews);
//
// /**
//  * Mixin for a view that is supposed to be used for creating/editing some user's password.
//  */
// const view_with_user_password_mixin = {
//     methods: {
//         /**
//          * Method, that generates random password and sets it to the 'password' and 'password2' fields.
//          */
//         generate_passwordInstance() {
//             const password = randomString(8);
//
//             ['password', 'password2'].forEach((field) => {
//                 this.commitMutation('setFieldValue', { field, value: password });
//             });
//         },
//     },
// };
//
// /**
//  * Adds to following views opportunity to generate random users password.
//  */
// ['/user/new/', '/user/{' + path_pk_key + '}/change_password/', '/profile/change_password/'].forEach(
//     addChangePasswordOperationToView,
// );

// Redirect all /profile/... requests to /user/{currentUser.id}/...
signals.once('app.afterInit', ({ app }) => {
    const currentUserViewPath = `/user/${window.app.api.getUserId()}`;
    const profilePath = '/profile';
    app.router.beforeEach((to, from, next) => {
        if (to.path.startsWith(profilePath)) {
            next({ path: to.path.replace(profilePath, currentUserViewPath) });
        } else {
            next();
        }
    });
});
