import { ApiErrorEnvelopeSchema } from '@mahalla-ovozi/api-contracts';
export class ApiError extends Error {
    code;
    statusCode;
    isNetworkError;
    blockers;
    constructor(message, code, statusCode, isNetworkError, blockers) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.statusCode = statusCode;
        this.isNetworkError = isNetworkError;
        this.blockers = blockers;
    }
}
export async function request(url, options, schema) {
    const headers = {
        ...options.headers,
    };
    if (options.body) {
        headers['Content-Type'] = 'application/json';
    }
    let response;
    try {
        response = await fetch(url, {
            ...options,
            credentials: 'include', // Include host-scoped session cookies
            headers,
        });
    }
    catch (networkErr) {
        // Let intentionally aborted queries propagate without classifying as network outages
        if (networkErr instanceof DOMException && networkErr.name === 'AbortError') {
            throw networkErr;
        }
        // Network uncertainty: server unreachable, DNS failure, offline
        throw new ApiError('Сервер билан алоқа мавжуд эмас. Тармоқни текширинг.', 'NETWORK_ERROR', 0, true);
    }
    let body;
    try {
        body = await response.json();
    }
    catch {
        body = null;
    }
    if (!response.ok) {
        const errorParsed = ApiErrorEnvelopeSchema.safeParse(body);
        if (errorParsed.success) {
            throw new ApiError(errorParsed.data.error.message, errorParsed.data.error.code, response.status, false, errorParsed.data.error.blockers);
        }
        throw new ApiError('Серверда кутилмаган хатолик юз берди.', 'SERVER_ERROR', response.status, false);
    }
    const result = schema.safeParse(body);
    if (!result.success || result.data === undefined) {
        throw new ApiError('Сервердан нотўғри форматдаги маълумот олинди.', 'INVALID_RESPONSE', response.status, false);
    }
    return result.data;
}
