declare const clients: Clients;
declare const self: ServiceWorkerGlobalScope;
interface PushSubscriptionChangeEvent extends ExtendableEvent {
    readonly oldSubscription: PushSubscription | null;
    readonly newSubscription: PushSubscription | null;
}

export const handlePush = (defaultNotificationOptions?: NotificationOptions) => {
    return (e: PushEvent) => {
        try {
            if (!e.data) {
                console.warn('Push event has no data');
                return;
            }

            const { type, data } = e.data.json();
            if (type === 'notification') {
                self.registration.showNotification(data.title, {
                    ...(defaultNotificationOptions ?? {}),
                    ...data.options,
                });
            }
        } catch (err) {
            console.warn('Error handling push event:', err);
        }
    };
};

export const handleNotificationClick = () => {
    return (e: NotificationEvent) => {
        e.notification.close();
        if (!e.notification.data || !e.notification.data.url) {
            return;
        }
        e.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientsArr) => {
                const client = clientsArr[0];
                if (client) {
                    return client.navigate(e.notification.data.url).then(() => client.focus());
                }

                return clients.openWindow(e.notification.data.url).then((client) => {
                    if (client) {
                        return client.focus();
                    }
                });
            }),
        );
    };
};

export const handlePushSubscriptionChange = (apiUrl?: string | URL) => {
    return (e: Event) => {
        const event = e as PushSubscriptionChangeEvent;
        if (!event.oldSubscription || !event.oldSubscription.endpoint) {
            console.warn('Push subscription change event has no old subscription');
            return;
        }
        event.waitUntil(
            self.registration.pushManager
                .subscribe(event.oldSubscription.options)
                .then((newSubscription) => {
                    const data = {
                        old_endpoint: event.oldSubscription!.endpoint,
                        subscription_data: newSubscription.toJSON(),
                    };
                    const url = new URL('webpush/pushsubscriptionchange/', apiUrl ? apiUrl : '/api/');
                    return fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data),
                    });
                })
                .catch((err) => {
                    console.warn(err);
                }),
        );
    };
};

export const handleNotificationsMessage = (event: ExtendableMessageEvent) => {
    if (event.data === 'authPageOpened') {
        event.waitUntil(
            self.registration.pushManager.getSubscription().then((subscription) => {
                if (subscription) {
                    return subscription.unsubscribe();
                }
            }),
        );
    }
};
