/**
 * Groups list of objects by given key value
 *
 * @param {Object[]} objects
 * @param {string} key
 */
function groupBy(objects, key) {
    return objects.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
}

/**
 * @name FileCallback
 * @function
 * @param {string} path - Path of file.
 * @param {string} type - Type of file.
 */

/**
 * Class that represents one file
 */
class StaticFile {
    constructor(path, type = 'js', fileLoadedCallback = undefined, fileAddedToPageCallback = undefined) {
        this.path = path;
        this.type = type;
        this.fileLoadedCallback = fileLoadedCallback;
        this.fileAddedToPageCallback = fileAddedToPageCallback;
    }

    startLoading() {
        this.loaded = fetch(this.path)
            .then((r) => r.text())
            .then((content) => {
                if (this.fileLoadedCallback) this.fileLoadedCallback(this.path, this.type);
                return content;
            });
    }

    startAddingToPageWhenLoaded() {
        this.addedToPage = this.loaded.then((content) => {
            this._addToPage(content);
            if (this.fileAddedToPageCallback) this.fileAddedToPageCallback(this.path, this.type);
        });
    }

    _addToPage(content) {
        if (this.type === 'js') {
            window.eval(content);
        } else if (this.type === 'css') {
            const style = document.createElement('style');
            style.setAttribute('rel', 'stylesheet');
            style.innerHTML = content;
            style.dataset.url = this.path;
            document.head.appendChild(style);
        } else if (this.type === 'tpl') {
            const div = document.createElement('div');
            div.innerHTML = content;
            document.body.appendChild(div);
        }
    }
}

class StaticFilesLoader {
    /**
     * @param {Object[]} files
     * @param {number} files[].priority - File priority (file with lower priority will be added on page first).
     * @param {string} files[].type - File type (tpl, css, js).
     * @param {string} files[].name - File path.
     * @param {FileCallback=} fileLoadedCallback - Hook that will be called when file is loaded.
     * @param {FileCallback=} fileAddedToPageCallback - Hook that will be called when file is added to page.
     */
    constructor(files, fileLoadedCallback = undefined, fileAddedToPageCallback = undefined) {
        /**
         * @type {StaticFile[][]}
         */
        this.buckets = [];
        if (files.length === 0) {
            return;
        }

        const rawBuckets = Object.entries(groupBy(files, 'priority'))
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map((entry) => entry[1]);

        this.buckets = rawBuckets.map((rawBucket) =>
            rawBucket.map(
                (rawFile) =>
                    new StaticFile(rawFile.name, rawFile.type, fileLoadedCallback, fileAddedToPageCallback),
            ),
        );
    }

    async loadAndAddToPageAllFiles() {
        this.buckets.flat().forEach((file) => file.startLoading());

        for (let bucket of this.buckets) {
            bucket.forEach((file) => file.startAddingToPageWhenLoaded());

            for (let file of bucket) {
                await file.addedToPage;
            }
        }
    }
}

export { StaticFilesLoader };
