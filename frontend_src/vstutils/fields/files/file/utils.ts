import { guiPopUp } from '@/vstutils/popUp';

export interface IFileField {
    maxSize?: number;
    allowedMediaTypes?: string[];
}

export function validateFileSize(field: IFileField, fileSize: number) {
    if (field.maxSize !== undefined && field.maxSize <= fileSize) {
        guiPopUp.error('File is too large');
        console.log(`File is too large ${fileSize}`);
        return false;
    }
    return true;
}
