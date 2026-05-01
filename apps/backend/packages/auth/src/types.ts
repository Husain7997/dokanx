import type { ReactNode } from "react";

import type { AuthRole, SessionState, SessionUser, TenantConfig } from "@dokanx/types";

export type AuthUser = SessionUser & {
  roleName: AuthRole;
  permissionOverrides?: string[];
  effectivePermissions?: string[];
};

export type AuthState = Omit<SessionState, "user"> & {
  user: AuthUser | null;
  tenant: TenantConfig | null;
};

export type AuthContextValue = AuthState & {
  login: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  restoreSession: () => Promise<void>;
  hasRole: (...roles: AuthRole[]) => boolean;
};

export type AuthProviderProps = {
  children: ReactNode;
  baseUrl: string;
  tenant?: TenantConfig | null;
  storageKey?: string;
};