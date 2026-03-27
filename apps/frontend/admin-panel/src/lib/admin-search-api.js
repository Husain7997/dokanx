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
export function getSearchStatus() {
    return request("/search/status");
}
export function triggerFullReindex() {
    return request("/search/reindex", {
        method: "POST",
    });
}
export function triggerDeltaReindex() {
    return request("/search/reindex-delta", {
        method: "POST",
    });
}
export function getSearchTrending(params) {
    const query = new URLSearchParams();
    if (params?.days)
        query.set("days", String(params.days));
    if (params?.limit)
        query.set("limit", String(params.limit));
    const suffix = query.toString();
    return request(`/search/trending${suffix ? `?${suffix}` : ""}`);
}
export function getSearchNoResults(params) {
    const query = new URLSearchParams();
    if (params?.days)
        query.set("days", String(params.days));
    if (params?.limit)
        query.set("limit", String(params.limit));
    const suffix = query.toString();
    return request(`/search/no-results${suffix ? `?${suffix}` : ""}`);
}
export function getSearchConversion(params) {
    const query = new URLSearchParams();
    if (params?.days)
        query.set("days", String(params.days));
    const suffix = query.toString();
    return request(`/search/conversion${suffix ? `?${suffix}` : ""}`);
}
