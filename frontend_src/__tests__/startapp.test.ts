import { waitFor } from '@testing-library/dom';
import { createApp, useTestCtx } from '@/unittests';

describe('App', () => {
    test('Create and init', async () => {
        const app = await createApp();
        const { screen } = useTestCtx();
        expect(app.userProfile.preferred_username).toBe('testUser');
        await waitFor(() => screen.getByText('Homepage content'));
    });
});
