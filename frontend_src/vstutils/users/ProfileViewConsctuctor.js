import { path_pk_key } from "../utils";

export default class ProfileViewConsctuctor {
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
      view.objects.model,
      $.extend(true, {}, view.schema),
      view.template
    );
    let mixin = this.getBaseProfileMixin(path);

    if (this.mixins[path]) {
      mixin = $.extend(true, mixin, this.mixins[path]);
    }

    if (view.schema.type == "page_edit") {
      mixin.methods.getRedirectUrl = function(opt) {
        /* jshint unused: false */
        return this.$route.path.replace("/edit", "");
      };
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
          return path
            .replace("{" + path_pk_key + "}", app.api.getUserId())
            .format(this.$route.params)
            .replace(/\/$/g, "");
        }
      },
      methods: {
        loadParentInstanceOrNot(views, obj) {
          if (views[obj.path] && views[obj.path].schema.type == "list") {
            return false;
          }

          if (obj.path == "/profile/") {
            return false;
          }

          return true;
        },

        getParentInstancesForPath() {
          let inner_paths = this.getParentPaths(
            this.$route.name,
            this.$route.path
          );
          let views = this.$store.getters.getViews;

          for (let index = 0; index < inner_paths.length; index++) {
            let obj = inner_paths[index];

            if (!this.loadParentInstanceOrNot(views, obj)) {
              continue;
            }

            let url = obj.url.replace("profile", "user/" + app.api.getUserId());

            this.getInstance(views[obj.path], url)
              .then(instance => {
                this.data.parent_instances[obj.url] = instance;
                this.data.parent_instances = { ...this.data.parent_instances };
              })
              .catch(error => {
                /* jshint unused: false */
                debugger;
              });
          }
        }
      }
    };
  }
}
