Configuration manual
====================

Introduction
------------
Though default configuration is suitable for many common cases, vstutils-based
applications is highly configurable system. If you need something more advanced
(scalability, dedicated DB, custom cache, logging or directories) you can configure
vstutils-based application deeply by tweaking ``/etc/{{app_name or app_lib_name}}/settings.ini``.

The most important thing to keep in mind when planning your application
architecture is that vstutils-based applications have a service-oriented structure.
To build a distributed scalable system you only need to connect to a shared database_,
shared cache_, locks_ and a shared rpc_ service (MQ such as RabbitMQ, Redis, etc.).
A shared file storage may be required in some cases, a but it isn't required by vstutils.

Let's consider the main sections of the config and its parameters:

|
|

.. _main:

Main settings
-------------

Section ``[main]``.

This section is intended for settings related to whole vstutils-based application
(both worker and web). Here you can specify verbosity level of vstutils-based
application during work, which can be useful for troubleshooting (logging level etc).
Also there are settings for changing of timezone for whole app and allowed domains.

If you want to use LDAP protocol, you should create next settings in section ``[main]``.

.. sourcecode:: bash

    ldap-server = ldap://server-ip-or-host:port
    ldap-default-domain = domain.name
    ldap-auth_format = cn=<username>,ou=your-group-name,<domain>

ldap-default-domain is an optional argument, that is aimed to make user authorization easier
(without input of domain name).

ldap-auth_format is an optional argument, that is aimed to customize LDAP authorization.
Default value: cn=<username>,<domain>

So in this case authorization logic will be the following:

#. System checks combination of login:password in database;

#. System checks combination of login:password in LDAP:

   * if domain was mentioned, it will be set during authorization
     (if user enter login without ``user@domain.name`` or without ``DOMAIN\user`` );

   * if authorization was successful and there is user with mentioned login in database,
     server creates session for him.


* **debug** - Enable debug mode. Default: false.
* **allowed_hosts** - Comma separated list of domains, which allowed to serve. Default: ``*``.
* **first_day_of_week** - Integer value with first day of week. Default: ``0``.
* **ldap-server** - LDAP server connection.
* **ldap-default-domain** - Default domain for auth.
* **ldap-auth_format** - Default search request format for auth. Default: ``cn=<username>,<domain>``.
* **timezone** - Timezone of web-application. Default: UTC.
* **log_level** - Logging level. Default: WARNING.
* **enable_django_logs** - Enable or disable Django logger to output.
  Useful for debugging. Default: false.
* **enable_admin_panel** - Enable or disable Django Admin panel. Default: false.
* **enable_registration** - Enable or disable user self-registration. Default: false.
* **auth-plugins** - Comma separated list of django authentication backends.
  Authorization attempt is made until the first successful one in order specified in the list.
* **auth-cache-user** - Enable or disable user instance caching. It increases session performance
  on each request but saves model instance in unsafe storage (default django cache).
  The instance is serialized to a string using the :mod:`standard python module pickle <pickle>`
  and then encrypted with :wiki:`Vigenère cipher <Vigenère cipher>`.
  Read more in the :class:`vstutils.utils.SecurePickling` documentation. Default: false.

|
|

.. _database:

Database settings
-----------------

Section ``[database]``.

Here you can change settings related to database system, which vstutils-based application will
use. vstutils-based application supports all databases supported by ``django``. List of
supported out of the box: SQLite (default choice), MySQL, Oracle, or
PostgreSQL. Configuration details you can look at
:django_docs:`Django database documentation <settings/#databases>`.
If you run vstutils-based application at multiple nodes (clusterization), you should
use some of client-server database (SQLite not suitable) shared for all nodes.

There is a list of required settings, that you should create for correct
database work while using MySQL.

Firstly, if you use MariaDB and you have set timezone different from "UTC" you should run
next command:

.. sourcecode:: bash

      mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root -p mysql

Secondly, for correct work of MariaDB you should set next options in ``settings.ini`` file:

.. sourcecode:: bash

      [database.options]
      connect_timeout = 10
      init_command = SET sql_mode='STRICT_TRANS_TABLES', default_storage_engine=INNODB, NAMES 'utf8', CHARACTER SET 'utf8', SESSION collation_connection = 'utf8_unicode_ci'

Finally, you should add some options to MariaDB configuration:

.. sourcecode:: bash

      [client]
      default-character-set=utf8
      init_command = SET collation_connection = @@collation_database

      [mysqld]
      character-set-server=utf8
      collation-server=utf8_unicode_ci

|
|

.. _cache:

Cache settings
--------------

Section ``[cache]``.

This section is for settings related to cache backend used by vstutils-based application.
vstutils-based application supports all cache backends that Django supports.
Filesystem, in-memory, memcached is supported out of the box and many others are supported by
additional plugins. You can find details about cache configusupported
:django_docs:`Django caches documentation
<settings/#caches>`. In clusterization scenario we advice to share cache between nodes to speedup their
work using client-server cache realizations.
We recommend to use Redis in production environments.

|
|

.. _locks:

Locks settings
--------------

Section ``[locks]``.

Locks is a system that vstutils-based application uses to prevent damage from parallel actions
working on something simultaneously. It is based on Django cache, so there is
another bunch of same settings as cache_. And why there is another
section for them, you may ask. Because cache backend is used for locking must
provide some guarantees, which do not required to usual cache: it MUST
be shared for all vstutils-based application threads and nodes. So, for example, in-memory backend is not suitable. In case of clusterization we strongly recommend
to use Redis or Memcached as backend for that purpose. Cache and locks backend
can be the same, but don't forget about requirement we said above.

|
|

.. _session:

Session cache settings
----------------------

Section ``[session]``.

vstutils-based application store sessions in database_, but for better performance,
we use a cache-based session backend. It is based on Django cache, so there is
another bunch of same settings as cache_. By default,
settings getted from cache_.

|
|

.. _rpc:

Rpc settings
------------

Section ``[rpc]``.

vstutils-based application uses Celery for long-running async tasks.
Celery is based on message queue concept,
so between web-service and workers running under Celery bust be some kind of
message broker (RabbitMQ or something).  Those settings relate to this broker
and Celery itself. Those kinds of settings: broker backend, number of
worker-processes per node and some settings used for troubleshoot
server-broker-worker interaction problems.

This section actual only with vstutils installed with `rpc` extra dependency.

* **connection** - Celery :celery_docs:`broker connection <userguide/configuration.html#conf-broker-settings>`. Default: ``filesystem:///var/tmp``.
* **concurrency** - Count of celery worker threads. Default: 4.
* **heartbeat** - Interval between sending heartbeat packages, which says that connection still alive. Default: 10.
* **enable_worker** - Enable or disable worker with webserver. Default: true.

|

The following variables from :celery_docs:`Django settings <userguide/configuration.html#new-lowercase-settings>`
are also supported (with the corresponding types):

* **prefetch_multiplier** - :celery_docs:`CELERYD_PREFETCH_MULTIPLIER <userguide/configuration.html#std-setting-worker_prefetch_multiplier>`
* **max_tasks_per_child** - :celery_docs:`CELERYD_MAX_TASKS_PER_CHILD <userguide/configuration.html#std-setting-worker_max_tasks_per_child>`
* **results_expiry_days** - :celery_docs:`CELERY_RESULT_EXPIRES <userguide/configuration.html#std-setting-result_expires>`
* **default_delivery_mode** - :celery_docs:`CELERY_DEFAULT_DELIVERY_MODE <userguide/configuration.html#task-default-delivery-mode>`

|
|

.. _worker:

Worker settings
---------------

Section ``[worker]``.

Celery worker options for start. Useful settings:

* **loglevel** - Celery worker logging level. Default: from main_ section ``log_level``.
* **pidfile** - Celery worker pidfile. Default: ``/run/{app_name}_worker.pid``
* **autoscale** - Options for autoscaling. Two comma separated numbers: max,min.
* **beat** - Enable or disable celery beat scheduler. Default: true.

Other settings can be getted from command ``celery worker --help``.


|
|

.. _mail:

SMTP settings
-----------------

Section ``[mail]``.

Django comes with several email sending backends. With the exception of the SMTP backend
(which is the default when ``host`` is set), these backends are only useful during testing and development.

Applications based on vstutils uses only ``smtp`` and ``console`` backends.

* **host** - IP or domain for smtp-server. If it not set vstutils uses ``console`` backends. Default: ``None``.
* **port** - Port for smtp-server connection. Default: ``25``.
* **user** - Username for smtp-server connection. Default: ``""``.
* **password** - Auth password for smtp-server connection. Default: ``""``.
* **tls** - Enable/disable tls for smtp-server connection. Default: ``False``.
* **send_confirmation** - Enable/disable confirmation message after registration. Default: ``False``.
* **authenticate_after_registration** - Enable/disable autologin after registration confirmation. Default: ``False``.

|
|

.. _web:

Web settings
------------

Section ``[web]``.

These settings are related to web-server. Those settings like:
session_timeout, static_files_url or pagination limit.

* **allow_cors** - Cross-origin resource sharing enabling. Default: ``False``.
* **enable_gravatar** - Enables/disables gravatar service using for users. Default: ``True``.
* **rest_swagger_description** - Help string in Swagger schema. Useful for dev-integrations.
* **openapi_cache_timeout** - Cache timeout for storing schema data. Default: 120.
* **health_throttle_rate** - Count of requests to `/api/health/` endpoint. Default: 60.
* **bulk_threads** - Threads count for PATCH `/api/endpoint/` endpoint. Default: 3.
* **session_timeout** - Session life-cycle time. Default: 2w (two weeks).
* **rest_page_limit** and **page_limit** - Default limit of objects in API list. Default: 1000.
* **session_cookie_domain** - The domain to use for session cookies.
  Read :django_docs:`more <settings/#std:setting-SESSION_COOKIE_DOMAIN>`. Default: None.
* **csrf_trusted_origins** - A list of hosts which are trusted origins for unsafe requests.
  Read :django_docs:`more <settings/#csrf-trusted-origins>`. Default: from **session_cookie_domain**.
* **case_sensitive_api_filter** - Enables/disables case sensitive search for name filtering.
  Default: True.

|

The following variables from Django settings are also supported (with the corresponding types):

* **secure_browser_xss_filter** - :django_docs:`SECURE_BROWSER_XSS_FILTER <settings/#secure-browser-xss-filter>`
* **secure_content_type_nosniff** - :django_docs:`SECURE_CONTENT_TYPE_NOSNIFF <settings/#secure-content-type-nosniff>`
* **secure_hsts_include_subdomains** - :django_docs:`SECURE_HSTS_INCLUDE_SUBDOMAINS <settings/#secure-hsts-include-subdomains>`
* **secure_hsts_preload** - :django_docs:`SECURE_HSTS_PRELOAD <settings/#secure-hsts-preload>`
* **secure_hsts_seconds** - :django_docs:`SECURE_HSTS_SECONDS <settings/#secure-hsts-seconds>`
* **password_reset_timeout_days** - :django_docs:`PASSWORD_RESET_TIMEOUT_DAYS <settings/#std:setting-PASSWORD_RESET_TIMEOUT>`
* **request_max_size** - :django_docs:`DATA_UPLOAD_MAX_MEMORY_SIZE <settings/#std:setting-DATA_UPLOAD_MAX_MEMORY_SIZE>`
* **x_frame_options** - :django_docs:`X_FRAME_OPTIONS <settings/#x-frame-options>`
* **use_x_forwarded_host** - :django_docs:`USE_X_FORWARDED_HOST <settings/#use-x-forwarded-host>`
* **use_x_forwarded_port** - :django_docs:`USE_X_FORWARDED_PORT <settings/#use-x-forwarded-port>`

|
|

.. _centrifugo:

Centrifugo client settings
--------------------------

Section ``[centrifugo]``.

For installations with centrifugo client, ``[centrifugo]`` section must be setuped.
Centrifugo is used by application for auto-update mechanism of pages data.
When user change some data, other clients will get notification on ``subscriptions_update`` channel
with model label and primary key. Without the service all GUI-clients will get page data
every 5 seconds (by default).

* **address** - Centrifugo server address.
* **api_key** - API key for clients.
* **token_hmac_secret_key** - API key for jwt-token generation.
* **timeout** - Connection timeout.
* **verify** - Connection verification.

.. note::
    These settings also add parameters to the OpenApi scheme and
    these will change how the auto-update system works in the GUI.
    ``token_hmac_secret_key`` is used for jwt-token generation (based on
    session expiration time). Token will be used for Centrifugo-JS client.

|
|

.. _storages:

Storage settings
----------------

Section ``[storages]``.

Applications based on ``vstutils`` supports filesystem storage out of box.
Setup ``media_root`` and ``media_url`` in ``[storages.filesystem]`` section
to configure custom media dir and relative url. By default it would be
``{/path/to/project/module}/media`` and ``/media/``.

Applications based on ``vstutils`` supports store files in external services
with `Apache Libcloud <http://libcloud.apache.org/>`_. All storages settings
grouped by sections named ``[storages.libcloud.provider]``, where ``provider`` is name
of storage. Each section has four keys: ``type``, ``user``, ``key`` and ``bucket``.
Read more about the settings in
`django-storages docs <https://django-storages.readthedocs.io/en/latest/backends/apache_libcloud.html#libcloud-providers>`_

This setting is required to configure connections to cloud storage providers.
Each entry corresponds to a single ‘bucket’ of storage. You can have multiple
buckets for a single service provider (e.g., multiple S3 buckets), and
you can define buckets at multiple providers.

Once you have defined your Libcloud providers, you have the option of setting
one provider as the default provider of Libcloud storage. You can do it
by setup ``[storages.libcloud.default]`` section or vstutils will set the first storage
as default.

If you configure default libcloud provider, vstutils will use it as global file storage.
You can override it by set ``default=django.core.files.storage.FileSystemStorage`` in ``[storages]``
section.
When ``[storages.libcloud.default]`` is empty ``django.core.files.storage.FileSystemStorage``
will be used as default.
To overriding this behavior set ``default=storages.backends.apache_libcloud.LibCloudStorage``
in ``[storages]`` section and use Libcloud provider as default.

|
|

Production web settings
-----------------------

Section ``[uwsgi]``.

Here placed settings related to web-server used by vstutils-based application in production
(for deb and rpm packages by default). Most of them related to system paths
(logging, PID-file and so on).
More settings in `uWSGI docs
<http://uwsgi-docs.readthedocs.io/en/latest/Configuration.html>`_.

|
|

Configuration options
-----------------------------

This section contains additional information for configure additional elements.

#. If you need set ``https`` for your web settings, you can do it using HAProxy, Nginx, Traefik
   or configure it in ``settings.ini``.

    .. sourcecode:: ini

        [uwsgi]
        addrport = 0.0.0.0:8443,foobar.crt,foobar.key

#. We strictly do not recommend running the web server from root. Use HTTP proxy to run on privileged ports.

#. You can use `{ENV[HOME:-value]}` (where `HOME` is environment variable, `value` is default value)
   in configuration values.
