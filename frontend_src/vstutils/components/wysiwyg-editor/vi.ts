import type { Editor } from '@toast-ui/editor';

export default (ToastUIEditor: typeof Editor) =>
    ToastUIEditor.setLanguage('vi', {
        Markdown: 'Markdown',
        WYSIWYG: 'WYSIWYG',
        Write: 'Biên tập viên',
        Preview: 'Lượt xem',
        Headings: 'Tiêu đề',
        Paragraph: 'Đoạn văn',
        Bold: 'Béo',
        Italic: 'Chữ in nghiêng',
        Strike: 'Vượt qua',
        Code: 'Mật mã',
        Line: 'Đường kẻ',
        Blockquote: 'Trích dẫn',
        'Unordered list': 'Danh sách rối loạn',
        'Ordered list': 'Danh sách được yêu cầu',
        Task: 'Đánh dấu',
        Indent: 'Tăng thụt',
        Outdent: 'Giảm thụt',
        'Insert link': 'Chèn liên kết',
        'Insert CodeBlock': 'Chèn khối mã',
        'Insert table': 'Chèn bảng',
        'Insert image': 'Chèn hình ảnh',
        Heading: 'Tiêu đề',
        'Image URL': 'Hình ảnh URL',
        'Select image file': 'Chọn tệp hình ảnh',
        'Choose a file': 'Chọn',
        'No file': 'Không có tập tin',
        Description: 'Sự miêu tả',
        OK: 'Tốt',
        More: 'Hơn',
        Cancel: 'Hủy bỏ',
        File: 'Tập tin',
        URL: 'URL',
        'Link text': 'văn bản liên kết',
        'Add row to up': 'Thêm dòng lên',
        'Add row to down': 'Thêm dòng xuống',
        'Add column to left': 'Thêm cột bên trái',
        'Add column to right': 'Thêm cột ở bên phải',
        'Remove row': 'Xóa một hàng',
        'Remove column': 'Tháo cột',
        'Align column to left': 'Căn chỉnh',
        'Align column to center': 'Cho thuê trung tâm',
        'Align column to right': 'Căn chỉnh',
        'Remove table': 'Xóa bảng',
        'Would you like to paste as table?': 'Bạn có muốn chèn dưới dạng bảng không?',
        'Text color': 'Văn bản màu',
        'Auto scroll enabled': 'Tự động -Boiling được bật',
        'Auto scroll disabled': 'Tự động -Boiling bị vô hiệu hóa',
        'Choose language': 'Chọn một ngôn ngữ',
    });
