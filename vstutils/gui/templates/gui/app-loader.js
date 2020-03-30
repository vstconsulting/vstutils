// {% load request_static %}
// {% block resource_list %}
let resourceList = [
    // {% for file in static_files_list %}
    { priority: Number('{{ file.priority }}'), type: '{{ file.type }}', name: '{% static file.name %}?v={{gui_version}}'},
    // {% endfor %}
];
// {% endblock %}

// Registers Service Worker
if ('serviceWorker' in navigator && (!localStorage['gui_version'] || localStorage['gui_version'] === gui_version)) {
    navigator.serviceWorker.register("/service-worker.js")
        .then(registration => {
            registration.update();
        }).catch(error => {
        console.error('Service Worker registration failed with ' + error);
    });
};

/**
 * Function, that cleans files cache, unregisters current Service Worker instance and reloads page.
 */
function cleanAllCacheAndReloadPage() {
    function cleanServiceWorkerCache() {
        if ('caches' in window) {
            window.caches.keys().then(keyList => {
                keyList.forEach(key => {
                    window.caches.delete(key);
                });
            });
        };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                if (registrations.length == 0) {
                    window.location.reload(true);
                };

                let promises = registrations.map(registration => registration.unregister());

                Promise.all(promises).finally(response => {
                    window.location.reload(true);
                });
            });
        } else {
            window.location.reload(true);
        };
    };

    guiCache.deleteAllCache().finally(res => cleanServiceWorkerCache());
};

/**
 * Function, that removes OpenAPI schema from gui cache and reloads page.
 */
function cleanOpenApiCacheAndReloadPage() {
    guiCache.delFile("openapi").finally(res => {window.location.reload(true)});
};

/**
 * Handler for window.onerror event, that should be called during app dependencies loading,
 * if some error occurred in content of loaded files.
 * @param {object} event Error event.
 */
function onLoadingErrorHandler(event) {
    if(depsLoader && depsLoader.appendError &&
        typeof depsLoader.appendError == "function") {
        depsLoader.appendError(event.error);
    } else {
        throw event.error;
    }
};

/**
 * Function creates DOM element and sets it attributes and props.
 * @param {string} type Type (tag) of DOM element.
 * @param {array} attributes Array of objects -
 * DOM element attributes(key, value).
 * @param {object} props Object with properties of DOM element.
 */
function createDomElement(type, attributes, props) {
    let el = document.createElement(type);

    attributes.forEach(attr => {
        el.setAttribute(attr.key, attr.value);
    });

    for(let key in props) {
        if(typeof props[key] === "object" && key === "style") {
            for(let stl in props[key]) {
                if(!props[key].hasOwnProperty(stl)) {
                    continue;
                };
                el[key][stl] = props[key][stl];
            };
        } else {
            el[key] = props[key];
        };
    };

    return el;
};

/**
 * Function saves to the Local Storage values of global gui versions variables.
 */
function updateGuiVersionsInLocalStorage() {
    localStorage['gui_version'] = gui_version;
    localStorage['gui_user_version'] = gui_user_version;
};

/**
 * Class, that is responsible for setting/getting files' content (strings, json - transformed to string) to/from cache.
 * In current realization of VST Utils cache is stored in the indexedDB.
 * More about indexedDB:
 * - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Concepts_Behind_IndexedDB
 * - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 */
class FilesCache {
    /**
     * Constructor of FilesCache class.
     * @param {object} opt Object with options for FilesCache instance.
     */
    constructor(opt={}) {
        this.indexed_db = window.indexedDB || window.mozIndexedDB ||
            window.webkitIndexedDB || window.msIndexedDB;
        this.db_name = "cache_" + ("{{host_url}}".replace(/[^0-9A-z]/img, "_")) + "__";
        this.db_version = 1;
        this.store_name = "cache_store";

        for(let key in opt) {
            this[key] = opt[key];
        };
    };
    /**
     * Method, that returns promise of getting connection to FilesCache instance's database.
     */
    connectDB() {
        return new Promise((resolve, reject) => {
            let request = this.indexed_db.open(this.db_name, this.db_version);

            request.onerror = (err) => {
                console.error("Error in FilesCache.connectDB().", err);
                reject(err);
            };

            request.onsuccess = (event) => {
                let db = event.target.result;

                db.onerror = function(event) {
                    console.log('indexedDB - db.onerror ', event);
                };

                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                let db = event.target.result;
                db.createObjectStore(
                    this.store_name, { keyPath: "path", autoIncrement: true }
                );
                this.connectDB().then(resolve, reject)
            };
        });
    };
    /**
     * Method, that returns promise to get file from FilesCache instance's database.
     * @param {string} file_name Name of file.
     */
    getFile(file_name) {
        return new Promise((resolve, reject) => {
            this.connectDB().then(db => {
                let transaction = db.transaction([this.store_name], "readonly");
                let request = transaction.objectStore(this.store_name).get(file_name);

                transaction.oncomplete = function(event) {
                    db.close();
                };

                request.onerror = (err) => {
                    console.error("Error in FilesCache.getFile()", err);
                    reject(err);
                };

                request.onsuccess = () => {
                    if(!request.result) {
                        reject();
                        return;
                    };

                    resolve(request.result ? request.result : -1);
                };
            });
        });
    };
    /**
     * Method, that returns promise to save file in FilesCache instance's database.
     * @param {string} file_name Name of file.
     * @param {string} file_data Content of file.
     */
    setFile(file_name, file_data) {
        return new Promise((resolve, reject) => {
            this.connectDB().then(db => {
                let transaction = db.transaction([this.store_name],"readwrite");
                transaction.oncomplete = (event) => {
                    db.close();
                };

                transaction.onerror = (event) => {
                    console.error("Error in FilesCache.setFile().", event);
                };

                let objectStore = transaction.objectStore(this.store_name);

                let request = objectStore.put({path: file_name, data: file_data});

                request.onerror = (err) => {
                    console.error("Error in FilesCache.setFile()", err);
                    reject(err);
                };

                request.onsuccess = () => {
                    if(!request.result) {
                        reject();
                        return;
                    };
                    resolve(request.result ? request.result : -1);
                };
            });
        });
    };
    /**
     * Method, that returns promise to delete file from FilesCache instance's database.
     */
    delFile(file_name) {
        return new Promise((resolve, reject) => {
            this.connectDB().then(db => {
                let transaction = db.transaction([this.store_name],"readwrite");
                transaction.oncomplete = (event) => {
                    db.close();
                };

                transaction.onerror = (event) => {
                    console.error("Error in FilesCache.delFile()", event);
                };

                let objectStore = transaction.objectStore(this.store_name);
                let request = objectStore.delete(file_name);

                request.onerror = (err) => {
                    console.error("Error in FilesCache.detFile()", err);
                    reject(err);
                };

                request.onsuccess = () => {
                    resolve(true);
                }
            });
        });
    };
    /**
     * Method, that returns promise to delete all files from FilesCache instance's database
     * (delete FilesCache instance's database).
     */
    deleteAllCache() {
        return new Promise((resolve, reject) => {
            let DBDeleteRequest = this.indexed_db.deleteDatabase(this.db_name);

            DBDeleteRequest.onerror = (event) => {
                console.error("Error during 'deleteAllCache' method execution. ", event);
                reject(event);
            };

            DBDeleteRequest.onblocked = (event) => {
                resolve(event);
            };

            DBDeleteRequest.onsuccess = (event) => {
                resolve(event);
            };
        });
    };
};

/**
 * Class, that is responsible for loading of App dependencies (OpenAPI schema, static files) and appending them to the page.
 * Also this class has methods for creating and adding to the page 'Loader block' -
 * DOM element, that collects loading logs and shows status of app dependencies loading.
 * This class loads only app's dependencies, it does not create/load app instance.
 */
class AppDependenciesLoader {
    /**
     * Constructor of AppDependenciesLoader Class.
     */
    constructor(resource_list, cache) {
        /**
         * Object, that has methods for loading of OpenAPI schema.
         */
        this.openApiLoader = new OpenApiLoader(cache);
        /**
         * Object, that has methods for loading of static files (js, css, tpl) and appending them to the page.
         */
        this.filesLoader = new StaticFilesLoader(resource_list);
        /**
         * Boolean property, that means is loader loading files right now or not?
         */
        this.loading = false;
        /**
         * Array, that collects errors occurred during files/app loading.
         */
        this.errors = [];
    };
    /**
     * Method creates and adds to the page root DOM element,
     * that will show loading status and collect loading logs.
     * This DOM element has children elements:
     * - loading status;
     * - loading progress bar;
     * - reload cache button;
     * - project info table (will be shown only if some error occurs);
     * - loading logs wrapper (will be shown only if some error occurs).
     */
    addLoaderBlockToPage() {
        let styles = "#LoadingProgressBar ::-webkit-scrollbar{width:0}#LoadingProgressBar{background:#ecf0f5;width:100%;height:100%;position:fixed;top:0;left:0;z-index:2000}#LoadingProgressBar .loadWrapper{width:200px;height:7px;position:absolute;top:155px;left:50%;transform:translate(-50%,-50%);background:#e0e0e0;border-radius:7px}#LoadingProgressBar .loadProgress{position:absolute;top:0;left:0;border-radius:7px;background:#3f51b5;height:100%;transition:all .1s ease-out}#LoadingProgressBar .operation,#LoadingProgressBar .status,#LoadingProgressBar .titleP,.LoadingProgressBar-logger-wrapper,.loadInfoWrapper a{position:absolute;left:50%;font-family:'Ubuntu Mono',monospace}#LoadingProgressBar .operation,#LoadingProgressBar .status{transform:translate(-50%,-45%);color:#607d8b}#LoadingProgressBar .operation{top:110px}#LoadingProgressBar .status{top:135px}#LoadingProgressBar .statusCont{font-family:'Ubuntu Mono',monospace}#LoadingProgressBar .titleP{top:30px;transform:translate(-50%,25%);color:#3f51b5;text-transform:uppercase;font-size:30px;margin-top:20px;margin-bottom:10px;font-weight:500;line-height:1.1;margin:.67em 0;box-sizing:border-box}.loadInfoWrapper a{border-radius:7px;padding:5px 15px;background-color:#e0e0e0;top:160px;transform:translate(-50%,25%);color:#3f51b5;text-transform:uppercase;text-decoration:none;box-sizing:border-box;font-weight:400;font-size:14px}.loadInfoWrapper a:hover{background-color:#d0d0d0}@media (max-width:360px){.loadInfoWrapper a{padding:7px 10px}}.LoadingProgressBar-logger-wrapper{top:230px;transform:translate(-50%,0);font-size:12px;font-weight:500;line-height:1.1;box-sizing:border-box;padding:0;margin:0 auto;width:90vw;height:calc(100vh - 256px);background-color:#dedede;overflow:scroll}.LoadingProgressBar-logger-wrapper h3{font-size:18px}.LoadingProgressBar-logger-wrapper h4{font-size:16px}.LoadingProgressBar-logger-wrapper h5{font-size:14px}.LoadingProgressBar-error{margin:0;padding:10px 0;color:#b53f3f;white-space:pre-wrap;white-space:-moz-pre-wrap;white-space:-o-pre-wrap;word-wrap:break-word}.LoadingProgressBar-success{margin:0;padding:0;color:green;white-space:pre-wrap;white-space:-moz-pre-wrap;white-space:-o-pre-wrap;word-wrap:break-word}.LoadingProgressBar-error-msg{color:#b53f3f}.loadInfoWrapper.need-reload span{animation-name:blinker;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(1,-.75,0,2.08);animation-duration:1s;color:red;font-weight:700}@keyframes blinker{from{opacity:1}to{opacity:.3}}#loading_logs_table th{text-align:left}#loading_logs_table td{padding-left:10px}";
        let loaderBlock = createDomElement("div", [], {id: "LoadingProgressBar"});
        let titleBlock = createDomElement("h1", [], {className: "titleP", innerText: "{{project_gui_name}}"});
        let loadingOperation = createDomElement("div", [], {className: "operation"});
        loadingOperation.appendChild(createDomElement("div", [], {id: "LoadingProgressBarOperation", className: "statusCont", innerText: "loading files"}));
        let loadingStatus = createDomElement("div", [], {className: "status"});
        loadingStatus.appendChild(createDomElement("div", [], {id: "LoadingProgressBarCount", className: "statusCont"}));
        let loadingProgressBarLine = createDomElement("div", [], {className: "loadWrapper"});
        loadingProgressBarLine.appendChild(createDomElement("div", [], {id: "LoadingProgressBarLine", className: "loadProgress"}));

        loaderBlock.appendChild(createDomElement("style", [], {innerHTML: styles}));
        loaderBlock.appendChild(titleBlock);
        loaderBlock.appendChild(loadingOperation);
        loaderBlock.appendChild(loadingStatus);
        loaderBlock.appendChild(loadingProgressBarLine);

        let reloadButton = createDomElement("div", [], {className: "loadInfoWrapper"});
        let reloadButtonLink = createDomElement("a", [], {href: "#", onclick: () => {cleanAllCacheAndReloadPage(); return false;}});
        reloadButtonLink.appendChild(createDomElement("span", [], {innerText: "Reload all cache"}));
        reloadButton.appendChild(reloadButtonLink);
        loaderBlock.appendChild(reloadButton);

        loaderBlock.appendChild(this.formLogsWrapper());
        document.body.appendChild(loaderBlock);
    };
    /**
     * Method, that forms DOM elements, which will store loading logs.
     * @returns {HTMLElement}
     */
    formLogsWrapper() {
        let wrapper = createDomElement("div", [], {className: "LoadingProgressBar-logger-wrapper", style: {display: "none"}});
        wrapper.appendChild(createDomElement("h3", [], {innerText: "Loading logger", style: {textAlign: "center"}}));
        wrapper.appendChild(createDomElement("h4", [], {className: "LoadingProgressBar-error-msg", innerText: "Some errors occurred during app loading", style: {textAlign: "center", display: "none"}}));
        wrapper.appendChild(createDomElement("h5", [], {innerText: "Project info"}));
        wrapper.appendChild(this.formProjectInfoTable());
        wrapper.appendChild(createDomElement("h5", [], {innerText: "Logs"}));
        return wrapper;
    };
    /**
     * Method forms DOM element - table, that stores info about project.
     * @returns {HTMLElement}
     */
    formProjectInfoTable() {
        let tableData = [
            {
                title: "Project name",
                value: "{{project_gui_name}}",
            },
            {
                title: "Project Version",
                value: "{{project_version}}",
            },
            {
                title: "Gui Version",
                value: "{{gui_version}}",
            },
            {
                title: "Host URL",
                value: "{{host_url}}",
            },
            {
                title: "User ID",
                value: "{{user.id}}",
            },
            {
                title: "User is superuser",
                value: "{% if user.is_superuser %}true{% else %}false{% endif %}",
            },
            {
                title: "Path to static files",
                value: "{% static '' %}",
            },
            {
                title: "Debug mode",
                value: "{% if debug %}true{% else %}false{% endif %}",
            },
            {
                title: "Timezone",
                value: "{{timezone}}",
            },
        ];
        let table = createDomElement("table", [], {id: "loading_logs_table"});

        for(let index = 0; index < tableData.length; index ++) {
            let item = tableData[index];
            let row = createDomElement("tr", [], {});
            row.appendChild(createDomElement("th", [], {innerText: item.title}));
            row.appendChild(createDomElement("td", [], {innerText: item.value}));
            table.appendChild(row);
        };

        return table;
    };
    /**
     * Method sets current loading operation to one of the children DOM elements of Loader block.
     * @param {string} operation String with name of loading operation.
     */
    setLoadingOperation(operation) {
        let el = document.getElementById("LoadingProgressBarOperation");

        if(!el) {
            return;
        };

        el.innerText = operation;
    };
    /**
     * Method shows loading animation while some dependencies are loading from server.
     */
    showLoadingAnimation() {
        let elem = document.getElementById("LoadingProgressBarCount");

        if(!elem) {
            return;
        };

        if(elem.innerText.length == 3) {
            elem.innerText = "";
        };

        elem.innerText += ".";

        setTimeout(() => {
            if(this.loading) {
                this.showLoadingAnimation();
            }
        }, 800);
    };
    /**
     * Method, that changes loading progress bar value.
     * @param {number} width Value of loading progress bar width.
     */
    setLoadingProgress(width) {
        let elem = document.getElementById("LoadingProgressBarLine");

        if(!elem) {
            return;
        };

        let w = Math.ceil(width) + '%';

        elem.style.width = w;

        elem = document.getElementById("LoadingProgressBarCount");

        if(!elem) {
            return;
        };

        elem.style.width = w;
        elem.innerHTML = w;
    };
    /**
     * Method, that firstly hides loader block and then removes it from the DOM.
     */
    hideLoaderBlock() {
        function fadeOutAndRemove(el) {
            if(!el.style.opacity) {
                el.style.opacity = 1;
            };

            let interval_id = setInterval(() => {
                if (el.style.opacity > 0) {
                    el.style.opacity -= 0.05;
                } else {
                    el.style.display = "none";
                    clearInterval(interval_id);
                    setTimeout(() => {
                        document.body.removeChild(el);
                    }, 1000);
                }
            }, 30);
        };

        document.querySelector("#RealBody").style.display = "block";
        fadeOutAndRemove(document.querySelector("#LoadingProgressBar"));
    };
    /**
     * Method, that adds logs of files loading.
     * @param {object | string} data Logging message.
     * @param {object} extendData Additional logging message.
     */
    appendLog(data, extendData) {
        try {
            let text = "";

            if(!extendData) {
                extendData = {type:'Log', name:""};
            };

            text += "Type:"+extendData.type+"\t";

            if(extendData.name) { text += "Name:"+extendData.name+"\t" };

            if(typeof data == "string") {
                text += data;
            } else {
                text += "JSON:"+JSON.stringify(data);
            };

            let pre = createDomElement('pre', [], {className: "LoadingProgressBar-success", innerText: text});
            document.querySelector('.LoadingProgressBar-logger-wrapper').appendChild(pre);

        } catch(e) {
            this.appendError(e);
        };
    };
    /**
     * Method, that adds to the html document info about file loading error.
     * @param {object, string} exception Error object or string.
     * @param {object} extendData Additional logging message.
     */
    appendError(exception, extendData) {
        this.errors.push(exception);

        try {
            console.error(exception);

            let text = "";

            if(!extendData) {
                extendData = {type:'Error', name:""};
            };

            text += "Type:"+extendData.type+"\t";

            if(extendData.name) { text += "Name:"+extendData.name+"\n" };

            if(exception && exception.message) {
                text += exception.message + "\nstack:\n"+exception.stack;
            } else {
                text += "JSON exeption:\n"+JSON.stringify(exception);
            };

            let pre = createDomElement('pre', [], {className: 'LoadingProgressBar-error', innerText: text});
            let wrapper = document.querySelector('.LoadingProgressBar-logger-wrapper');
            wrapper.appendChild(pre);
            wrapper.style.display = "block";
            document.querySelector('.LoadingProgressBar-error-msg').style.display = "block";
            document.querySelector('.loadInfoWrapper').classList.add("need-reload");
        } catch(e) {
            debugger;
            console.error(e);
            alert("Oops, some error occurred! Check out DevTools console!")
        };
    };
    /**
     * Method shows message about updating of app version.
     */
    showUpdatingAppVersionMessage() {
        this.loading = true;
        this.addLoaderBlockToPage();
        this.setLoadingOperation('updating app version');
        this.showLoadingAnimation();
    };
    /**
     * Method returns promise to load all dependencies and append them to the page.
     * Main method of current class.
     * This method creates and add to the page DOM element, that shows loading status and collects loading logs,
     * loads app dependencies(OpenAPI schema, static files) and appends them to the page.
     */
    loadAndAppendDependencies() {
        this.loading = true;
        this.addLoaderBlockToPage();
        this.setLoadingOperation('loading files');
        this.showLoadingAnimation();

        return this.loadDependencies().then(dependencies => {
            this.loading = false;
            this.setLoadingOperation('loading app');
            return this.appendDependencies(dependencies);
        }).catch(error => {
            this.loading = false;
            this.appendError(error);
            throw error;
        });
    };
    /**
     * Method returns promise to load all app's dependencies.
     * @return {Promise<any[]>}
     */
    loadDependencies() {
        return Promise.all([
            this.openApiLoader.loadSchema(),
            this.filesLoader.loadAllFiles(),
        ]);
    };
    /**
     * Method returns promise to append all dependencies(static files) to the page.
     * @param {array} dependencies Response array, connecting loaded OpenAPI schema and files.
     * @returns {Promise<{openapi: *} | never>}
     */
    appendDependencies([openapi, files]) {
        if(!this.filesLoader.checkAllFilesLoaded(files)) {
            // throw new Error();
            return;
        };

        this.appendLog('All static files were successfully loaded');

        let callbacks = {
            fileAppended: (file, content, index) => {
                this.appendLog('File was appended to the page - "' + file.name +'"');
                let prog = Math.floor((index + 1)/files.length * 100);
                this.setLoadingProgress(prog);
            },

            allFilesAppended: () => {
                this.appendLog('All static files were successfully appended to the page.');
                this.setLoadingProgress(100);
            },
        };

        return this.filesLoader.appendFilesSync(files, 0, callbacks).then(() => {
            if(this.errors.length) {
                throw new Error("Some error occurred during files loading.");
            };

            tabSignal.emit("openapi.loaded",  openapi);
            tabSignal.emit('resource.loaded');
            return {openapi: openapi};
        });
    };
};

/**
 * Class, that is responsible for loading of OpenAPI schema.
 * Class has methods for loading of OpenAPI schema from API as well as from cache.
 */
class OpenApiLoader {
    /**
     * Constructor of OpenApiLoader class.
     * @param {object} cache Object, that methods for manipulating with indexedDB. Instance of FilesCache.
     */
    constructor(cache) {
        /**
         * Object, that methods for manipulating with indexedDB. Instance of FilesCache.
         */
        this.cache = cache;
    };
    /**
     * Method, that promises to load OpenApi schema from API.
     * @return {promise} Promise of loading of OpenApi schema from API.
     */
    loadSchemaFromApi() {
        return fetch(openapi_path + "?format=openapi")
            .then(res => {
                if(!res.ok) {
                    throw new Error("API request for loading of OpenAPI schema failed.");
                };
                return res.json();
            })
            .then(openapi => {
                return openapi;
            });
    };
    /**
     * Method, that promises to load OpenApi schema from cache.
     * @return {promise} Promise of loading of OpenApi schema from Cache.
     */
    loadSchemaFromCache() {
        return this.cache.getFile('openapi').then(response => {
            return JSON.parse(response.data);
        }).catch(error => {
            return this.loadSchemaFromApi().then(openapi => {
                this.cache.setFile('openapi', JSON.stringify(openapi));
                return openapi;
            });
        });
    };
    /**
     * Method, that promises to load OpenApi schema.
     * @return {promise} Promise of OpenApi schema loading.
     */
    loadSchema() {
        let method = this.cache ? 'loadSchemaFromCache' : 'loadSchemaFromApi';
        return this[method]().then(openapi => {
            return openapi;
        }).catch(error => {
            console.error("Some error occurred during attempt of getting of OpenAPI schema.");
            throw error;
        });
    };
};

/**
 * Class, that is responsible for the loading of app's static files (js, css, tpl) and appending them to the DOM.
 */
class StaticFilesLoader {
    constructor(resource_list) {
        this.resource_list = resource_list;
    };
    /**
     * Method, that appends JS type file to the page.
     * @param {object} file Object with file properties (type, name(url)).
     * @param {string} content File's content.
     */
    appendFile_js(file, content) {
        let attributes = [
            {key: "type", value: "text/javascript"},
            {key: "data-url", value: file.name},
        ];
        let props = {
            innerHTML: content,
        };

        let link = createDomElement("script", attributes, props);
        document.head.appendChild(link);
    };
    /**
     * Method, that appends CSS type file to the page.
     * @param {object} file Object with file properties (type, name(url)).
     * @param {string} content File's content.
     */
    appendFile_css(file, content) {
        let attributes = [
            {key: "rel", value: "stylesheet"}, {key: "type", value: "text/css"},
            {key: "media", value: "text/css"}, {key: "data-url", value: file.name},
        ];
        let props = {
            rel: 'stylesheet',
            type: 'text/css',
            media: 'all',
            innerHTML: content,
        };

        let link = createDomElement("style", attributes, props);
        document.head.appendChild(link);
    };
    /**
     * Method, that appends TPL type file to the page.
     * @param {object} file Object with file properties (type, name(url)).
     * @param {string} content File's content.
     */
    appendFile_tpl(file, content) {
        let div = createDomElement("div", [], {innerHTML: content});
        document.body.appendChild(div);
    };
    /**
     * Method, that appends files synchronously (in 'priority' order) to the page.
     * Firstly, current method adds to the page file with '0' index, then it appends file with '1' index and so on.
     * @param {array} response List of responses on files loading requests.
     * @param {number} index List index of element from files and response arrays.
     * @param {object} callbacks Dict with callbacks.
     */
    appendFilesSync(response, index, callbacks) {
        let item = this.resource_list[index];
        let handler = 'appendFile_' + item.type;

        if(!this[handler]) {
            return Promise.reject();
        };

        return response[index].text().then(content => {
            this[handler](item, content);
            if(index + 1 !== this.resource_list.length) {
                if(callbacks && callbacks.fileAppended) {
                    callbacks.fileAppended(item, content, index);
                };
                return this.appendFilesSync(response, index + 1, callbacks);
            } else {
                if(callbacks && callbacks.allFilesAppended) {
                    callbacks.allFilesAppended();
                };

                return Promise.resolve(true);
            };
        });
    };
    /**
     * Method checks, that all files were loaded with 200 status.
     * @param {array} response Array with responses on files loading requests.
     * @return {boolean}
     */
    checkAllFilesLoaded(response) {
        for (let index in response) {
            let item = response[index];

            if (item.status != 200) {
                throw new Error(item.status + ' error occurred during file loading - "' + item.url + '"');
            };
        };

        return true;
    };
    /**
     * Method, that loads all files form resource_list.
     * Method returns promise of files loading.
     */
    loadAllFiles() {
        return Promise.all(this.resource_list.map(item => fetch(item.name)));
    };
};
/////////////////////////////////////////////// Code execution ///////////////////////////////////////////////
/**
 * Adds error handler, that should handle(catch) errors, occurred during app dependencies loading.
 * This handler is supposed to catch errors in static files, that will be appended to the page during app dependencies loading.
 * Errors like getting/setting value of/to the undefined variables/properties and so on.
 */
window.addEventListener("error", onLoadingErrorHandler);

/**
 * Variable, that will be storing App instance.
 */
let app;
/**
 * Variable, that stores FilesCache instance.
 */
let guiCache = new FilesCache();
/**
 * Variable, that stores AppDependenciesLoader instance, responsible for loading of app dependencies.
 */
let depsLoader = new AppDependenciesLoader(resourceList, guiCache);

if(localStorage['gui_version'] !== gui_version) {
    updateGuiVersionsInLocalStorage();
    depsLoader.showUpdatingAppVersionMessage();
    cleanAllCacheAndReloadPage();
} else if(localStorage['gui_user_version'] !== gui_user_version) {
    updateGuiVersionsInLocalStorage();
    depsLoader.showUpdatingAppVersionMessage();
    cleanOpenApiCacheAndReloadPage();
} else {
    updateGuiVersionsInLocalStorage();
    depsLoader.loadAndAppendDependencies().then(deps => {
        // Creates App instance. App class is supposed to be appended to the page during app dependencies loading.
        app = new App(deps.openapi, guiCache);
        // Starts app loading (OpenAPI schema parsing, creating models, views and so on).
        app.start().then(() => {
            tabSignal.connect('app.version.updated', () => {
                alert('Oops! It looks like version of current page has become outdated. Please, reload the page.');
            });

            window.addEventListener('storage', function(e) {
                if(gui_version !== localStorage.getItem('gui_version')) {
                    tabSignal.emit('app.version.updated');
                }
            });

            // Removes onLoadingErrorHandler,
            // because App does not need it after successful app Loading.
            window.removeEventListener('error', onLoadingErrorHandler);
            depsLoader.hideLoaderBlock();
        }).catch(e => {
            depsLoader.appendError(e);
        });
    });
};
