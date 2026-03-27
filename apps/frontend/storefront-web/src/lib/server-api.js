import { createDokanxApi } from "@dokanx/api-client";
import { getApiBaseUrl } from "@dokanx/utils";
export function createServerApi(tenant) {
    return createDokanxApi({
        baseUrl: getApiBaseUrl(),
        getTenant: () => tenant
    });
}
