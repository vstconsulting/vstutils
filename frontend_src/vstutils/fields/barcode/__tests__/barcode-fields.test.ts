import { createApp, createSchema, useTestCtx, waitForPageLoading } from '@/unittests';
import schema from './fields-schema.json';
import type { BaseModel } from '@/vstutils/models';
import { QRCodeField } from '../QRCodeField';
import { Barcode128Field } from '../Barcode128Field';
import { fireEvent } from '@testing-library/dom';
import { nextTick } from 'vue';
import { fitToWrapper } from '@/vstutils/utils';

// this function is used for box finder sizes calculation
describe('fitToBox', () => {
    test('aspect ratio > 1, width > height', () => {
        {
            const { width, height } = fitToWrapper({
                wrapperWidth: 1000,
                wrapperHeight: 200,
                aspectRatio: 2,
                padding: 0.2,
            });
            expect(width).toBe(320);
            expect(height).toBe(160);
        }
        {
            const { width, height } = fitToWrapper({
                wrapperWidth: 400,
                wrapperHeight: 300,
                aspectRatio: 2,
                padding: 0.2,
            });
            expect(width).toBe(320);
            expect(height).toBe(160);
        }
    });

    test('aspect ratio > 1, width < height', () => {
        {
            const { width, height } = fitToWrapper({
                wrapperWidth: 200,
                wrapperHeight: 1000,
                aspectRatio: 2,
                padding: 0.2,
            });
            expect(width).toBe(160);
            expect(height).toBe(80);
        }
        {
            const { width, height } = fitToWrapper({
                wrapperWidth: 300,
                wrapperHeight: 400,
                aspectRatio: 2,
                padding: 0.2,
            });
            expect(width).toBe(240);
            expect(height).toBe(120);
        }
    });

    test('aspect ratio < 1, width > height', () => {
        {
            const { width, height } = fitToWrapper({
                wrapperWidth: 1000,
                wrapperHeight: 200,
                aspectRatio: 1 / 2,
                padding: 0.2,
            });
            expect(width).toBe(80);
            expect(height).toBe(160);
        }
        {
            const { width, height } = fitToWrapper({
                wrapperWidth: 400,
                wrapperHeight: 300,
                aspectRatio: 1 / 2,
                padding: 0.2,
            });
            expect(width).toBe(120);
            expect(height).toBe(240);
        }
    });

    test('aspect ratio < 1, width < height', () => {
        {
            const { width, height } = fitToWrapper({
                wrapperWidth: 200,
                wrapperHeight: 1000,
                aspectRatio: 1 / 2,
                padding: 0.2,
            });
            expect(width).toBe(160);
            expect(height).toBe(320);
        }
        {
            const { width, height } = fitToWrapper({
                wrapperWidth: 300,
                wrapperHeight: 400,
                aspectRatio: 1 / 2,
                padding: 0.2,
            });
            expect(width).toBe(160);
            expect(height).toBe(320);
        }
    });

    test('aspect ratio not set', () => {
        const wrapperWidth = 1000;
        const wrapperHeight = 200;
        {
            const { width, height } = fitToWrapper({
                wrapperWidth,
                wrapperHeight,
                padding: 0.2,
            });
            expect(width).toBe(800);
            expect(height).toBe(160);
            // check that aspect ratio inherited
            expect(wrapperWidth / wrapperHeight).toBe(width / height);
        }
        {
            // if aspect ratio and padding not set than size is the same
            const { width, height } = fitToWrapper({
                wrapperWidth,
                wrapperHeight,
            });
            expect(width).toBe(wrapperWidth);
            expect(height).toBe(wrapperHeight);
        }
    });

    test('invalid arguments', () => {
        expect(() => fitToWrapper({ wrapperWidth: 1000, wrapperHeight: 1000, padding: -1 })).toThrowError(
            'padding must be within [0, 1).',
        );
        expect(() => fitToWrapper({ wrapperWidth: 1000, wrapperHeight: 1000, padding: 1 })).toThrowError(
            'padding must be within [0, 1).',
        );
        expect(() => fitToWrapper({ wrapperWidth: 1000, wrapperHeight: 1000, aspectRatio: -1 })).toThrowError(
            'aspectRatio must be greater than 0.',
        );
    });
});

describe('Barcode fields', () => {
    let SomeModel: typeof BaseModel;
    let instance: BaseModel;

    beforeAll(async () => {
        // @ts-expect-error it works on my pc really
        await createApp({ schema: createSchema(schema) });
        const { app } = useTestCtx();
        SomeModel = app.modelsResolver.byReferencePath('#/definitions/SomeModel');
        instance = new SomeModel();
    });

    beforeEach(() => {
        fetchMock.resetMocks();
    });

    test('resolving', () => {
        const qrcodeField = instance._fields.get('qrcode');
        const barcode128Field = instance._fields.get('barcode128');
        expect(qrcodeField).toBeInstanceOf(QRCodeField);
        expect(barcode128Field).toBeInstanceOf(Barcode128Field);
    });

    test('rendering', async () => {
        const { app, screen } = useTestCtx();

        fetchMock.mockResponse(
            JSON.stringify([
                {
                    status: 200,
                    data: {
                        id: 1,
                        qrcode: 'qrcode',
                        barcode128: 'barcode128',
                    },
                },
            ]),
        );

        // go to readonly detail page
        await app.router.push('/some/1/');
        await waitForPageLoading();
        expect(fetchMock).toBeCalledTimes(1);

        // check qrcode's canvas rendered
        const qrCodeCanvas = document.querySelector('.field-component.name-qrcode canvas');
        expect(qrCodeCanvas).toBeTruthy();

        // check barcode128's canvas rendered
        const barcode128Canvas = document.querySelector('.field-component.name-barcode128 canvas');
        expect(barcode128Canvas).toBeTruthy();

        // go to edit page
        await app.router.push('/some/1/edit/');
        await waitForPageLoading();
        expect(fetchMock).toBeCalledTimes(2);

        // get qrcode field wrapper element
        const qrcodeFieldWrapperEl = document.querySelector('.field-component.name-qrcode');
        expect(qrcodeFieldWrapperEl).toBeTruthy();

        // check if camera is not selected than helper button appears
        const noCameraButtons = await screen.findAllByText('Select scanner camera at sidebar');
        expect(noCameraButtons.length).toBe(2);
        for (const el of noCameraButtons) {
            expect(el).toBeInstanceOf(HTMLSpanElement);
            expect(el.parentElement).toBeInstanceOf(HTMLButtonElement);
        }

        // check there are toggle camera buttons
        const toggleScannerCameraButtons = await screen.findAllByTitle('Toggle camera');
        expect(toggleScannerCameraButtons.length).toBe(2);
        for (const el of toggleScannerCameraButtons) {
            expect(el).toBeInstanceOf(HTMLButtonElement);
            expect(el.getAttribute('type')).toBe('button');
            expect(el.getAttribute('disabled')).toBeTruthy();
            expect(el.querySelector('i.fa.fa-camera')).toBeTruthy();
        }

        // check there are also edit manually buttons
        const editManuallyButtons = await screen.findAllByTitle('Edit manually');
        expect(editManuallyButtons.length).toBe(2);
        for (const el of editManuallyButtons) {
            expect(el).toBeInstanceOf(HTMLButtonElement);
            expect(el.getAttribute('type')).toBe('button');
            expect(el.querySelector('i.fas.fa-pencil-alt')).toBeTruthy();
        }

        // click on edit manually button
        editManuallyButtons[0].click();
        await nextTick();

        // after clicking input must appear
        // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
        const editManuallyInput = qrcodeFieldWrapperEl?.querySelector(
            'input[type="text"]',
        ) as HTMLInputElement;
        expect(editManuallyInput).toBeTruthy();
        expect(editManuallyInput).toBeInstanceOf(HTMLInputElement);

        // check clicking on "no camera button" opens sidebar
        noCameraButtons[0].parentElement!.click();
        await nextTick();
        const sidebar = document.querySelector('aside.control-sidebar');
        expect(sidebar).toBeTruthy();

        // check there is a field for scanner camera selection in sidebar
        const scannerCameraWrapperEl = sidebar!.querySelector(
            '.field-component.name-scannerCamera.model-_LocalSettings',
        );
        expect(scannerCameraWrapperEl).toBeTruthy();

        const scannerCameraSelectEl = scannerCameraWrapperEl!.querySelector('input.custom-select');
        expect(scannerCameraSelectEl).toBeTruthy();
        expect(scannerCameraSelectEl?.getAttribute('placeholder')).toBe('Not supported by this device');
        expect(scannerCameraSelectEl?.getAttribute('disabled')).toBeTruthy();

        // check that qrcode field editing updates sandbox
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(app.store.page.sandbox.qrcode).toBe('qrcode');
        fireEvent.input(editManuallyInput, { target: { value: 'some new value' } });
        expect(editManuallyInput.value).toBe('some new value');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(app.store.page.sandbox.qrcode).toBe('some new value');
    });
});
