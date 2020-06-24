/**
 * Function creates DOM element and sets it attributes and props.
 * @param {string} type Type (tag) of DOM element.
 * @param {array} attributes Array of objects -
 * DOM element attributes(key, value).
 * @param {object} props Object with properties of DOM element.
 */
function createDomElement(type, attributes, props) {
    let el = document.createElement(type);

    attributes.forEach((attr) => {
        el.setAttribute(attr.key, attr.value);
    });

    for (let key in props) {
        if (typeof props[key] === 'object' && key === 'style') {
            for (let stl in props[key]) {
                if (!Object.prototype.hasOwnProperty.call(props[key], stl)) {
                    continue;
                }

                el[key][stl] = props[key][stl];
            }
        } else {
            el[key] = props[key];
        }
    }

    return el;
}

/**
 * Class, that is responsible for the loading of app's static files (js, css, tpl) and appending them to the DOM.
 */
class StaticFilesLoader {
    constructor(resource_list) {
        this.resource_list = resource_list;
    }

    /**
     * Method, that appends JS type file to the page.
     * @param {object} file Object with file properties (type, name(url)).
     * @param {string} content File's content.
     */
    appendFile_js(file, content) {
        let attributes = [
            { key: 'type', value: 'text/javascript' },
            { key: 'data-url', value: file.name },
        ];
        let props = {
            innerHTML: content,
        };

        let link = createDomElement('script', attributes, props);
        document.head.appendChild(link);
    }

    /**
     * Method, that appends CSS type file to the page.
     * @param {object} file Object with file properties (type, name(url)).
     * @param {string} content File's content.
     */
    appendFile_css(file, content) {
        let attributes = [
            { key: 'rel', value: 'stylesheet' },
            { key: 'type', value: 'text/css' },
            { key: 'media', value: 'text/css' },
            { key: 'data-url', value: file.name },
        ];
        let props = {
            rel: 'stylesheet',
            type: 'text/css',
            media: 'all',
            innerHTML: content,
        };

        let link = createDomElement('style', attributes, props);
        document.head.appendChild(link);
    }

    /**
     * Method, that appends TPL type file to the page.
     * @param {object} file Object with file properties (type, name(url)).
     * @param {string} content File's content.
     */
    appendFile_tpl(file, content) {
        let div = createDomElement('div', [], { innerHTML: content });
        document.body.appendChild(div);
    }

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

        if (!this[handler]) {
            return Promise.reject();
        }

        return response[index].text().then((content) => {
            this[handler](item, content);
            if (index + 1 !== this.resource_list.length) {
                if (callbacks && callbacks.fileAppended) {
                    callbacks.fileAppended(item, content, index);
                }

                return this.appendFilesSync(response, index + 1, callbacks);
            } else {
                if (callbacks && callbacks.allFilesAppended) {
                    callbacks.allFilesAppended();
                }

                return Promise.resolve(true);
            }
        });
    }

    /**
     * Method checks, that all files were loaded with 200 status.
     * @param {array} response Array with responses on files loading requests.
     * @return {boolean}
     */
    checkAllFilesLoaded(response) {
        for (let item of response) {
            if (item.status !== 200) {
                throw new Error(`${item.status} error occurred during file loading - "${item.url}"`);
            }
        }
        return true;
    }

    /**
     * Method, that loads all files form resource_list.
     * Method returns promise of files loading.
     */
    loadAllFiles() {
        return Promise.all(this.resource_list.map((item) => fetch(item.name)));
    }
}

export { StaticFilesLoader, createDomElement };
