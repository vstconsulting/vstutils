/**
 * Function returns profile string.
 * @returns {string}
 */
function getProfileString() {
    return 'profile';
}

/**
 * Object with mixins for some profile pages.
 */
var profile_mixins = {};
profile_mixins['/user/{' + path_pk_key + '}/'] = {
    methods: {
        getBreadcrumbNameForCurrentPath: getProfileString,
    },
    computed: {
        title: getProfileString,
    },
};
profile_mixins['/user/{' + path_pk_key + '}/edit/'] = {
    computed: {
        title: getProfileString,
    },
};

class ProfileViewConsctuctor {
    /**
     * Constructor of ProfileViewConsctuctor.
     * @param {object} profile_mixins Object with props -
     * (key, value) of which equal to (profile_path, mixin).
     */
    constructor(profile_mixins) {
        this.mixins = profile_mixins;
    }
    /**
     * Method, that generates profile view and returns it.
     * @param {object} views Object with views.
     * @param {string} path Profile path.
     * @returns {View}
     */
    generateProfileView(views, path) {
        let view = views[path];
        let new_view = new View(
            view.objects.model, $.extend(true, {}, view.schema), view.template,
        );
        let mixin = this.getBaseProfileMixin(path);

        if (this.mixins[path]) {
            mixin = $.extend(true, mixin, this.mixins[path]);
        }

        if (view.schema.type == 'page_edit') {
            mixin.methods.getRedirectUrl = function (opt) {
                return this.$route.path.replace('/edit', "");
            }
        }

        new_view.mixins = [...view.mixins];
        new_view.mixins.push(mixin);

        return new_view;
    }
    /**
     * Method, that returns base mixin for profile views.
     * @param {string} path Profile path.
     * @returns {object}.
     */
    getBaseProfileMixin(path) {
        return {
            computed: {
                url() {
                    return path.replace('{' + path_pk_key +'}', my_user_id);
                }
            },
            methods: {
                loadParentInstanceOrNot(views, obj) {
                    if(views[obj.path] && views[obj.path].schema.type == "list") {
                        return false;
                    }

                    if(obj.path == '/profile/') {
                        return false;
                    }

                    return true;
                },

                getParentInstancesForPath() {
                    let inner_paths = this.getParentPaths(this.$route.name, this.$route.path);
                    let views = this.$store.getters.getViews;

                    for(let index in inner_paths) {
                        let obj = inner_paths[index];

                        if(!this.loadParentInstanceOrNot(views, obj)) {
                            continue;
                        }

                        let url = obj.url.replace('profile', 'user/' + my_user_id);

                        this.getInstance(views[obj.path], url).then(instance => {
                            this.data.parent_instances[obj.url] = instance;
                            this.data.parent_instances = { ...this.data.parent_instances};
                        }).catch(error => {
                            debugger;
                        });
                    }
                },
            },
        };
    }
}

var profile_constructor = new ProfileViewConsctuctor(profile_mixins);

/**
 * Function generates profile views.
 * This function is supposed to be called from 'allViews.inited' signal.
 * @param {object} obj Object with properties from signal.
 */
function addProfileViews(obj) {
    let str = '/user/{' + path_pk_key + '}/';
    let views = obj.views;
    let paths_for_profile = Object.keys(views).filter(path => path.indexOf(str) == 0);

    paths_for_profile.forEach(path => {
        let new_path = path.replace('user/{' + path_pk_key + '}', 'profile');
        let new_view = profile_constructor.generateProfileView(views, path);
        views[new_path] = new_view;
    });
}

/**
 * Class, that defines urls to users gravatars.
 */
class Gravatar {
    /**
     * Constructor of Gravatar class.
     * @param {object} opt Object with Gravatar object properties.
     */
    constructor(opt={}) {
        this.base_url = 'https://www.gravatar.com/avatar/{hash}?d=mp';

        if(opt.base_url) {
            this.base_url = opt.base_url;
        }

        this.default_gravatar = window.guiStaticPath + 'img/anonymous.png';
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
        if(!email) {
            return this.getDefaultGravatar();
        }

        return this.base_url.format({hash:md5(email)});
    }
}

/**
 * Function. that is supposed to be called from tabSignal, connected with user models.
 * @param {object} obj Object with signal arguments.
 */
function userModelHandler(obj) {
    obj.model.view_name = 'username';
}

var userModels = ['OneUser', 'User'];
userModels.forEach(model => {
    let signal = "models[{0}].created".format([model]);
    tabSignal.connect(signal, userModelHandler);
});

tabSignal.connect('models[User].fields.beforeInit', fields => {
    fields.email.hidden = true;
});

['CreateUser', 'ChangePassword'].forEach(model => {
    tabSignal.connect('models[{0}].fields.beforeInit'.format([model]), fields => {
        ['old_password', 'password', 'password2'].forEach(field => {
            if(fields[field]) {
                fields[field].format = 'password';
            }
        });
    });
});

tabSignal.connect('allViews.inited', addProfileViews);

/**
 * Mixin for a view that is supposed to be used for creating/editing some user's password.
 */
var view_with_user_password_mixin = {
    methods: {
        /**
         * Method, that generates random password and sets it to the 'password' and 'password2' fields.
         */
        generate_passwordInstance() {
            let data = $.extend(true, {}, this.getQuerySetFromSandBox(this.view, this.qs_url).cache.data);
            let password = randomString(8);

            ['password', 'password2'].forEach(field => {
                data[field] = password;
            });

            this.$store.commit('setViewInstanceData', {
                store: 'sandbox',
                url: this.qs_url.replace(/^\/|\/$/g, ""),
                data: data,
            });
        },
    },
};

/**
 * Function, that creates signals, that add to the user views opportunity to generate random password.
 * @param {string} path Path os user view.
 */
function addChangePasswordOperationToView(path) {
    tabSignal.connect('views[' + path + '].afterInit', obj => {
        obj.view.mixins.push(view_with_user_password_mixin);

    });

    tabSignal.connect("views[" + path + "].created", obj => {
        obj.view.schema.operations.generate_password = {
            name: 'generate_password',
        };
    });
}

/**
 * Adds to following views opportunity to generate random users password.
 */
[
    '/user/new/',
    '/user/{' + path_pk_key + '}/change_password/',
    '/profile/change_password/'
].forEach(addChangePasswordOperationToView);