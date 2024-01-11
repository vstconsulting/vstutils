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
shared cache_, locks_ and a shared rpc_ service (MQ such as RabbitMQ, Redis, Tarantool, etc.).
A shared file storage may be required in some cases, but vstutils does not require it.

Let's cover the main sections of the config and its parameters:

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
* **ldap-server** - LDAP server connection. For example: ``ldap://your_ldap_server:389``
* **ldap-default-domain** - Default domain for auth.
* **ldap-auth_format** - Default search request format for auth. Default: ``cn=<username>,<domain>``.
* **timezone** - Timezone for web-application. Default: UTC.
* **log_level** - Logging level. The verbosity level, configurable in Django and Celery, dictates the extent of log information,
  with higher levels providing detailed debugging insights for development and lower levels streamlining
  logs for production environments. Default: WARNING.
* **enable_django_logs** - Enable or disable Django logger to output.
  Useful for debugging. Default: false.
* **enable_admin_panel** - Enable or disable Django Admin panel. Default: false.
* **enable_registration** - Enable or disable user self-registration. Default: false.
* **enable_user_self_remove** - Enable or disable user self-removing. Default: false.
* **auth-plugins** - Comma separated list of django authentication backends.
  Authorization attempt is made until the first successful one in order specified in the list.
* **auth-cache-user** - Enable or disable user instance caching. It increases session performance
  on each request but saves model instance in unsafe storage (default django cache).
  The instance is serialized to a string using the :mod:`standard python module pickle <pickle>`
  and then encrypted with :wiki:`Vigenère cipher <Vigenère cipher>`.
  Read more in the :class:`vstutils.utils.SecurePickling` documentation. Default: false.


.. _database:

Databases settings
------------------

Section ``[databases]``.

The main section that is designed to manage multiple databases connected
to the project.

These settings are for all databases and are vendor-independent,
with the exception of tablespace management.

* **default_tablespace** - Default tablespace to use for models that don’t specify one, if the backend supports it.
  A tablespace is a storage location on a database server where the physical data files corresponding to database tables are stored.
  It allows you to organize and manage the storage of your database tables, specifying the location on disk where the table data is stored.
  Configuring tablespaces can be beneficial for various reasons, such as optimizing performance by placing specific tables or indexes (with ``default_index_tablespace``)
  on faster storage devices, managing disk space efficiently, or segregating data for administrative purposes.
  It provides a level of control over the physical organization of data within the database,
  allowing developers to tailor storage strategies based on the requirements and characteristics of their application.
  Read more at :django_topics:`Declaring tablespaces for tables <db/tablespaces/#declaring-tablespaces-for-tables>`.

* **default_index_tablespace** - Default tablespace to use for indexes on fields that don’t specify one, if the backend supports it.
  Read more at :django_topics:`Declaring tablespaces for indexes <db/tablespaces/#declaring-tablespaces-for-indexes>`.

* **databases_without_cte_support** - A comma-separated list of database section names that do not support CTEs (Common Table Expressions).


.. warning::
    Although MariaDB supports Common Table Expressions, but database connected to MariaDB still needs
    to be added to ``databases_without_cte_support`` list.
    The problem is that the implementation of recursive queries in the MariaDB does not allow using it in a standard form.
    MySQL (since 8.0) works as expected.

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



Section ``[database]``.

This section is designed to define the basic template for connections to various databases.
This can be useful to reduce the list of settings in the ``databases.*`` subsections
by setting the same connection for a different set of databases in the project.
For more details read the django docs about :django_topics:`Multiple databases <db/multi-db/#multiple-databases>`

There is a list of settings, required for MySQL/MariaDB database.

Firstly, if you use MySQL/MariaDB and you have set timezone different from "UTC" you should run
command below:

.. sourcecode:: bash

      mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root -p mysql

Secondly, to use MySQL/MariaDB set following options in ``settings.ini`` file:

.. sourcecode:: bash

      [database.options]
      connect_timeout = 10
      init_command = SET sql_mode='STRICT_TRANS_TABLES', default_storage_engine=INNODB, NAMES 'utf8', CHARACTER SET 'utf8', SESSION collation_connection = 'utf8_unicode_ci'

Finally, add some options to MySQL/MariaDB configuration:

.. sourcecode:: bash

      [client]
      default-character-set=utf8
      init_command = SET collation_connection = @@collation_database

      [mysqld]
      character-set-server=utf8
      collation-server=utf8_unicode_ci


.. _cache:

Cache settings
--------------

Section ``[cache]``.

This section is cache backend related settings used by vstutils-based application.
vstutils supports all cache backends that Django does.
Filesystem, in-memory, memcached are supported out of the box and many others are supported with
additional plugins. You can find details about cache configs supported
:django_docs:`Django caches documentation
<settings/#caches>`. In clusters we advice to share cache between nodes to improve performance
using client-server cache realizations.
We recommend to use Redis in production environments.

Tarantool Cache Backend for Django
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The ``TarantoolCache`` is a custom cache backend for Django that allows you to use Tarantool as a caching mechanism.
To use this backend, you need to configure the following settings in your project's configuration:

.. sourcecode:: bash

    [cache]
    location = localhost:3301
    backend = vstutils.drivers.cache.TarantoolCache

    [cache.options]
    space = default
    user = guest
    password = guest

Explanation of Settings:

* **location** - The host name and port for connecting to the Tarantool server.
* **backend** - The path to the TarantoolCache backend class.
* **space** - The name of the space in Tarantool to use as the cache (default is ``DJANGO_CACHE``).
* **user** - The username for connecting to the Tarantool server (default is ``guest``).
* **password** - The password for connecting to the Tarantool server. Optional.

Additionally, you can set the ``connect_on_start`` variable in the ``[cache.options]`` section.
When set to ``true`` value, this variable triggers an initial connection to the Tarantool server
to configure spaces and set up the service for automatic removal of outdated entries.

.. warning::
    Note that this requires the ``expirationd`` module to be installed on the Tarantool server.

.. note::
    When utilizing Tarantool as a cache backend in VST Utils, temporary spaces are automatically created to facilitate seamless operation.
    These temporary spaces are dynamically generated as needed and are essential for storing temporary data efficiently.

    It's important to mention that while temporary spaces are automatically handled, if you intend to use persistent spaces on disk,
    it is necessary to pre-create them on the Tarantool server with schema settings similar to those used by the VST Utils configuration.
    Ensure that any persistent spaces required for your application are appropriately set up on the Tarantool server
    with the same schema configurations for consistent and reliable operation.

.. note::
    It's important to note that this cache driver is unique to vstutils and tailored to seamlessly
    integrate with the VST Utils framework.


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
to use Tarantool, Redis or Memcached as backend because they have enough speed for this purposes.
Cache and locks backend can be the same, but don't forget about requirement we said above.


.. _session:

Session cache settings
----------------------

Section ``[session]``.

vstutils-based application store sessions in database_, but for better performance,
we use a cache-based session backend. It is based on Django cache, so there is
another bunch of same settings as cache_. By default,
settings are got from cache_.


.. _rpc:

Rpc settings
------------

Section ``[rpc]``.

Celery is a distributed task queue system for handling asynchronous tasks in web applications.
Its primary role is to facilitate the execution of background or time-consuming tasks independently from the main application logic.
Celery is particularly useful for offloading tasks that don't need to be processed immediately, improving the overall responsiveness and performance of an application.

Key features and roles of Celery in an application with asynchronous tasks include:

#. Asynchronous Task Execution: Celery allows developers to define tasks as functions or methods and execute them asynchronously. This is beneficial for tasks that might take a considerable amount of time, such as sending emails, processing data, or generating reports.
#. Distributed Architecture: Celery operates in a distributed manner, making it suitable for large-scale applications. It can distribute tasks across multiple worker processes or even multiple servers, enhancing scalability and performance.
#. Message Queue Integration: Celery relies on message brokers (such as RabbitMQ, Redis, Tarantool, SQS or others) to manage the communication between the main application and the worker processes. This decoupling ensures reliable task execution and allows for the efficient handling of task queues.
#. Periodic Tasks: Celery includes a scheduler that enables the execution of periodic or recurring tasks. This is useful for automating tasks that need to run at specific intervals, like updating data or performing maintenance operations.
#. Error Handling and Retry Mechanism: Celery provides mechanisms for handling errors in tasks and supports automatic retries. This ensures robustness in task execution, allowing the system to recover from transient failures.
#. Task Result Storage: Celery supports storing the results of completed tasks, which can be useful for tracking task progress or retrieving results later. This feature is especially valuable for long-running tasks.

vstutils-based application uses Celery for long-running async tasks.
Those settings relate to this broker
and Celery itself. Those kinds of settings: broker backend, number of
worker-processes per node and some settings used for troubleshoot
server-broker-worker interaction problems.

This section require vstutils with `rpc` extra dependency.

* **connection** - Celery :celery_docs:`broker connection <userguide/configuration.html#conf-broker-settings>`. Default: ``filesystem:///var/tmp``.
* **concurrency** - Count of celery worker threads. Default: 4.
* **heartbeat** - Interval between sending heartbeat packages, which says that connection still alive. Default: 10.
* **enable_worker** - Enable or disable worker with webserver. Default: true.

The following variables from :celery_docs:`Django settings <userguide/configuration.html#new-lowercase-settings>`
are also supported (with the corresponding types):

* **prefetch_multiplier** - :celery_docs:`CELERYD_PREFETCH_MULTIPLIER <userguide/configuration.html#std-setting-worker_prefetch_multiplier>`
* **max_tasks_per_child** - :celery_docs:`CELERYD_MAX_TASKS_PER_CHILD <userguide/configuration.html#std-setting-worker_max_tasks_per_child>`
* **results_expiry_days** - :celery_docs:`CELERY_RESULT_EXPIRES <userguide/configuration.html#std-setting-result_expires>`
* **default_delivery_mode** - :celery_docs:`CELERY_DEFAULT_DELIVERY_MODE <userguide/configuration.html#task-default-delivery-mode>`
* **task_send_sent_event** - :celery_docs:`CELERY_DEFAULT_DELIVERY_MODE <userguide/configuration.html#task_send_sent_event>`
* **worker_send_task_events** - :celery_docs:`CELERY_DEFAULT_DELIVERY_MODE <userguide/configuration.html#worker_send_task_events>`

VST Utils provides seamless support for using Tarantool as a transport for Celery, allowing efficient and reliable message passing between distributed components.
To enable this feature, ensure that the Tarantool server has the `queue` and `expirationd` modules installed.

To configure the connection, use the following example URL: ``tarantool://guest@localhost:3301/rpc``

* ``tarantool://``: Specifies the transport.
* ``guest``: Authentication parameters (in this case, no password).
* ``localhost``: Server address.
* ``3301``: Port for connection.
* ``rpc``: Prefix for queue names and/or result storage.

VST Utils also supports Tarantool as a backend for storing Celery task results. Connection string is similar to the transport.

.. note::
    When utilizing Tarantool as a result backend or transport in VST Utils, temporary spaces and queues are automatically created to facilitate seamless operation.
    These temporary spaces are dynamically generated as needed and are essential for storing temporary data efficiently.

    It's important to mention that while temporary spaces are automatically handled, if you intend to use persistent spaces on disk,
    it is necessary to pre-create them on the Tarantool server with schema settings similar to those used by the VST Utils configuration.
    Ensure that any persistent spaces required for your application are appropriately set up on the Tarantool server
    with the same schema configurations for consistent and reliable operation.

.. _worker:

Worker settings
---------------

Section ``[worker]``.

.. warning::
    These settings are needed only for rpc-enabled applications.

Celery worker options:

* **loglevel** - Celery worker log level. Default: from main_ section ``log_level``.
* **pidfile** - Celery worker pidfile. Default: ``/run/{app_name}_worker.pid``
* **autoscale** - Options for autoscaling. Two comma separated numbers: max,min.
* **beat** - Enable or disable celery beat scheduler. Default: ``true``.

See other settings via ``celery worker --help`` command.



.. _mail:

SMTP settings
-----------------

Section ``[mail]``.

Django comes with several email sending backends. With the exception of the SMTP backend
(default when ``host`` is set), these backends are useful only in testing and development.

Applications based on vstutils uses only ``smtp`` and ``console`` backends.
These two backends serve distinct purposes in different environments.
The SMTP backend ensures the reliable delivery of emails in a production setting,
while the console backend provides a convenient way to inspect emails during development without the risk of unintentional communication with external mail servers.
Developers often switch between these backends based on the context of their work, choosing the appropriate one for the stage of development or testing.

* **host** - IP or domain for smtp-server. If it not set vstutils uses ``console`` backends. Default: ``None``.
* **port** - Port for smtp-server connection. Default: ``25``.
* **user** - Username for smtp-server connection. Default: ``""``.
* **password** - Auth password for smtp-server connection. Default: ``""``.
* **tls** - Enable/disable tls for smtp-server connection. Default: ``False``.
* **send_confirmation** - Enable/disable confirmation message after registration. Default: ``False``.
* **authenticate_after_registration** - Enable/disable autologin after registration confirmation. Default: ``False``.


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

The following settings affects prometheus metrics endpoint (which can be used for monitoring application):

* **metrics_throttle_rate** - Count of requests to ``/api/metrics/`` endpoint. Default: ``120``.
* **enable_metrics** - Enable/disable ``/api/metrics/`` endpoint for app. Default: ``true``
* **metrics_backend** - Python class path with metrics collector backend. Default: ``vstutils.api.metrics.DefaultBackend``
  Default backend collects metrics from uwsgi workers and python version info.


Section ``[uvicorn]``.

You can configure the necessary settings to run the uvicorn server.
``vstutils`` supports almost all options from the cli, except for those that configure the application and connection.

See all available uvicorn settings via ``uvicorn --help`` command.

.. _centrifugo:

Centrifugo client settings
--------------------------

Section ``[centrifugo]``.

Centrifugo is employed to optimize real-time data updates within a Django application by orchestrating seamless communication among its various components.
The operational paradigm involves the orchestrated generation of Django signals, specifically ``post_save`` and ``post_delete`` signals,
dynamically triggered during HTTP requests or the execution of Celery tasks.
These signals, when invoked on user or BaseModel-derived models within the vstutils framework,
initiate the creation of messages destined for all subscribers keen on the activities related to these models.
Subsequent to the completion of the HTTP request or Celery task,
the notification mechanism dispatches tailored messages to all relevant subscribers.
In effect, each active browser tab with a pertinent subscription promptly receives a notification,
prompting an immediate data update request.
Centrifugo's pivotal role lies in obviating the necessity for applications to engage in periodic REST API polling at fixed intervals (e.g., every 5 seconds).
This strategic elimination of redundant requests significantly alleviates the REST API's operational load,
rendering it more scalable to accommodate a larger user base.
Importantly, this real-time communication model ensures prompt and synchronized data updates, fostering a highly responsive user experience.

To install app with centrifugo client, ``[centrifugo]`` section must be set.
Centrifugo is used by application to auto-update page data.
When user change some data, other clients get notification on channel
with model label and primary key. Without the service all GUI-clients get page data
every 5 seconds (by default).

* **address** - Centrifugo server address.
* **api_key** - API key for clients.
* **token_hmac_secret_key** - API key for jwt-token generation.
* **timeout** - Connection timeout.
* **verify** - Connection verification.
* **subscriptions_prefix** - Prefix used for generating update channels, by default "{VST_PROJECT}.update".

.. note::
    These settings also add parameters to the OpenAPI schema and change how the auto-update system works in the GUI.
    ``token_hmac_secret_key`` is used for jwt-token generation (based on
    session expiration time). Token will be used for Centrifugo-JS client.


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


Production web settings
-----------------------

Section ``[uwsgi]``.

Settings related to web-server used by vstutils-based application in production
(for deb and rpm packages by default). Most of them related to system paths
(logging, PID-file and so on).
More settings in `uWSGI docs
<http://uwsgi-docs.readthedocs.io/en/latest/Configuration.html>`_.

But keep in mind that uWSGI is deprecated and may be removed in future releases.
Use the uvicorn settings to manage your app server.


Working behind the proxy server with TLS
----------------------------------------

Nginx
~~~~~

To configure vstutils for operation behind Nginx with TLS, follow these steps:

1. **Install Nginx:**

Ensure that Nginx is installed on your server. You can install it using the package manager specific to your operating system.

2. **Configure Nginx:**

Create an Nginx configuration file for your vstutils application.
Below is a basic example of an Nginx configuration. Adjust the values based on your specific setup.

.. sourcecode:: nginx

    server {
        listen 80;
        server_name your_domain.com;

        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name your_domain.com;

        ssl_certificate /path/to/your/certificate.crt;
        ssl_certificate_key /path/to/your/private.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384';

        gzip            on;
        gzip_types      text/plain application/xml application/json application/openapi+json text/css application/javascript;
        gzip_min_length 1000;

        charset utf-8;

        location / {
            proxy_pass http://127.0.0.1:8080;  # Assuming application is running on the default port
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;  # Set to 'https' since it's a secure connection
            proxy_set_header X-Forwarded-Host   $host;
            proxy_set_header X-Forwarded-Port   $server_port;
        }
    }


Replace ``your_domain.com`` with your actual domain, and update the paths for SSL certificates.

3. **Update vstutils settings:**

Ensure that your vstutils settings have the correct configurations for HTTPS. In your ``/etc/vstutils/settings.ini`` (or project ``settings.ini``):

.. sourcecode:: ini

    [web]
    secure_proxy_ssl_header_name = HTTP_X_FORWARDED_PROTO
    secure_proxy_ssl_header_value = https

This ensures that vstutils recognizes the HTTPS connection.

4. **Restart Nginx:**

After making these changes, restart Nginx to apply the new configurations:

.. sourcecode:: bash

    sudo systemctl restart nginx

Now, your vstutils application should be accessible via HTTPS through Nginx. Adjust these instructions based on your specific environment and security considerations.


Traefik
~~~~~~~

To configure vstutils for operation behind Traefik with TLS, follow these steps:

1. **Install Traefik:**

Ensure that Traefik is installed on your server. You can download the binary from the official website or use a package manager specific to your operating system.

2. **Configure Traefik:**

Create a Traefik configuration file ``/path/to/traefik.toml``. Here's a basic example:

.. sourcecode:: toml
    [experimental]
      http3 = true

    [entryPoints]
      [entryPoints.web]
        address = ":80"
      [entryPoints.web.http.redirections]
        [entryPoints.web.http.redirections.entryPoint]
          to = "websecure"

      [entryPoints.websecure]
        address = ":443"
        http3: {}

    [api]

    [providers.file]
      filename = "/path/to/traefik_config.toml"

3. **Create Traefik Toml Configuration:**

Create the ``/path/to/traefik_config.toml`` file with the following content:

.. sourcecode:: toml

    [http.routers]
      [http.routers.vstutils]
        rule = "Host(`your_domain.com`)"
        entryPoints = ["websecure"]
        service = "vstutils"
        middlewares = ["customheaders", "compress"]

    [http.middlewares]
      [http.middlewares.customheaders.headers.customRequestHeaders]
        X-Forwarded-Proto = "https"

      [http.middlewares.compress.compress]
        compress = true

    [http.services]
      [http.services.vstutils.loadBalancer]
        [[http.services.vstutils.loadBalancer.servers]]
          url = "http://127.0.0.1:8080"  # Assuming application is running on the default port

Make sure to replace ``your_domain.com`` with your actual domain.

4. **Update vstutils settings:**

Ensure that your vstutils settings have the correct configurations for HTTPS. In your ``/etc/vstutils/settings.ini`` (or project ``settings.ini``):

.. sourcecode:: ini
    [web]
    secure_proxy_ssl_header_name = HTTP_X_FORWARDED_PROTO
    secure_proxy_ssl_header_value = https

5. **Start Traefik:**

Start Traefik with the following command:

.. sourcecode:: bash

    traefik --configfile /path/to/traefik.toml

Now, your vstutils application should be accessible via HTTPS through Traefik. Adjust these instructions based on your specific environment and requirements.


HAProxy
~~~~~~~

1. **Install HAProxy:**

Ensure that HAProxy is installed on your server. You can install it using the package manager specific to your operating system.

2. **Configure HAProxy:**

Create an HAProxy configuration file for your vstutils application. Below is a basic example of an HAProxy configuration. Adjust the values based on your specific setup.

.. sourcecode:: haproxy

    frontend http-in
        bind *:80
        mode http
        redirect scheme https code 301 if !{ ssl_fc }

    frontend https-in
        bind *:443 ssl crt /path/to/your/certificate.pem
        mode http
        option forwardfor
        http-request set-header X-Forwarded-Proto https

        default_backend vstutils_backend

    backend vstutils_backend
        mode http
        server vstutils-server 127.0.0.1:8080 check

Replace ``your_domain.com`` with your actual domain and update the paths for SSL certificates.

3. **Update vstutils settings:**

Ensure that your vstutils settings have the correct configurations for HTTPS. In your ``/etc/vstutils/settings.ini`` (or project ``settings.ini``):

.. sourcecode:: ini
    [web]
    secure_proxy_ssl_header_name = HTTP_X_FORWARDED_PROTO
    secure_proxy_ssl_header_value = https

4. **Restart HAProxy:**

After making these changes, restart HAProxy to apply the new configurations:

.. sourcecode:: bash

    sudo systemctl restart haproxy

Now, your vstutils application should be accessible via HTTPS through HAProxy. Adjust these instructions based on your specific environment and security considerations.


Configuration options
-----------------------------

This section contains additional information for configure additional elements.

#. If you need set ``https`` for your web settings, you can do it using HAProxy, Nginx, Traefik
   or configure it in ``settings.ini``.

.. sourcecode:: ini

    [uwsgi]
    addrport = 0.0.0.0:8443

    [uvicorn]
    ssl_keyfile = /path/to/key.pem
    ssl_certfile = /path/to/cert.crt

#. We strictly do not recommend running the web server from root. Use HTTP proxy to run on privileged ports.

#. You can use `{ENV[HOME:-value]}` (where `HOME` is environment variable, `value` is default value)
   in configuration values.

#. You can use environment variables for setup important settings. But config variables has more priority then env.
   Available settings are: ``DEBUG``, ``DJANGO_LOG_LEVEL``, ``TIMEZONE`` and some settings with ``[ENV_NAME]`` prefix.

   For project without special settings and project levels named ``project`` these variables will start with ``PROJECT_`` prefix.
   There is a list of these variables: ``{ENV_NAME}_ENABLE_ADMIN_PANEL``, ``{ENV_NAME}_ENABLE_REGISTRATION``, ``{ENV_NAME}_MAX_TFA_ATTEMPTS``,
   ``{ENV_NAME}_ETAG_TIMEOUT``, ``{ENV_NAME}_SEND_CONFIRMATION_EMAIL``, ``{ENV_NAME}_SEND_EMAIL_RETRIES``,
   ``{ENV_NAME}_SEND_EMAIL_RETRY_DELAY``, ``{ENV_NAME}_AUTHENTICATE_AFTER_REGISTRATION``,
   ``{ENV_NAME}_MEDIA_ROOT`` (dir with uploads), ``{ENV_NAME}_GLOBAL_THROTTLE_RATE``,
   and ``{ENV_NAME}_GLOBAL_THROTTLE_ACTIONS``.

   There are also URI-specific variables for connecting to various services such as databases and caches.
   There are ``DATABASE_URL``, ``CACHE_URL``, ``LOCKS_CACHE_URL``, ``SESSIONS_CACHE_URL`` and ``ETAG_CACHE_URL``.
   As you can see from the names, they are closely related to the keys and names of the corresponding config sections.

#. We recommend to install ``uvloop`` to your environment and setup ``loop = uvloop`` in ``[uvicorn]`` section for performance reasons.

In the context of vstutils, the adoption of ``uvloop`` is paramount for optimizing the performance of the application, especially because utilizing ``uvicorn`` as the ASGI server.
``uvloop`` is an ultra-fast, drop-in replacement for the default event loop provided by Python.
It is built on top of ``libuv``, a high-performance event loop library, and is specifically designed to optimize the execution speed of asynchronous code.

By leveraging ``uvloop``, developers can achieve substantial performance improvements in terms of reduced latency and increased throughput.
This is especially critical in scenarios where applications handle a large number of concurrent connections.
The improved efficiency of event loop handling directly translates to faster response times and better overall responsiveness of the application.
