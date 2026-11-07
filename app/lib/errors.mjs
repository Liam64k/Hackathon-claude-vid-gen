// An Error the server turns into an HTTP response: { error: message, ...extra } with this status.
export const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
