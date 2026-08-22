import { GetTelegramBotResponseSchema, ConnectTelegramBotResponseSchema, DisconnectTelegramBotResponseSchema, } from '@mahalla-ovozi/api-contracts';
import { request } from '../lib/api-client.js';
export const telegramBotClient = {
    getDistrictTelegramBot(districtId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/telegram-bot`, {
            method: 'GET',
        }, GetTelegramBotResponseSchema);
    },
    connectDistrictTelegramBot(districtId, payload) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/telegram-bot`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }, ConnectTelegramBotResponseSchema);
    },
    disconnectDistrictTelegramBot(districtId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/telegram-bot`, {
            method: 'DELETE',
        }, DisconnectTelegramBotResponseSchema);
    },
};
