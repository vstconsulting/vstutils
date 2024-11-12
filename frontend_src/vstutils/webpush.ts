import { type IApp } from '#vstutils/app';
import { BooleanField, BooleanFieldMixin } from '#vstutils/fields/boolean';
import { type Model } from '#vstutils/models';
import { guiPopUp } from '#vstutils/popUp';
import { onFilterOperations, onSchemaViewsCreated, signals, useSignalSubscription } from '#vstutils/signals';
import { HttpMethods, formatPath, getApp, joinPaths } from '#vstutils/utils';
import { type PageEditView } from '#vstutils/views';
import { type Component, defineComponent, ref } from 'vue';
import { type DefaultXOptions, type FieldOptions } from './fields/base';

const notificationsSupported =
    'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window;

function getServiceWorkerRegistration() {
    return navigator.serviceWorker.getRegistration();
}

const EXCLUDE_FIELDS = ['subscription_data', 'language_code', 'notifications_enabled'];

function getUserNotificationSettingsViewSubpath(app: IApp) {
    return app.schema.info['x-webpush']?.user_settings_subpath;
}

function getUserNotificationSettingsViewUrl(app: IApp) {
    const subpath = getUserNotificationSettingsViewSubpath(app);
    if (subpath) {
        return joinPaths('/user/{id}/', subpath);
    }
    return null;
}

const NotificationStatusFieldMixin = defineComponent({
    extends: BooleanFieldMixin,
    setup() {
        const enabled = ref(false);

        getServiceWorkerRegistration()
            .then((registration) => registration?.pushManager.getSubscription())
            .then((subscription) => {
                enabled.value = Boolean(subscription);
            });

        useSignalSubscription('pushSubscriptionChange', ({ enabled: value }: { enabled: true }) => {
            enabled.value = value;
        });

        return {
            value: enabled,
        };
    },
});

class NotificationsStatusField extends BooleanField {
    static format = 'notifications-status';

    override getComponent(): Component {
        return NotificationStatusFieldMixin;
    }
}

function isAllDisabled(instance: Model) {
    return Array.from(instance._fields.values())
        .filter((field) => !EXCLUDE_FIELDS.includes(field.name))
        .every((field) => !instance.sandbox.value[field.name]);
}

function subscribe(serviceWorkerRegistration: ServiceWorkerRegistration) {
    // If subscription is already exists then new is not created
    // https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe
    return serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true, // must be true
        applicationServerKey: getApp().schema.info['x-webpush']!.public_key,
    });
}

function getPermission() {
    return navigator.permissions.query({ name: 'notifications' });
}

/**
 * Function which handles push subscription when user starts using app.
 * It's implied that service worker is ready and browser supports pushes.
 * There are three main cases:
 * - subscription must be **renewed** if notification settings have at least one
 * param enabled and user didn't explicitly disabled notifications in browser;
 * - subscription must be **removed** if notification settings have at least one
 * param enabled but user explicitly disabled notification in browser;
 * - subscription must be **removed** if notification settings have all params
 * disabled.
 */
async function setupAppNotifications(app: IApp, view: PageEditView) {
    const notificationSettingsViewPath = getUserNotificationSettingsViewUrl(app);
    if (!notificationSettingsViewPath) {
        return;
    }
    view.parent!.useViewFieldAsTitle = false;
    const qs = view.objects.clone({ url: formatPath(notificationSettingsViewPath, { id: 'profile' }) });
    const notificationsSettings = await qs.get(undefined);

    const swRegistration = await getServiceWorkerRegistration();
    if (!swRegistration) {
        return;
    }
    const subscription = await swRegistration.pushManager.getSubscription();

    if (isAllDisabled(notificationsSettings)) {
        if (subscription) {
            subscription.unsubscribe();
            signals.emit('pushSubscriptionChange', { enabled: false });
        }
        return;
    }

    async function subscribeAndCallApi() {
        const subscription = await subscribe(swRegistration!);
        const data = subscription.toJSON();
        if (!data.endpoint || !data.keys) {
            throw new Error(`WebPush subscription data is missing ${JSON.stringify(data)}`);
        }
        await app.api.makeRequest({
            auth: true,
            useBulk: true,
            method: HttpMethods.PATCH,
            path: qs.url,
            data: {
                subscription_data: data,
                language_code: app.userSettingsStore!.settings.main.language,
            },
        });
        signals.emit('pushSubscriptionChange', { enabled: Boolean(subscription) });
    }

    const permission = await getPermission();
    permission.addEventListener('change', () => {
        if (permission.state === 'granted') {
            subscribeAndCallApi();
        } else if (permission.state === 'denied') {
            signals.emit('pushSubscriptionChange', { enabled: false });
        }
    });

    if (permission.state === 'denied') {
        if (subscription) {
            subscription.unsubscribe();
            signals.emit('pushSubscriptionChange', { enabled: false });
        }
        return;
    }
}

/**
 * Function which handles notification settings view.
 * There are two main cases:
 * - subscription must be removed if all params are disabled;
 * - subscription must be sent to API with settings saving if at least one
 * param is enabled.
 */
function setupNotificationsViewSaveAction(app: IApp, view: PageEditView) {
    view.extendStore((store: any) => {
        async function save() {
            let subscription;
            try {
                const swRegistration = await getServiceWorkerRegistration();
                subscription = await swRegistration!.pushManager.getSubscription();

                if (isAllDisabled(store.instance.value)) {
                    if (subscription) {
                        await subscription.unsubscribe();
                        subscription = null;
                    }
                } else if (!subscription) {
                    subscription = await subscribe(swRegistration!);
                }
            } catch (e) {
                // going here if user explicitly disabled notification in browser
                app.error_handler.defineErrorAndShow(e);
                return;
            }

            store.instance.value.sandbox.set({
                field: 'subscription_data',
                // if subscription is null then API should delete it
                value: subscription ? subscription.toJSON() : null,
            });
            store.instance.value.sandbox.set({
                field: 'language_code',
                value: app.userSettingsStore!.settings.main.language,
            });

            await store.save();
        }

        return {
            ...store,
            save,
        };
    });
}

export function setupPushNotifications(app: IApp) {
    const notificationSettingsViewPath = getUserNotificationSettingsViewUrl(app);
    if (!notificationSettingsViewPath) {
        return;
    }
    const viewSchema = app.schema.paths[notificationSettingsViewPath];
    if (!viewSchema) {
        return;
    }
    if (!notificationsSupported) {
        for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
            if (viewSchema[method]) {
                viewSchema[method]!['x-hidden'] = true;
            }
        }
        return;
    }

    app.fieldsResolver.registerField('boolean', NotificationsStatusField.format, NotificationsStatusField);

    // @ts-expect-error We do not use references for responses
    const modelName = viewSchema.get!.responses['200'].schema.$ref.split('/').pop()!;
    const modelSchema = app.schema.definitions[modelName]!;

    modelSchema['x-visibility-data-field-name'] = '_availability';
    (modelSchema.properties!._availability as FieldOptions<DefaultXOptions, unknown>)['x-hidden'] = true;

    modelSchema.properties!.notifications_enabled.format = NotificationsStatusField.format;

    onSchemaViewsCreated(({ views }) => {
        const view = views.get(joinPaths(notificationSettingsViewPath, 'edit')) as PageEditView | undefined;

        if (!view) {
            return;
        }

        setupNotificationsViewSaveAction(app, view);
        setupAppNotifications(app, view);
    });

    onFilterOperations('sublinks', '/user/{id}/', (obj) => {
        const notificationSettingsViewSubpath = getUserNotificationSettingsViewSubpath(app);
        if (String(obj.data!.id) !== app.userProfile.sub) {
            obj.sublinks = obj.sublinks.filter((sublink) => sublink.name !== notificationSettingsViewSubpath);
        }
    });

    onFilterOperations('actions', notificationSettingsViewPath, (obj) => {
        obj.actions = obj.actions.filter((action) => action.name !== 'remove');

        const isAllDisabled = Object.entries(obj.data!)
            .filter(([key]) => !EXCLUDE_FIELDS.includes(key))
            .every(([, value]) => !value);

        if (isAllDisabled) {
            return;
        }

        obj.actions.push({
            name: 'enable_on_current_device',
            title: app.i18n.ts('Enable on current device'),
            isEmpty: true,
            doNotGroup: true,
            async handler() {
                try {
                    const state = await Notification.requestPermission();
                    if (state !== 'granted') {
                        app.error_handler.defineErrorAndShow(
                            new Error('Please enable notification in your browser'),
                        );
                        return;
                    }
                    const swRegistration = (await getServiceWorkerRegistration())!;
                    const subscription = await subscribe(swRegistration);
                    const data = subscription.toJSON();
                    if (!data.endpoint || !data.keys) {
                        throw new Error(`WebPush subscription data is missing ${JSON.stringify(data)}`);
                    }
                    await app.api.makeRequest({
                        auth: true,
                        useBulk: true,
                        method: HttpMethods.PATCH,
                        path: app.router!.currentRoute.path,
                        data: {
                            subscription_data: data,
                        },
                    });
                    guiPopUp.success(app.i18n.ts('Notifications on current device were enabled.'));
                    signals.emit('pushSubscriptionChange', { enabled: Boolean(subscription) });
                } catch (e) {
                    app.error_handler.defineErrorAndShow(e);
                }
            },
        });
    });
}
