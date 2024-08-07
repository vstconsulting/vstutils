import { createApp, ref, defineComponent, h } from 'vue-demi';
import Spinner from './components/Spinner.vue';

export function createDefaultPageLoader() {
    const show = ref(false);
    const app = createApp(
        defineComponent({
            setup() {
                return () =>
                    show.value
                        ? h(
                              'div',
                              {
                                  staticStyle: {
                                      position: 'absolute',
                                      top: '0',
                                      left: '0',
                                      display: 'flex',
                                      'justify-content': 'center',
                                      'align-items': 'center',
                                      width: '100vw',
                                      height: '100vh',
                                  },
                              },
                              [h(Spinner)],
                          )
                        : undefined;
            },
        }),
    );
    const div = document.createElement('div');
    document.body.insertAdjacentElement('beforeend', div);
    app.mount(div);
    return {
        show() {
            show.value = true;
        },
        hide() {
            show.value = false;
        },
    };
}
