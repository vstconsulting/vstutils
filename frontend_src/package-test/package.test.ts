import { initApp } from '@vstconsulting/vstutils';
import { createAuthAppFactory } from '@vstconsulting/vstutils/auth-app';
import styles from '@vstconsulting/vstutils/style.css';

test('built npm package', () => {
    expectTypeOf(initApp).toBeFunction();
    expect(initApp).toBeTypeOf('function');

    expectTypeOf(createAuthAppFactory).toBeFunction();
    expect(createAuthAppFactory).toBeTypeOf('function');

    expect(styles).toBeTypeOf('string');
});
