import { Logger } from "./utils/Logger.js"

export const sendSuccessHttp = (res, payload) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
        success: true,
        data: payload,
    }))
}

export const sendErrorHttp = (res, message, statusCode = 400) => {
    res.writeHead(statusCode, { 'Content-type': 'application/json' })
    res.end(JSON.stringify({
        success: false,
        data: { code, message },

    }))
}

export const sendFileHttp = (res, content, contentType) => {
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
};

export const send404Http = (res) => {
    sendErrorHttp(res, 'NOT_FOUND', 'Resource not found', 404);
};

export const send500Http = (res, logMessage) => {
    Logger.error('Internal error:', error);
    sendErrorHttp(res, 'INTERNAL_ERROR', 'Internal server error', 500);
};

export const sendMethodNotAllowedHttp = (res) => {
    sendErrorHttp(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
};

export const sendBadRequestHttp = (res, message = 'Bad request') => {
    sendErrorHttp(res, 'BAD_REQUEST', message, 400);
};

// WS helpers
export const sendSuccessWs = (connection, type, data = {}) => {
    connection.send({
        type,
        ...data,
        timestamp: Date.now()
    });
};

export const sendErrorWs = (connection, code, message) => {
    connection.send({
        type: 'ERROR',
        code,
        message,
        timestamp: Date.now()
    });
};

export const broadcastWs = (connections, type, data = {}) => {
    const message = {
        type,
        ...data,
        timestamp: Date.now()
    };

    for (const connection of connections.values()) {
        if (connection.isConnected()) {
            connection.send(message);
        }
    }
};

export const broadcastExcludeWs = (connections, excludeId, type, data = {}) => {
    const message = {
        type,
        ...data,
        timestamp: Date.now()
    };

    for (const [id, connection] of connections.entries()) {
        if (id !== excludeId && connection.isConnected()) {
            connection.send(message);
        }
    }
};
