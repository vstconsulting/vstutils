import { computed } from 'vue';
import { signals } from '@/vstutils/signals';
import Gravatar from './Gravatar.js';
import TFAPage from './TFAPage.vue';
import { IntegerField } from '../fields/numbers/integer.js';
import { guiPopUp, pop_up_msg } from '../popUp';
import { generatePassword, getApp, generateBase32String, generateRandomString } from '../utils';
import { useViewStore } from '@/vstutils/store';
import './settings.js';
export { Gravatar };

const usersPath = '/user/';
const usersDetailPath = `${usersPath}{id}/`;

const RECOVERY_CODE_LENGTH = 10;

function addGeneratePasswordAction(view) {
    view.actions.set('generate_password', {
        name: 'generate_password',
        title: 'Generate password',
        handler: () => {
            const app = getApp();
            const password = generatePassword();
            app.store.page.setFieldValue({ field: 'password', value: password });
            app.store.page.setFieldValue({ field: 'password2', value: password });
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
    tfaView.title = 'Two factor authentication';
    tfaView.extendStore((store) => {
        const app = getApp();

        async function fetchData() {
            await store.fetchData(store.getInstancePk());
            if (!store.sandbox.enabled) {
                store.setFieldValue({
                    field: 'secret',
                    value: generateBase32String(),
                    markChanged: false,
                });

                const codes = [];
                const half = Math.ceil(RECOVERY_CODE_LENGTH / 2);
                for (let i = 0; i < 15; i++) {
                    const code = generateRandomString(RECOVERY_CODE_LENGTH).toLowerCase();
                    codes.push(code.slice(0, half) + '-' + code.slice(half));
                }
                store.setFieldValue({ field: 'recovery', value: codes.join(','), markChanged: false });
            }
        }

        const secretUri = computed(() => {
            if (store.sandbox.value.secret) {
                const username = app.user.getViewFieldValue();
                return `otpauth://totp/${username}@${app.config.projectName}?secret=${store.sandbox.secret}`;
            }
            return null;
        });

        return {
            ...store,
            fetchData,
            secretUri,
        };
    });

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

signals.connect('</user/{id}/twofa/>filterActions', (obj) => {
    const app = getApp();
    obj.actions = [
        {
            name: 'save',
            title: obj.data.enabled ? 'Disable' : 'Enable',
            async handler() {
                try {
                    app.store.page.validateAndSetInstanceData();
                } catch (e) {
                    app.error_handler.defineErrorAndShow(e);
                    return;
                }
                app.store.page.loading = true;
                const instance = app.store.page.instance;
                try {
                    await instance.update('put');
                    app.store.page.loading = false;
                    app.store.page.changedFields = [];
                    guiPopUp.success(app.i18n.t(pop_up_msg.instance.success.save, ['', 'TFA']));
                    await useViewStore().fetchData();
                } catch (error) {
                    app.store.page.loading = false;
                    let str = app.error_handler.errorToString(error);
                    let srt_to_show = app.i18n.t(pop_up_msg.instance.error.save, [str]);
                    app.error_handler.showError(srt_to_show, str);
                }
            },
        },
    ];
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
