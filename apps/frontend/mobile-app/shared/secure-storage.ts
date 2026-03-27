import * as Keychain from "react-native-keychain";

import { STORAGE_KEYS } from "./constants";

export async function saveAccessToken(token: string) {
  await Keychain.setGenericPassword("access-token", token, {
    service: STORAGE_KEYS.authTokenService,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getAccessToken() {
  const credentials = await Keychain.getGenericPassword({
    service: STORAGE_KEYS.authTokenService,
  });

  if (!credentials) {
    return null;
  }

  return credentials.password;
}

export async function clearAccessToken() {
  await Keychain.resetGenericPassword({
    service: STORAGE_KEYS.authTokenService,
  });
}

export async function saveJsonValue(service: string, value: unknown) {
  await Keychain.setGenericPassword("json", JSON.stringify(value), {
    service,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getJsonValue<T>(service: string) {
  const credentials = await Keychain.getGenericPassword({ service });
  if (!credentials) return null;

  try {
    return JSON.parse(credentials.password) as T;
  } catch {
    return null;
  }
}

export async function clearJsonValue(service: string) {
  await Keychain.resetGenericPassword({ service });
}
