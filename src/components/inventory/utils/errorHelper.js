/**
 * Trích xuất câu thông báo lỗi chi tiết từ Backend response (JSON/ProblemDetails/string/Exception)
 */
export const extractErrorMessage = (err, defaultMsg = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại.') => {
  if (!err) return defaultMsg;
  const data = err.response?.data;
  if (!data) return err.message || defaultMsg;

  // 1. Trường hợp backend trả về string trực tiếp
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  // 2. Trường hợp trả về { message: "..." }
  if (data.message && typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }

  // 3. Trường hợp trả về ProblemDetails { detail: "..." }
  if (data.detail && typeof data.detail === 'string' && data.detail.trim()) {
    return data.detail;
  }

  // 4. Trường hợp trả về ModelState / FluentValidation errors { errors: { field: ["error1"] } }
  if (data.errors && typeof data.errors === 'object') {
    const errorVals = Object.values(data.errors).flat().filter(Boolean);
    if (errorVals.length > 0) {
      return errorVals.join('; ');
    }
  }

  // 5. Trường hợp trả về ProblemDetails { title: "..." }
  if (data.title && typeof data.title === 'string' && data.title.trim()) {
    return data.title;
  }

  // 6. Axios fallback message
  return err.message || defaultMsg;
};
