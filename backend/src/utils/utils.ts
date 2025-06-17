export const sanitizeFileNamePart: (fileName: string) => string = (fileName: string): string => {
    if (!fileName) {
        return '';
    }

    // 1. Chuyển đổi tiếng Việt có dấu thành không dấu
    // Sử dụng Unicode Normalization Form Canonical Decomposition (NFD)
    // để tách ký tự cơ bản và dấu phụ, sau đó loại bỏ dấu phụ.
    // Xử lý riêng ký tự 'đ' và 'Đ' vì NFD không tự động chuyển chúng thành 'd'.
    let cleanedName = fileName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Loại bỏ các dấu phụ (diacritics)
        .replace(/đ/g, "d")               // Xử lý 'đ' -> 'd'
        .replace(/Đ/g, "D");              // Xử lý 'Đ' -> 'D'

    // 2. Chuyển đổi tất cả thành chữ thường (tùy chọn, nhưng là thực hành tốt cho S3 keys)
    cleanedName = cleanedName.toLowerCase();

    // 3. Thay thế khoảng trắng và các ký tự không phải chữ-số-gạch ngang-dấu chấm bằng dấu gạch ngang
    // Cụ thể:
    // - \s+: một hoặc nhiều khoảng trắng
    // - [^a-z0-9.-]+: bất kỳ ký tự nào không phải chữ cái (a-z), số (0-9), dấu chấm (.), hoặc dấu gạch ngang (-)
    cleanedName = cleanedName.replace(/[\s_]+/g, '-') // Thay thế khoảng trắng và dấu gạch dưới bằng dấu gạch ngang
                             .replace(/[^a-z0-9.-]+/g, '-') // Thay thế các ký tự không an toàn khác bằng dấu gạch ngang
                             .replace(/^-+|-+$/g, ''); // Loại bỏ dấu gạch ngang ở đầu hoặc cuối chuỗi

    return cleanedName;
}