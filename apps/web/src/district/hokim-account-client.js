import { GetDistrictHokimAccountResponseSchema, CreateHokimAccountResponseSchema, ResetHokimPasswordResponseSchema, DisableHokimAccountResponseSchema, ReplaceHokimAccountResponseSchema, } from '@mahalla-ovozi/api-contracts';
import { request } from '../lib/api-client.js';
export const hokimAccountClient = {
    getDistrictHokimAccount(districtId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/hokim-account`, {
            method: 'GET',
        }, GetDistrictHokimAccountResponseSchema);
    },
    createDistrictHokimAccount(districtId, payload) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/hokim-account`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }, CreateHokimAccountResponseSchema);
    },
    resetDistrictHokimPassword(districtId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/hokim-account/reset-password`, {
            method: 'POST',
        }, ResetHokimPasswordResponseSchema);
    },
    disableDistrictHokimAccount(districtId) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/hokim-account/disable`, {
            method: 'POST',
        }, DisableHokimAccountResponseSchema);
    },
    replaceDistrictHokimAccount(districtId, payload) {
        return request(`/api/v1/districts/${encodeURIComponent(districtId)}/hokim-account/replace`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }, ReplaceHokimAccountResponseSchema);
    },
};
