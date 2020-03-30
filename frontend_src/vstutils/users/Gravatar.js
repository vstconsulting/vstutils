import md5 from 'md5';

/**
 * Class, that defines urls to users gravatars.
 */
export default class Gravatar {
    /**
     * Constructor of Gravatar class.
     * @param {object} opt Object with Gravatar object properties.
     */
    constructor(opt = {}) {
        this.base_url = 'https://www.gravatar.com/avatar/{hash}?d=mp';

        if (opt.base_url) {
            this.base_url = opt.base_url;
        }

        this.default_gravatar = app.api.openapi.info['x-settings'].static_path + 'img/anonymous.png';
    }
    /**
     * Method, that returns url of default gravatar image.
     * @returns {string}
     */
    getDefaultGravatar() {
        return this.default_gravatar;
    }
    /**
     * Method, that defines url of user's gravatar image and returns it.
     * @param {string} email User's email.
     * @returns {string}
     */
    getGravatarByEmail(email) {
        if (!email) {
            return this.getDefaultGravatar();
        }

        return this.base_url.format({ hash: md5(email) });
    }
}
