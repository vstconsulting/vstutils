Configuration manual
====================

Introduction
------------
Though default configuration is suitable for many common cases, vstutils-based
applications is highly configurable system. For advanced settings
(scalability, dedicated DB, custom cache, logging or directories) you can configure
vstutils-based application deeply by tweaking ``/etc/{{app_name or app_lib_name}}/settings.ini``.

The most important thing to keep in mind when planning your application
architecture is that vstutils-based applications have a service-oriented structure.
To build a distributed scalable system you only need to connect to a shared database_,
shared cache_, locks_ and a shared rpc_ service (MQ such as RabbitMQ, Redis, etc.).
A shared file storage may be required in some cases, a but vstutils does not require it.

Let's cover the main sections of the config and its parameters:

|
|

.. _main:

Main settings
-------------

Section ``[main]``.

This section is intended for settings related to whole vstutils-based application
(both worker and web). Here you can specify verbosity level of vstutils-based
application during work, which can be useful for troubleshooting (logging level etc).
Also there are settings for changing timezone for whole app and allowed domains.

To use LDAP protocol, create following settings in section ``[main]``.

.. sourcecode:: bash

    ldap-server = ldap://server-ip-or-host:port
    ldap-default-domain = domain.name
    ldap-auth_format = cn=<username>,ou=your-group-name,<domain>

ldap-default-domain is an optional argument, that is aimed to make user authorization easier
(without input of domain name).

ldap-auth_format is an optional argument, that is aimed to customize LDAP authorization.
Default value: cn=<username>,<domain>

In the example above authorization logic will be the following:

#. System checks combination of login:password in database;

#. System checks combination of login:password in LDAP:

   * if domain was mentioned, it will be set during authorization
     (if user enter login without ``user@domain.name`` or without ``DOMAIN\user`` );

   * if authorization was successful and there is user with entered credentials in database,
     server creates session that user.


* **debug** - Enable debug mode. Default: false.
* **allowed_hosts** - Comma separated list of domains, which allowed to serve. Default: ``*``.
* **first_day_of_week** - Integer value with first day of week. Default: ``0``.
* **ldap-server** - LDAP server connection.
* **ldap-default-domain** - Default domain for auth.
* **ldap-auth_format** - Default search request format for auth. Default: ``cn=<username>,<domain>``.
* **timezone** - Timezone for web-application. Default: UTC.
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

Databases settings
------------------

Section ``[databases]``.

The main section that is designed to manage multiple databases connected
to the project.

These settings are for all databases and are vendor-independent,
with the exception of tablespace management.

* **default_tablespace** - Default tablespace to use for models that don’t specify one, if the backend supports it.
                           Read more at :django_topics:`Declaring tablespaces for tables <db/tablespaces/#declaring-tablespaces-for-tables>`.
* **default_index_tablespace** - Default tablespace to use for indexes on fields that don’t specify one, if the backend supports it.
                                 Read more at :django_topics:`Declaring tablespaces for indexes <db/tablespaces/#declaring-tablespaces-for-indexes>`.
* **databases_without_cte_support** - A comma-separated list of database section names that do not support CTEs (Common Table Experssions).

Also, all subsections of this section are available connections to the DBMS.
So the ``databases.default`` section will be used by django as the default connection.

Here you can change settings related to database, which vstutils-based application will
use. vstutils-based application supports all databases supported by ``django``. List of
supported out of the box: SQLite (default choice), MySQL, Oracle, or
PostgreSQL. Configuration details available at
:django_docs:`Django database documentation <settings/#databases>`.
To run vstutils-based application at multiple nodes (cluster),
use client-server database (SQLite not suitable) shared for all nodes.

You can also set the base template for connecting to the database in the ``database`` section.


|
|

Section ``[database]``.

This section is designed to define the basic template for connections to various databases.
This can be useful to reduce the list of settings in the ``databases.*`` subsections
by setting the same connection for a different set of databases in the project.
For more details read the django docs about :django_topics:`Multiple databases <db/multi-db/#multiple-databases>`

There is a list of settings, required for MySQL database.

Firstly, if you use MariaDB and you have set timezone different from "UTC" you should run
command below:

.. sourcecode:: bash

      mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root -p mysql

Secondly, to use MariaDB set following options in ``settings.ini`` file:

.. sourcecode:: bash

      [database.options]
      connect_timeout = 10
      init_command = SET sql_mode='STRICT_TRANS_TABLES', default_storage_engine=INNODB, NAMES 'utf8', CHARACTER SET 'utf8', SESSION collation_connection = 'utf8_unicode_ci'

Finally, add some options to MariaDB configuration:

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

This section is cache backend related settings used by vstutils-based application.
vstutils supports all cache backends that Django does.
Filesystem, in-memory, memcached are supported out of the box and many others are supported with
additional plugins. You can find details about cache configusupported
:django_docs:`Django caches documentation
<settings/#caches>`. In clusters we advice to share cache between nodes to improve performance
using client-server cache realizations.
We recommend to use Redis in production environments.

|
|

.. _locks:

Locks settings
--------------

Section ``[locks]``.

Locks is a system that vstutils-based application uses to avoid damage from parallel actions
working on the same entity simultaneously. It is based on Django cache, so there is
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
settings are got from cache_.

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

This section require vstutils with `rpc` extra dependency.

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

Celery worker options:

* **loglevel** - Celery worker log level. Default: from main_ section ``log_level``.
* **pidfile** - Celery worker pidfile. Default: ``/run/{app_name}_worker.pid``
* **autoscale** - Options for autoscaling. Two comma separated numbers: max,min.
* **beat** - Enable or disable celery beat scheduler. Default: ``true``.

See other settings via ``celery worker --help`` command.


|
|

.. _mail:

SMTP settings
-----------------

Section ``[mail]``.

Django comes with several email sending backends. With the exception of the SMTP backend
(default when ``host`` is set), these backends are useful only in testing and development.

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

These settings are related to web-server. Those settings includes:
session_timeout, static_files_url and pagination limit.

* **allow_cors** - enable cross-origin resource sharing. Default: ``False``.
* **cors_allowed_origins**, **cors_allowed_origins_regexes**, **cors_expose_headers**, **cors_allow_methods**,
  **cors_allow_headers**, **cors_preflight_max_age** - `Settings <https://github.com/adamchainz/django-cors-headers#configuration>`_
  from ``django-cors-headers`` lib with their defaults.
* **enable_gravatar** - Enable/disable gravatar service using for users. Default: ``True``.
* **rest_swagger_description** - Help string in Swagger schema. Useful for dev-integrations.
* **openapi_cache_timeout** - Cache timeout for storing schema data. Default: ``120``.
* **health_throttle_rate** - Count of requests to ``/api/health/`` endpoint. Default: ``60``.
* **bulk_threads** - Threads count for PATCH ``/api/endpoint/`` endpoint. Default: ``3``.
* **session_timeout** - Session lifetime. Default: ``2w`` (two weeks).
* **etag_default_timeout** - Cache timeout for Etag headers to control models caching. Default: ``1d`` (one day).
* **rest_page_limit** and **page_limit** - Default limit of objects in API list. Default: ``1000``.
* **session_cookie_domain** - The domain to use for session cookies.
  Read :django_docs:`more <settings/#std:setting-SESSION_COOKIE_DOMAIN>`. Default: ``None``.
* **csrf_trusted_origins** - A list of hosts which are trusted origins for unsafe requests.
  Read :django_docs:`more <settings/#csrf-trusted-origins>`. Default: from **session_cookie_domain**.
* **case_sensitive_api_filter** - Enables/disables case sensitive search for name filtering.
  Default: ``True``.
* **secure_proxy_ssl_header_name** - Header name which activates SSL urls in responses.
  Read :django_docs:`more <settings/#secure-proxy-ssl-header>`. Default: ``HTTP_X_FORWARDED_PROTOCOL``.
* **secure_proxy_ssl_header_value** - Header value which activates SSL urls in responses.
  Read :django_docs:`more <settings/#secure-proxy-ssl-header>`. Default: ``https``.

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

To install app with centrifugo client, ``[centrifugo]`` section must be set.
Centrifugo is used by application to auto-update page data.
When user change some data, other clients get notification on ``subscriptions_update`` channel
with model label and primary key. Without the service all GUI-clients get page data
every 5 seconds (by default).

* **address** - Centrifugo server address.
* **api_key** - API key for clients.
* **token_hmac_secret_key** - API key for jwt-token generation.
* **timeout** - Connection timeout.
* **verify** - Connection verification.

.. note::
    These settings also add parameters to the OpenApi schema and change how the auto-update system works in the GUI.
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
with `Apache Libcloud <http://libcloud.apache.org/>`_ and `Boto3 <https://boto3.amazonaws.com/v1/documentation/api/latest/index.html>`_.

Apache Libcloud settings grouped by sections named ``[storages.libcloud.provider]``, where ``provider`` is name
of storage. Each section has four keys: ``type``, ``user``, ``key`` and ``bucket``.
Read more about the settings in
`django-storages libcloud docs <https://django-storages.readthedocs.io/en/latest/backends/apache_libcloud.html#libcloud-providers>`_

This setting is required to configure connections to cloud storage providers.
Each entry corresponds to a single ‘bucket’ of storage. You can have multiple
buckets for a single service provider (e.g., multiple S3 buckets), and
you can define buckets at multiple providers.

For ``Boto3`` all settings grouped by section named ``[storages.boto3]``. Section must contain following keys:
``access_key_id``, ``secret_access_key``, ``storage_bucket_name``.
Read more about the settings in
`django-storages amazon-S3 docs <https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html>`_

Storage has following priority to choose storage engine if multiple was provided:

1. Libcloud store when config contains this section.

2. Boto3 store, when you have section and has all required keys.

3. FileSystem store otherwise.

Once you have defined your Libcloud providers, you have an option of setting
one provider as the default provider of Libcloud storage. You can do it
by setup ``[storages.libcloud.default]`` section or vstutils will set the first storage
as default.

If you configure default libcloud provider, vstutils will use it as global file storage.
To override it set ``default=django.core.files.storage.FileSystemStorage`` in ``[storages]``
section.
When ``[storages.libcloud.default]`` is empty ``django.core.files.storage.FileSystemStorage``
is used as default.
To override it set ``default=storages.backends.apache_libcloud.LibCloudStorage``
in ``[storages]`` section and use Libcloud provider as default.

Here is example for boto3 connection to minio cluster with public read permissions,
external proxy domain and internal connection support:

.. sourcecode:: ini

    [storages.boto3]
    access_key_id = EXAMPLE_KEY
    secret_access_key = EXAMPLEKEY_SECRET
    # connection to internal service behind proxy
    s3_endpoint_url = http://127.0.0.1:9000/
    # external domain to bucket 'media'
    storage_bucket_name = media
    s3_custom_domain = media-api.example.com/media
    # external domain works behind tls
    s3_url_protocol = https:
    s3_secure_urls = true
    # settings to connect as plain http for uploading
    s3_verify = false
    s3_use_ssl = false
    # allow to save files with similar names by adding prefix
    s3_file_overwrite = false
    # disables query string auth and setup default acl as RO for public users
    querystring_auth = false
    default_acl = public-read

|
|

.. _throttle:

Throttle settings
-------------------

Section ``[throttle]``.

By including this section to your config, you can setup global and per-view throttle rates.
Global throttle rates are specified under root [throttle] section.To specify per-view throttle rate, you need to include
child section.

For example, if you want to apply throttle to ``api/v1/author``:

.. sourcecode:: ini

    [throttle.views.author]
    rate=50/day
    actions=create,update

* **rate** - Throttle rate in format number_of_requests/time_period. Expected time_periods: second/minute/hour/day.
* **actions** - Comma separated list of drf actions. Throttle will be applied only on specified here actions. Default: update, partial_update.

More on throttling at `DRF Throttle docs <https://www.django-rest-framework.org/api-guide/throttling/>`_.

|
|

Production web settings
-----------------------

Section ``[uwsgi]``.

Settings related to web-server used by vstutils-based application in production
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

#. You can use environment variables for setup important settings. But config variables has more priority then env.
   Available settings are: ``DEBUG``, ``DJANGO_LOG_LEVEL``, ``TIMEZONE`` and some settings with ``[ENV_NAME]`` prefix.

   For project without special settings and project levels named ``project`` this variables will stars with ``PROJECT_`` prefix.
   There list of this variables: ``{ENV_NAME}_ENABLE_ADMIN_PANEL``, ``{ENV_NAME}_ENABLE_REGISTRATION``, ``{ENV_NAME}_MAX_TFA_ATTEMPTS``,
   ``{ENV_NAME}_ETAG_TIMEOUT``, ``{ENV_NAME}_SEND_CONFIRMATION_EMAIL``, ``{ENV_NAME}_SEND_EMAIL_RETRIES``,
   ``{ENV_NAME}_SEND_EMAIL_RETRY_DELAY``, ``{ENV_NAME}_AUTHENTICATE_AFTER_REGISTRATION``,
   ``{ENV_NAME}_MEDIA_ROOT`` (dir with uploads), ``{ENV_NAME}_GLOBAL_THROTTLE_RATE``,
   and ``{ENV_NAME}_GLOBAL_THROTTLE_ACTIONS``.

   There are also URI-specific variables for connecting to various services such as databases and caches.
   There are ``DATABASE_URL``, ``CACHE_URL``, ``LOCKS_CACHE_URL``, ``SESSIONS_CACHE_URL`` and ``ETAG_CACHE_URL``.
   As you can see from the names, they are closely related to the keys and names of the corresponding config sections.
