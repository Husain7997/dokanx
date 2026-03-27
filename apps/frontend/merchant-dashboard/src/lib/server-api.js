import { createDokanxApi } from "@dokanx/api-client";
import { getApiBaseUrl } from "@dokanx/utils";
import { getDashboardTenantConfig } from "./tenant";
export function createServerApi() {
    return createDokanxApi({
        baseUrl: getApiBaseUrl(),
        getTenant: getDashboardTenantConfig
    });
}
