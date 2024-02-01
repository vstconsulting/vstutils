/** @type {NotificationOptions} */
const DEFAULT_NOTIFICATION_OPTIONS = JSON.parse(
  "{{ default_notification_options|escapejs }}"
);

self.addEventListener("push", (e) => {
  try {
    const { type, data } = e.data.json();
    if (type === "notification") {
      self.registration.showNotification(data.title, {
        ...DEFAULT_NOTIFICATION_OPTIONS,
        ...data.options,
      });
    };
  } catch (e) {
    console.warn(e);
  };
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (!e.notification.data || !e.notification.data.url) {
    return;
  };
  e.waitUntil(
    clients.matchAll({ type: "window" }).then((clientsArr) => {
      const client = clientsArr[0];
      if (client) {
        return client
          .navigate(e.notification.data.url)
          .then(() => client.focus());
      };

      return clients.openWindow(e.notification.data.url).then((client) => {
        if (client) {
          return client.focus();
        };
      });
    })
  );
});

self.addEventListener("pushsubscriptionchange", (e) => {
  if (!e.oldSubscription) {
    return;
  };
  e.waitUntil(
    self.registration.pushManager
      .subscribe(e.oldSubscription.options)
      .then((subscription) => {
        return fetch("{{ user_notifications_settings_url }}", {
          method: "PATCH",
          mode: "cors",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription_data: subscription.toJSON(),
          }),
        });
      })
      .catch((e) => {
        console.warn(e);
      })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "authPageOpened") {
    event.waitUntil(
      self.registration.pushManager.getSubscription().then((subscription) => {
        if (subscription) {
          return subscription.unsubscribe();
        }
      })
    );
  }
});
