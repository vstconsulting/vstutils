import CustomView from './CustomView.vue';

const Home = {
    mixins: [CustomView],
    data() {
        return {
            message: 'Homepage content',
        };
    },
    computed: {
        title() {
            return 'Home';
        },
    },
};

export default Home;
