import { createDokanxApi } from "@dokanx/api-client";
import { getApiBaseUrl } from "@dokanx/utils";
import { getAdminTenantConfig } from "./tenant";
export function createServerApi() {
    return createDokanxApi({
        baseUrl: getApiBaseUrl(),
        getTenant: getAdminTenantConfig
    });
}
