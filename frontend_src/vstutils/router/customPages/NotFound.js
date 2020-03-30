import CustomView from './CustomView.vue';

const Home = {
    mixins: [CustomView],
    data() {
        return {
            message: 'page matching current url was not found',
        };
    },
    computed: {
        title() {
            return 'Error 404';
        },
    },
};

export default Home;
