import { ListTelegramGroupsResponseSchema, CreateTelegramGroupResponseSchema, UpdateTelegramGroupResponseSchema, DeleteTelegramGroupResponseSchema, StartGroupTestResponseSchema, GetGroupTestStatusResponseSchema, SimulateTestMessageResponseSchema, } from '@mahalla-ovozi/api-contracts';
import { request } from '../lib/api-client.js';
export const telegramGroupClient = {
    listGroups(districtId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/groups`, {
            method: 'GET',
        }, ListTelegramGroupsResponseSchema);
    },
    createGroup(districtId, payload) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/groups`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }, CreateTelegramGroupResponseSchema);
    },
    updateGroup(districtId, groupId, payload) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/groups/${encodeURIComponent(groupId)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }, UpdateTelegramGroupResponseSchema);
    },
    deleteGroup(districtId, groupId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/groups/${encodeURIComponent(groupId)}`, {
            method: 'DELETE',
        }, DeleteTelegramGroupResponseSchema);
    },
    startTest(districtId, groupId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/groups/${encodeURIComponent(groupId)}/start-test`, {
            method: 'POST',
        }, StartGroupTestResponseSchema);
    },
    getTestStatus(districtId, groupId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/groups/${encodeURIComponent(groupId)}/test-status`, {
            method: 'GET',
        }, GetGroupTestStatusResponseSchema);
    },
    simulateTestMessage(districtId, groupId, payload) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/groups/${encodeURIComponent(groupId)}/simulate-test-message`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }, SimulateTestMessageResponseSchema);
    },
};
