import { createDomElement } from './StaticFilesLoader.js';

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
    constructor() {
        /**
         * Boolean property, that means is loader loading files right now or not?
         */
        this.loading = false;
        /**
         * Array, that collects errors occurred during files/app loading.
         */
        this.errors = [];
    }

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
        let styles =
            "#LoadingProgressBar ::-webkit-scrollbar{width:0}#LoadingProgressBar{background:#ecf0f5;width:100%;height:100%;position:fixed;top:0;left:0;z-index:2000}#LoadingProgressBar .loadWrapper{width:200px;height:7px;position:absolute;top:155px;left:50%;transform:translate(-50%,-50%);background:#e0e0e0;border-radius:7px}#LoadingProgressBar .loadProgress{position:absolute;top:0;left:0;border-radius:7px;background:#3f51b5;height:100%;transition:all .1s ease-out}#LoadingProgressBar .operation,#LoadingProgressBar .status,#LoadingProgressBar .titleP,.LoadingProgressBar-logger-wrapper,.loadInfoWrapper a{position:absolute;left:50%;font-family:'Ubuntu Mono',monospace}#LoadingProgressBar .operation,#LoadingProgressBar .status{transform:translate(-50%,-45%);color:#607d8b}#LoadingProgressBar .operation{top:110px}#LoadingProgressBar .status{top:135px}#LoadingProgressBar .statusCont{font-family:'Ubuntu Mono',monospace}#LoadingProgressBar .titleP{top:30px;transform:translate(-50%,25%);color:#3f51b5;text-transform:uppercase;font-size:30px;margin-top:20px;margin-bottom:10px;font-weight:500;line-height:1.1;margin:.67em 0;box-sizing:border-box}.loadInfoWrapper a{border-radius:7px;padding:5px 15px;background-color:#e0e0e0;top:160px;transform:translate(-50%,25%);color:#3f51b5;text-transform:uppercase;text-decoration:none;box-sizing:border-box;font-weight:400;font-size:14px}.loadInfoWrapper a:hover{background-color:#d0d0d0}@media (max-width:360px){.loadInfoWrapper a{padding:7px 10px}}.LoadingProgressBar-logger-wrapper{top:230px;transform:translate(-50%,0);font-size:12px;font-weight:500;line-height:1.1;box-sizing:border-box;padding:0;margin:0 auto;width:90vw;height:calc(100vh - 256px);background-color:#dedede;overflow:scroll}.LoadingProgressBar-logger-wrapper h3{font-size:18px}.LoadingProgressBar-logger-wrapper h4{font-size:16px}.LoadingProgressBar-logger-wrapper h5{font-size:14px}.LoadingProgressBar-error{margin:0;padding:10px 0;color:#b53f3f;white-space:pre-wrap;white-space:-moz-pre-wrap;white-space:-o-pre-wrap;word-wrap:break-word}.LoadingProgressBar-success{margin:0;padding:0;color:green;white-space:pre-wrap;white-space:-moz-pre-wrap;white-space:-o-pre-wrap;word-wrap:break-word}.LoadingProgressBar-error-msg{color:#b53f3f}.loadInfoWrapper.need-reload span{animation-name:blinker;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(1,-.75,0,2.08);animation-duration:1s;color:red;font-weight:700}@keyframes blinker{from{opacity:1}to{opacity:.3}}#loading_logs_table th{text-align:left}#loading_logs_table td{padding-left:10px}";
        let loaderBlock = createDomElement('div', [], { id: 'LoadingProgressBar' });
        let titleBlock = createDomElement('h1', [], {
            className: 'titleP',
            innerText: window.project_gui_name,
        });
        let loadingOperation = createDomElement('div', [], { className: 'operation' });
        loadingOperation.appendChild(
            createDomElement('div', [], {
                id: 'LoadingProgressBarOperation',
                className: 'statusCont',
                innerText: 'loading files',
            }),
        );
        let loadingStatus = createDomElement('div', [], { className: 'status' });
        loadingStatus.appendChild(
            createDomElement('div', [], {
                id: 'LoadingProgressBarCount',
                className: 'statusCont',
            }),
        );
        let loadingProgressBarLine = createDomElement('div', [], { className: 'loadWrapper' });
        loadingProgressBarLine.appendChild(
            createDomElement('div', [], {
                id: 'LoadingProgressBarLine',
                className: 'loadProgress',
            }),
        );

        loaderBlock.appendChild(createDomElement('style', [], { innerHTML: styles }));
        loaderBlock.appendChild(titleBlock);
        loaderBlock.appendChild(loadingOperation);
        loaderBlock.appendChild(loadingStatus);
        loaderBlock.appendChild(loadingProgressBarLine);

        let reloadButton = createDomElement('div', [], { className: 'loadInfoWrapper' });
        let reloadButtonLink = createDomElement('a', [], {
            href: '#',
            onclick: () => {
                window.cleanAllCacheAndReloadPage();
                return false;
            },
        });
        reloadButtonLink.appendChild(createDomElement('span', [], { innerText: 'Reload all cache' }));
        reloadButton.appendChild(reloadButtonLink);
        loaderBlock.appendChild(reloadButton);

        loaderBlock.appendChild(this.formLogsWrapper());
        document.body.appendChild(loaderBlock);
    }

    /**
     * Method, that forms DOM elements, which will store loading logs.
     * @returns {HTMLElement}
     */
    formLogsWrapper() {
        let wrapper = createDomElement('div', [], {
            className: 'LoadingProgressBar-logger-wrapper',
            style: { display: 'none' },
        });
        wrapper.appendChild(
            createDomElement('h3', [], {
                innerText: 'Loading logger',
                style: { textAlign: 'center' },
            }),
        );
        wrapper.appendChild(
            createDomElement('h4', [], {
                className: 'LoadingProgressBar-error-msg',
                innerText: 'Some errors occurred during app loading',
                style: { textAlign: 'center', display: 'none' },
            }),
        );
        wrapper.appendChild(createDomElement('h5', [], { innerText: 'Project info' }));
        wrapper.appendChild(this.formProjectInfoTable());
        wrapper.appendChild(createDomElement('h5', [], { innerText: 'Logs' }));
        return wrapper;
    }

    /**
     * Method forms DOM element - table, that stores info about project.
     * @returns {HTMLElement}
     */
    formProjectInfoTable() {
        let tableData = [
            {
                title: 'Project name',
                value: window.project_gui_name,
            },
            {
                title: 'Project Version',
                value: window.project_version,
            },
            {
                title: 'Gui Version',
                value: window.gui_version,
            },
            {
                title: 'Host URL',
                value: window.host_url,
            },
            {
                title: 'Debug mode',
                value: window.isDebug,
            },
        ];
        let table = createDomElement('table', [], { id: 'loading_logs_table' });

        for (let index = 0; index < tableData.length; index++) {
            let item = tableData[index];
            let row = createDomElement('tr', [], {});
            row.appendChild(createDomElement('th', [], { innerText: item.title }));
            row.appendChild(createDomElement('td', [], { innerText: item.value }));
            table.appendChild(row);
        }

        return table;
    }

    /**
     * Method sets current loading operation to one of the children DOM elements of Loader block.
     * @param {string} operation String with name of loading operation.
     */
    setLoadingOperation(operation) {
        let el = document.getElementById('LoadingProgressBarOperation');

        if (!el) {
            return;
        }

        el.innerText = operation;
    }

    /**
     * Method shows loading animation while some dependencies are loading from server.
     */
    showLoadingAnimation() {
        let elem = document.getElementById('LoadingProgressBarCount');

        if (!elem) {
            return;
        }

        if (elem.innerText.length === 3) {
            elem.innerText = '';
        }

        elem.innerText += '.';

        setTimeout(() => {
            if (this.loading) {
                this.showLoadingAnimation();
            }
        }, 800);
    }

    /**
     * Method, that changes loading progress bar value.
     * @param {number} width Value of loading progress bar width.
     */
    setLoadingProgress(width) {
        let elem = document.getElementById('LoadingProgressBarLine');

        if (!elem) {
            return;
        }

        let w = Math.ceil(width) + '%';

        elem.style.width = w;

        elem = document.getElementById('LoadingProgressBarCount');

        if (!elem) {
            return;
        }

        elem.style.width = w;
        elem.innerHTML = w;
    }

    /**
     * Method, that firstly hides loader block and then removes it from the DOM.
     */
    hideLoaderBlock() {
        function fadeOutAndRemove(el) {
            if (!el.style.opacity) {
                el.style.opacity = 1;
            }

            let interval_id = setInterval(() => {
                if (el.style.opacity > 0) {
                    el.style.opacity -= 0.05;
                } else {
                    el.style.display = 'none';
                    clearInterval(interval_id);
                    setTimeout(() => {
                        document.body.removeChild(el);
                    }, 1000);
                }
            }, 30);
        }

        document.querySelector('#RealBody').style.display = 'block';
        fadeOutAndRemove(document.querySelector('#LoadingProgressBar'));
    }

    /**
     * Method, that adds logs of files loading.
     * @param {object | string} data Logging message.
     * @param {object} extendData Additional logging message.
     */
    appendLog(data, extendData = null) {
        try {
            let text = '';

            if (!extendData) {
                extendData = { type: 'Log', name: '' };
            }

            text += 'Type:' + extendData.type + '\t';

            if (extendData.name) {
                text += 'Name:' + extendData.name + '\t';
            }

            if (typeof data == 'string') {
                text += data;
            } else {
                text += 'JSON:' + JSON.stringify(data);
            }

            let pre = createDomElement('pre', [], {
                className: 'LoadingProgressBar-success',
                innerText: text,
            });
            document.querySelector('.LoadingProgressBar-logger-wrapper').appendChild(pre);
        } catch (e) {
            this.appendError(e);
        }
    }

    /**
     * Method, that adds to the html document info about file loading error.
     * @param {object, string} exception Error object or string.
     * @param {object} extendData Additional logging message.
     */
    appendError(exception, extendData = null) {
        this.errors.push(exception);

        try {
            console.error(exception);

            let text = '';

            if (!extendData) {
                extendData = { type: 'Error', name: '' };
            }

            text += 'Type:' + extendData.type + '\t';

            if (extendData.name) {
                text += 'Name:' + extendData.name + '\n';
            }

            if (exception && exception.message) {
                text += exception.message + '\nstack:\n' + exception.stack;
            } else {
                text += 'JSON exeption:\n' + JSON.stringify(exception);
            }

            let pre = createDomElement('pre', [], { className: 'LoadingProgressBar-error', innerText: text });
            let wrapper = document.querySelector('.LoadingProgressBar-logger-wrapper');
            wrapper.appendChild(pre);
            wrapper.style.display = 'block';
            document.querySelector('.LoadingProgressBar-error-msg').style.display = 'block';
            document.querySelector('.loadInfoWrapper').classList.add('need-reload');
        } catch (e) {
            debugger;
            console.error(e);
            alert('Oops, some error occurred! Check out DevTools console!');
        }
    }

    /**
     * Method shows message about updating of app version.
     */
    showUpdatingAppVersionMessage() {
        this.loading = true;
        this.addLoaderBlockToPage();
        this.setLoadingOperation('updating app version');
        this.showLoadingAnimation();
    }

    /**
     * Method returns promise to load all dependencies and append them to the page.
     * Main method of current class.
     * This method creates and add to the page DOM element, that shows loading status and collects loading logs,
     * loads app dependencies(OpenAPI schema, static files) and appends them to the page.
     */
    loadAndAppendDependencies(filesLoader) {
        this.loading = true;
        this.addLoaderBlockToPage();
        this.setLoadingOperation('loading files');
        this.showLoadingAnimation();

        return filesLoader.loadAllFiles()
            .then((files) => {
                this.loading = false;
                this.setLoadingOperation('loading app');
                return this.appendDependencies(files, filesLoader);
            })
            .catch((error) => {
                this.loading = false;
                this.appendError(error);
                throw error;
            });
    }

    /**
     * Method returns promise to append all dependencies(static files) to the page.
     * @param {array} files Response array, connecting files.
     * @param filesLoader
     * @returns {Promise}
     */
    appendDependencies(files, filesLoader) {
        if (!filesLoader.checkAllFilesLoaded(files)) {
            // throw new Error();
            return null;
        }

        this.appendLog('All static files were successfully loaded');

        let callbacks = {
            fileAppended: (file, content, index) => {  /* jshint unused: false */
                this.appendLog('File was appended to the page - "' + file.name + '"');
                let prog = Math.floor(((index + 1) / files.length) * 100);
                this.setLoadingProgress(prog);
            },

            allFilesAppended: () => {
                this.appendLog('All static files were successfully appended to the page.');
                this.setLoadingProgress(100);
            },
        };

        return filesLoader.appendFilesSync(files, 0, callbacks).then(() => {
            if (this.errors.length) {
                throw new Error('Some error occurred during files loading.');
            }
            tabSignal.emit('resource.loaded');
        });
    }
}

export default AppDependenciesLoader;
