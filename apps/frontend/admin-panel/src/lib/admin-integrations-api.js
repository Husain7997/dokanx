"use client";
import { useAuthStore } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";
function getHeaders() {
    const store = useAuthStore.getState();
    return {
        "Content-Type": "application/json",
        ...(store.accessToken ? { Authorization: `Bearer ${store.accessToken}` } : {}),
        ...(store.tenant?.id ? { "x-tenant-id": store.tenant.id } : {}),
        ...(store.tenant?.slug ? { "x-tenant-slug": store.tenant.slug } : {}),
    };
}
async function request(path, init = {}) {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        headers: {
            ...getHeaders(),
            ...(init.headers || {}),
        },
    });
    const payload = (await response.json().catch(() => null));
    if (!response.ok) {
        throw new Error(payload?.message || "Request failed");
    }
    return payload;
}
export function listIntegrations() {
    return request("/admin/integrations");
}
export function saveIntegration(payload) {
    return request("/admin/integrations", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
export function testIntegration(provider) {
    return request(`/admin/integrations/${provider}/test`);
}
