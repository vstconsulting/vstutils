const ViewWithParentInstancesForPath = {
    methods: {
        getSubViewUrl(innerPathObj, views) {
            return views[innerPathObj.path].objects.url.format(this.$route.params);
        },
        /**
         * Method, that loads parent model instances from current view url.
         * Method defines parents from URL, loads instances of those parents
         * and saves them in this.data.parent_instances.
         */
        getParentInstancesForPath() {
            let inner_paths = this.getParentPaths(this.$route.name, this.$route.path);
            let views = this.$store.getters.getViews;

            for (let index = 0; index < inner_paths.length; index++) {
                let obj = inner_paths[index];

                if (!this.loadParentInstanceOrNot(views, obj)) {
                    continue;
                }

                // TODO do something with breadcrumbs
                // this.getInstance(views[obj.path], this.getSubViewUrl(obj, views))
                //     .then((instance) => {
                //         this.commitMutation('setParentInstances', {
                //             ...this.datastore.data.parent_instances,
                //             [obj.url]: instance,
                //         });
                //     })
                //     .catch((error) => {
                //         console.log(error);
                //     });
            }
        },
    },
};
export default ViewWithParentInstancesForPath;
