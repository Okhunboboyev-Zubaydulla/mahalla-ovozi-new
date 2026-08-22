import { CreateDistrictResponseSchema, ListDistrictsResponseSchema, GetDistrictResponseSchema, GetDistrictReadinessResponseSchema, ConfirmDisclosureResponseSchema, ActivateDistrictResponseSchema, } from '@mahalla-ovozi/api-contracts';
import { request } from '../lib/api-client.js';
export const districtClient = {
    listDistricts() {
        return request('/api/v1/districts', {
            method: 'GET',
        }, ListDistrictsResponseSchema);
    },
    createDistrict(payload) {
        return request('/api/v1/districts', {
            method: 'POST',
            body: JSON.stringify(payload),
        }, CreateDistrictResponseSchema);
    },
    getDistrict(districtId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}`, {
            method: 'GET',
        }, GetDistrictResponseSchema);
    },
    getDistrictReadiness(districtId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/readiness`, {
            method: 'GET',
        }, GetDistrictReadinessResponseSchema);
    },
    confirmDisclosure(districtId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/disclosure-confirmation`, {
            method: 'POST',
        }, ConfirmDisclosureResponseSchema);
    },
    activateDistrict(districtId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/activate`, {
            method: 'POST',
        }, ActivateDistrictResponseSchema);
    },
};
