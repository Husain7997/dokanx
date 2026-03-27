import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  MerchantFeatureSettings,
  MerchantPricingSafetySettings,
  addMerchantTeamMemberRequest,
  getMerchantShopSettingsRequest,
  listMerchantTeamActivityRequest,
  listMerchantTeamMembersRequest,
  updateMerchantShopSettingsRequest,
  updateMerchantTeamMemberRequest,
} from "../lib/api-client";
import { useMerchantAuthStore } from "../store/auth-store";
import { getMerchantPalette, MerchantLanguage, MerchantThemeMode, useMerchantUiStore, useResolvedMerchantTheme } from "../store/ui-store";
import { MerchantTopNav } from "./merchant-top-nav";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  permissions: string[];
};

type TeamActivityEntry = {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
  targetType: string;
};

type TeamInviteForm = {
  name: string;
  email: string;
  phone: string;
  role: "STAFF" | "OWNER";
  permissions: string[];
};

type KycForm = {
  status: string;
  submittedAt: string;
  approvedAt: string;
  rejectedAt: string;
  rejectionReason: string;
  profilePhotoUrl: string;
  nationalIdNumber: string;
  nationalIdFrontUrl: string;
  nationalIdBackUrl: string;
  tradeLicenseNumber: string;
  tradeLicenseUrl: string;
};

type SettingsForm = {
  name: string;
  supportEmail: string;
  whatsapp: string;
  payoutSchedule: string;
  settlementFrequency: string;
  settlementDelayDays: string;
  settlementNotes: string;
  settlementBankName: string;
  settlementAccountName: string;
  settlementAccountNumber: string;
  settlementRoutingNumber: string;
  settlementBranchName: string;
  preferredBankGateway: string;
  storefrontDomain: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  merchantFeatures: Required<MerchantFeatureSettings>;
  pricingSafety: Required<MerchantPricingSafetySettings>;
  kyc: KycForm;
};

const defaultForm: SettingsForm = {
  name: "",
  supportEmail: "",
  whatsapp: "",
  payoutSchedule: "",
  settlementFrequency: "DAILY",
  settlementDelayDays: "1",
  settlementNotes: "",
  settlementBankName: "",
  settlementAccountName: "",
  settlementAccountNumber: "",
  settlementRoutingNumber: "",
  settlementBranchName: "",
  preferredBankGateway: "BKASH",
  storefrontDomain: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  country: "",
  merchantFeatures: {
    posScannerEnabled: true,
    cameraScannerEnabled: true,
    bluetoothScannerEnabled: true,
    productSearchEnabled: true,
    discountToolsEnabled: true,
    pricingSafetyEnabled: true,
    splitPaymentEnabled: true,
  },
  pricingSafety: {
    greenMinMarginPct: 0,
    limeMinMarginPct: -2,
    yellowMinMarginPct: -5,
    orangeMinMarginPct: -10,
    redBelowCost: true,
  },
  kyc: {
    status: "NOT_SUBMITTED",
    submittedAt: "",
    approvedAt: "",
    rejectedAt: "",
    rejectionReason: "",
    profilePhotoUrl: "",
    nationalIdNumber: "",
    nationalIdFrontUrl: "",
    nationalIdBackUrl: "",
    tradeLicenseNumber: "",
    tradeLicenseUrl: "",
  },
};

const TEAM_PERMISSION_OPTIONS = ["POS", "ORDERS", "PRODUCTS", "CUSTOMERS", "WALLET", "FINANCE"] as const;

const FEATURE_LABELS: Array<{ key: keyof SettingsForm["merchantFeatures"]; title: string; note: string; titleBn: string; noteBn: string }> = [
  { key: "posScannerEnabled", title: "POS scanner tools", note: "Scanner-related tools appear in POS.", titleBn: "????? ????????? ???", noteBn: "????????? ????????? ??? ?????? ???? ????" },
  { key: "cameraScannerEnabled", title: "In-app camera scan", note: "Use phone camera inside POS.", titleBn: "??????? ???? ???????? ???????", noteBn: "??????? ????? ????? ???????? ??????? ????" },
  { key: "bluetoothScannerEnabled", title: "Bluetooth scanner input", note: "Use barcode scanner as keyboard wedge.", titleBn: "??????? ????????? ?????", noteBn: "?????? ??????????? ??????? ????? ?????? ??????? ????" },
  { key: "productSearchEnabled", title: "Product search", note: "Show quick search in POS and Products.", titleBn: "???? ?????", noteBn: "????? ? ????? ????? ????? ?????" },
  { key: "discountToolsEnabled", title: "Discount tools", note: "Enable per-item and bulk discount controls.", titleBn: "????????? ???", noteBn: "????? ???? ? bulk discount ???????? ???? ????" },
  { key: "pricingSafetyEnabled", title: "Pricing safety alerts", note: "Show profit-risk color signals.", titleBn: "???????? ????? ?????????", noteBn: "???-?????? ????? ???????? ?????" },
  { key: "splitPaymentEnabled", title: "Split payment", note: "Allow cash + wallet + online mixed payments.", titleBn: "??????? ???????", noteBn: "????? + ?????? + ?????? ????? ??????? ???? ????" },
];

const THEME_OPTIONS: Array<{ value: MerchantThemeMode; label: string; labelBn: string }> = [
  { value: "system", label: "System", labelBn: "???????" },
  { value: "light", label: "Light", labelBn: "????" },
  { value: "dark", label: "Dark", labelBn: "?????" },
];

const LANGUAGE_OPTIONS: Array<{ value: MerchantLanguage; label: string; labelBn: string }> = [
  { value: "en", label: "English", labelBn: "??????" },
  { value: "bn", label: "Bangla", labelBn: "?????" },
];

export function MerchantSettingsScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const profile = useMerchantAuthStore((state) => state.profile);
  const signOut = useMerchantAuthStore((state) => state.signOut);
  const refreshProfile = useMerchantAuthStore((state) => state.refreshProfile);
  const themeMode = useMerchantUiStore((state) => state.themeMode);
  const language = useMerchantUiStore((state) => state.language);
  const setThemeMode = useMerchantUiStore((state) => state.setThemeMode);
  const setLanguage = useMerchantUiStore((state) => state.setLanguage);
  const resolvedTheme = useResolvedMerchantTheme();
  const palette = getMerchantPalette(resolvedTheme);
  const [form, setForm] = useState<SettingsForm>(defaultForm);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamActivity, setTeamActivity] = useState<TeamActivityEntry[]>([]);
  const [teamInvite, setTeamInvite] = useState<TeamInviteForm>({ name: "", email: "", phone: "", role: "STAFF", permissions: ["POS", "ORDERS"] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isManagingTeam, setIsManagingTeam] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const copy = language === "bn"
    ? {
        title: "????? ??????",
        subtitle: "????????? ????????",
        settingsUnavailable: "?????? ????? ?????? ??",
        businessIdentity: "??????? ?????",
        operations: "???????",
        uiPreferences: "??? ? ????",
        featureSwitches: "????? ????",
        pricingSafetyBands: "???????? ????? ???????",
        marginHelper: "??????? ????????????? ???? ??????????? ???????? ???? margin % ????? ???",
        session: "????",
        role: "??????",
        shopId: "?? ????",
        loading: "?????",
        syncing: "????????? ???? ????? ?????",
        ready: "????",
        save: "?????? ??? ????",
        saving: "??? ?????...",
        reload: "????????? ???? ?????",
        signOut: "???? ???",
        saved: "????? ??????, ????? ????, ?? UI preference ??? ??????",
        redAlert: "??????????? ???? ??? ?????????",
        redAlertNote: "??????????? cost price-?? ???? ???? ??? ???????? ??????",
      }
    : {
        title: "Store settings",
        subtitle: "Merchant profile",
        settingsUnavailable: "Settings unavailable",
        businessIdentity: "Business identity",
        operations: "Operations",
        uiPreferences: "Theme and language",
        featureSwitches: "Feature switches",
        pricingSafetyBands: "Pricing safety bands",
        marginHelper: "Margin % is measured from final selling price against cost price.",
        session: "Session",
        role: "Role",
        shopId: "Shop ID",
        loading: "Loading",
        syncing: "Syncing with backend",
        ready: "Ready",
        save: "Save settings",
        saving: "Saving...",
        reload: "Reload from backend",
        signOut: "Sign out",
        saved: "Store settings, feature switches, and UI preferences saved.",
        redAlert: "Red alert below cost",
        redAlertNote: "Show red signal whenever sale goes below cost price.",
      };

  const loadSettings = useCallback(async () => {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus(null);

    try {
      const [response, teamResponse, activityResponse] = await Promise.all([
        getMerchantShopSettingsRequest(accessToken),
        profile?.role === "OWNER" || profile?.role === "ADMIN" ? listMerchantTeamMembersRequest(accessToken) : Promise.resolve({ data: [] }),
        profile?.role === "OWNER" || profile?.role === "ADMIN" ? listMerchantTeamActivityRequest(accessToken) : Promise.resolve({ data: [] }),
      ]);
      setForm({
        name: String(response.data?.name || ""),
        supportEmail: String(response.data?.supportEmail || profile?.email || ""),
        whatsapp: String(response.data?.whatsapp || profile?.phone || ""),
        payoutSchedule: String(response.data?.payoutSchedule || ""),
        settlementFrequency: String(response.data?.settlementFrequency || "DAILY"),
        settlementDelayDays: String(response.data?.settlementDelayDays ?? "1"),
        settlementNotes: String(response.data?.settlementNotes || ""),
        settlementBankName: String(response.data?.settlementBankName || ""),
        settlementAccountName: String(response.data?.settlementAccountName || ""),
        settlementAccountNumber: String(response.data?.settlementAccountNumber || ""),
        settlementRoutingNumber: String(response.data?.settlementRoutingNumber || ""),
        settlementBranchName: String(response.data?.settlementBranchName || ""),
        preferredBankGateway: String(response.data?.preferredBankGateway || "BKASH"),
        storefrontDomain: String(response.data?.storefrontDomain || ""),
        addressLine1: String(response.data?.addressLine1 || ""),
        addressLine2: String(response.data?.addressLine2 || ""),
        city: String(response.data?.city || ""),
        country: String(response.data?.country || ""),
        merchantFeatures: {
          ...defaultForm.merchantFeatures,
          ...(response.data?.merchantFeatures || {}),
        },
        pricingSafety: {
          ...defaultForm.pricingSafety,
          ...(response.data?.pricingSafety || {}),
        },
        kyc: {
          ...defaultForm.kyc,
          status: String(response.data?.kyc?.status || defaultForm.kyc.status),
          submittedAt: String(response.data?.kyc?.submittedAt || ""),
          approvedAt: String(response.data?.kyc?.approvedAt || ""),
          rejectedAt: String(response.data?.kyc?.rejectedAt || ""),
          rejectionReason: String(response.data?.kyc?.rejectionReason || ""),
          profilePhotoUrl: String(response.data?.kyc?.profilePhotoUrl || ""),
          nationalIdNumber: String(response.data?.kyc?.nationalIdNumber || ""),
          nationalIdFrontUrl: String(response.data?.kyc?.nationalIdFrontUrl || ""),
          nationalIdBackUrl: String(response.data?.kyc?.nationalIdBackUrl || ""),
          tradeLicenseNumber: String(response.data?.kyc?.tradeLicenseNumber || ""),
          tradeLicenseUrl: String(response.data?.kyc?.tradeLicenseUrl || ""),
        },
      });
      setTeamMembers(((teamResponse.data || []) as Array<{ _id?: string; name?: string; email?: string; phone?: string; role?: string; permissionOverrides?: string[] }>).map((item) => ({
        id: String(item._id || ""),
        name: String(item.name || "Team member"),
        email: String(item.email || ""),
        phone: String(item.phone || ""),
        role: String(item.role || "STAFF"),
        permissions: Array.isArray(item.permissionOverrides) ? item.permissionOverrides.map((entry) => String(entry)) : [],
      })).filter((item) => item.id));
      setTeamActivity(((activityResponse.data || []) as Array<{ id?: string; action?: string; actorName?: string; actorRole?: string; createdAt?: string; targetType?: string }>).map((item) => ({
        id: String(item.id || ""),
        action: String(item.action || "ACTION"),
        actorName: String(item.actorName || "Team member"),
        actorRole: String(item.actorRole || "STAFF"),
        createdAt: String(item.createdAt || ""),
        targetType: String(item.targetType || "System"),
      })).filter((item) => item.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load merchant settings.");
      setForm({
        ...defaultForm,
        supportEmail: profile?.email || "",
        whatsapp: profile?.phone || "",
      });
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, profile?.email, profile?.phone]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function updateField(field: keyof Omit<SettingsForm, "merchantFeatures" | "pricingSafety">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleFeature(field: keyof SettingsForm["merchantFeatures"]) {
    setForm((current) => ({
      ...current,
      merchantFeatures: {
        ...current.merchantFeatures,
        [field]: !current.merchantFeatures[field],
      },
    }));
  }

  function updateSafetyField(field: keyof SettingsForm["pricingSafety"], value: string | boolean) {
    setForm((current) => ({
      ...current,
      pricingSafety: {
        ...current.pricingSafety,
        [field]: typeof value === "boolean" ? value : Number(value || 0),
      },
    }));
  }

  function toggleTeamPermission(permission: string) {
    setTeamInvite((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function handleInviteTeamMember() {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      return;
    }
    if (!teamInvite.email.trim()) {
      setError("Team member email is required.");
      return;
    }

    setIsManagingTeam(true);
    setError(null);
    try {
      const response = await addMerchantTeamMemberRequest(accessToken, {
        name: teamInvite.name.trim() || undefined,
        email: teamInvite.email.trim(),
        phone: teamInvite.phone.trim() || undefined,
        role: teamInvite.role,
        permissions: teamInvite.permissions,
      });
      await loadSettings();
      setTeamInvite({ name: "", email: "", phone: "", role: "STAFF", permissions: ["POS", "ORDERS"] });
      setStatus(response.invite?.inviteUrl ? `Team member invited. Invite link ready until ${response.invite.expiresAt || "expiry"}.` : "Team member invited and reloaded.");
    } catch (teamError) {
      setError(teamError instanceof Error ? teamError.message : "Unable to invite team member.");
    } finally {
      setIsManagingTeam(false);
    }
  }

  async function handleUpdateTeamMember(memberId: string, role: string, permissions: string[], resendInvite = false) {
    if (!accessToken) return;
    setIsManagingTeam(true);
    setError(null);
    try {
      const response = await updateMerchantTeamMemberRequest(accessToken, memberId, { role, permissions, resendInvite });
      await loadSettings();
      setStatus(response.invite?.inviteUrl ? `Team member updated. Invite refreshed until ${response.invite.expiresAt || "expiry"}.` : "Team member updated and reloaded.");
    } catch (teamError) {
      setError(teamError instanceof Error ? teamError.message : "Unable to update team member.");
    } finally {
      setIsManagingTeam(false);
    }
  }

  function updateKycField(field: keyof SettingsForm["kyc"], value: string) {
    setForm((current) => ({ ...current, kyc: { ...current.kyc, [field]: value } }));
  }

  async function handleSubmitKyc() {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatus(null);
    try {
      await updateMerchantShopSettingsRequest(accessToken, { ...form, settlementDelayDays: Number(form.settlementDelayDays || 0), kyc: {
        profilePhotoUrl: form.kyc.profilePhotoUrl,
        nationalIdNumber: form.kyc.nationalIdNumber,
        nationalIdFrontUrl: form.kyc.nationalIdFrontUrl,
        nationalIdBackUrl: form.kyc.nationalIdBackUrl,
        tradeLicenseNumber: form.kyc.tradeLicenseNumber,
        tradeLicenseUrl: form.kyc.tradeLicenseUrl,
        submit: true,
      } });
      await Promise.all([loadSettings(), refreshProfile()]);
      setStatus("KYC submitted for admin approval.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to submit merchant KYC.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatus(null);

    try {
      await updateMerchantShopSettingsRequest(accessToken, { ...form, settlementDelayDays: Number(form.settlementDelayDays || 0) });
      await Promise.all([loadSettings(), refreshProfile()]);
      setStatus(copy.saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save merchant settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: palette.screen }] }>
      <ScrollView contentContainerStyle={styles.container}>
        <MerchantTopNav active="Settings" />
        <View style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.border }] }>
          <Text style={[styles.title, { color: palette.text }]}>{copy.title}</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>{profile?.name || profile?.email || copy.subtitle}</Text>
        </View>

        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>{copy.settingsUnavailable}</Text><Text style={styles.alertBody}>{error}</Text></View> : null}
        {status ? <View style={styles.alertInfo}><Text style={styles.alertBody}>{status}</Text></View> : null}

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }] }>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{copy.uiPreferences}</Text>
          <Text style={[styles.helperText, { color: palette.muted }]}>{language === "bn" ? "???? ???? ??????? ?? ?? ???? ????????? ?????" : "Control app colors and labels from here."}</Text>
          <View style={styles.optionRow}>
            {THEME_OPTIONS.map((option) => {
              const active = themeMode === option.value;
              return (
                <Pressable key={option.value} style={[styles.segment, { borderColor: palette.border, backgroundColor: active ? palette.accent : palette.surfaceAlt }]} onPress={() => void setThemeMode(option.value)}>
                  <Text style={[styles.segmentText, { color: active ? palette.accentText : palette.text }]}>{language === "bn" ? option.labelBn : option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.optionRow}>
            {LANGUAGE_OPTIONS.map((option) => {
              const active = language === option.value;
              return (
                <Pressable key={option.value} style={[styles.segment, { borderColor: palette.border, backgroundColor: active ? palette.accent : palette.surfaceAlt }]} onPress={() => void setLanguage(option.value)}>
                  <Text style={[styles.segmentText, { color: active ? palette.accentText : palette.text }]}>{language === "bn" ? option.labelBn : option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }] }>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{copy.businessIdentity}</Text>
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.name} onChangeText={(value) => updateField("name", value)} placeholder="Store name" placeholderTextColor={palette.muted} />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.supportEmail} onChangeText={(value) => updateField("supportEmail", value)} placeholder="Support email" placeholderTextColor={palette.muted} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.whatsapp} onChangeText={(value) => updateField("whatsapp", value)} placeholder="WhatsApp number" placeholderTextColor={palette.muted} keyboardType="phone-pad" />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.storefrontDomain} onChangeText={(value) => updateField("storefrontDomain", value)} placeholder="Storefront domain" placeholderTextColor={palette.muted} autoCapitalize="none" />
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }] }>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{copy.operations}</Text>
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.payoutSchedule} onChangeText={(value) => updateField("payoutSchedule", value)} placeholder="Payout schedule" placeholderTextColor={palette.muted} />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.addressLine1} onChangeText={(value) => updateField("addressLine1", value)} placeholder="Address line 1" placeholderTextColor={palette.muted} />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.addressLine2} onChangeText={(value) => updateField("addressLine2", value)} placeholder="Address line 2" placeholderTextColor={palette.muted} />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.city} onChangeText={(value) => updateField("city", value)} placeholder="City" placeholderTextColor={palette.muted} />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.country} onChangeText={(value) => updateField("country", value)} placeholder="Country" placeholderTextColor={palette.muted} />
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }] }>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{copy.featureSwitches}</Text>
          {FEATURE_LABELS.map((item) => {
            const enabled = form.merchantFeatures[item.key];
            return (
              <Pressable key={item.key} style={[styles.toggleRow, { borderColor: palette.border, backgroundColor: enabled ? palette.surface : palette.surfaceAlt }]} onPress={() => toggleFeature(item.key)}>
                <View style={styles.toggleTextWrap}>
                  <Text style={[styles.toggleTitle, { color: palette.text }]}>{language === "bn" ? item.titleBn : item.title}</Text>
                  <Text style={[styles.toggleNote, { color: palette.muted }]}>{language === "bn" ? item.noteBn : item.note}</Text>
                </View>
                <View style={[styles.togglePill, { backgroundColor: enabled ? palette.accent : palette.border }] }>
                  <Text style={[styles.togglePillText, { color: enabled ? palette.accentText : palette.text }]}>{enabled ? "ON" : "OFF"}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }] }>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{copy.pricingSafetyBands}</Text>
          <Text style={[styles.helperText, { color: palette.muted }]}>{copy.marginHelper}</Text>
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={String(form.pricingSafety.greenMinMarginPct)} onChangeText={(value) => updateSafetyField("greenMinMarginPct", value)} placeholder="Green minimum margin %" placeholderTextColor={palette.muted} keyboardType="numeric" />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={String(form.pricingSafety.limeMinMarginPct)} onChangeText={(value) => updateSafetyField("limeMinMarginPct", value)} placeholder="Lime minimum margin %" placeholderTextColor={palette.muted} keyboardType="numeric" />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={String(form.pricingSafety.yellowMinMarginPct)} onChangeText={(value) => updateSafetyField("yellowMinMarginPct", value)} placeholder="Yellow minimum margin %" placeholderTextColor={palette.muted} keyboardType="numeric" />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={String(form.pricingSafety.orangeMinMarginPct)} onChangeText={(value) => updateSafetyField("orangeMinMarginPct", value)} placeholder="Orange minimum margin %" placeholderTextColor={palette.muted} keyboardType="numeric" />
          <Pressable style={[styles.toggleRow, { borderColor: palette.border, backgroundColor: form.pricingSafety.redBelowCost ? palette.surface : palette.surfaceAlt }]} onPress={() => updateSafetyField("redBelowCost", !form.pricingSafety.redBelowCost)}>
            <View style={styles.toggleTextWrap}>
              <Text style={[styles.toggleTitle, { color: palette.text }]}>{copy.redAlert}</Text>
              <Text style={[styles.toggleNote, { color: palette.muted }]}>{copy.redAlertNote}</Text>
            </View>
            <View style={[styles.togglePill, { backgroundColor: form.pricingSafety.redBelowCost ? palette.accent : palette.border }] }>
              <Text style={[styles.togglePillText, { color: form.pricingSafety.redBelowCost ? palette.accentText : palette.text }]}>{form.pricingSafety.redBelowCost ? "ON" : "OFF"}</Text>
            </View>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }] }>
          <Text style={[styles.cardTitle, { color: palette.text }]}>KYC and approval</Text>
          <Text style={[styles.helperText, { color: palette.muted }]}>Submit merchant identity and business documents for admin approval.</Text>
          <Text style={[styles.row, { color: palette.text }]}>Status: {form.kyc.status}</Text>
          {form.kyc.submittedAt ? <Text style={[styles.row, { color: palette.text }]}>Submitted: {form.kyc.submittedAt.slice(0, 10)}</Text> : null}
          {form.kyc.approvedAt ? <Text style={[styles.row, { color: palette.text }]}>Approved: {form.kyc.approvedAt.slice(0, 10)}</Text> : null}
          {form.kyc.rejectedAt ? <Text style={[styles.row, { color: palette.text }]}>Rejected: {form.kyc.rejectedAt.slice(0, 10)}</Text> : null}
          {form.kyc.rejectionReason ? <Text style={[styles.helperText, { color: "#991b1b" }]}>Reason: {form.kyc.rejectionReason}</Text> : null}
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.kyc.profilePhotoUrl} onChangeText={(value) => updateKycField("profilePhotoUrl", value)} placeholder="Profile photo URL" placeholderTextColor={palette.muted} autoCapitalize="none" />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.kyc.nationalIdNumber} onChangeText={(value) => updateKycField("nationalIdNumber", value)} placeholder="National ID number" placeholderTextColor={palette.muted} />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.kyc.nationalIdFrontUrl} onChangeText={(value) => updateKycField("nationalIdFrontUrl", value)} placeholder="NID front image URL" placeholderTextColor={palette.muted} autoCapitalize="none" />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.kyc.nationalIdBackUrl} onChangeText={(value) => updateKycField("nationalIdBackUrl", value)} placeholder="NID back image URL" placeholderTextColor={palette.muted} autoCapitalize="none" />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.kyc.tradeLicenseNumber} onChangeText={(value) => updateKycField("tradeLicenseNumber", value)} placeholder="Trade license number (optional)" placeholderTextColor={palette.muted} />
          <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={form.kyc.tradeLicenseUrl} onChangeText={(value) => updateKycField("tradeLicenseUrl", value)} placeholder="Trade license image URL (optional)" placeholderTextColor={palette.muted} autoCapitalize="none" />
          <Pressable style={[styles.primaryButton, { backgroundColor: palette.text }]} onPress={() => void handleSubmitKyc()}>
            <Text style={[styles.primaryButtonText, { color: palette.screen }]}>{isSaving ? "Submitting..." : "Submit KYC"}</Text>
          </Pressable>
        </View>

        {(profile?.role === "OWNER" || profile?.role === "ADMIN") ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }] }>
            <Text style={[styles.cardTitle, { color: palette.text }]}>Team and access</Text>
            <Text style={[styles.helperText, { color: palette.muted }]}>Invite staff, assign role, and control workflow access.</Text>
            <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={teamInvite.name} onChangeText={(value) => setTeamInvite((current) => ({ ...current, name: value }))} placeholder="Staff name" placeholderTextColor={palette.muted} />
            <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={teamInvite.email} onChangeText={(value) => setTeamInvite((current) => ({ ...current, email: value }))} placeholder="Staff email" placeholderTextColor={palette.muted} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text }]} value={teamInvite.phone} onChangeText={(value) => setTeamInvite((current) => ({ ...current, phone: value }))} placeholder="Staff phone" placeholderTextColor={palette.muted} keyboardType="phone-pad" />
            <View style={styles.optionRow}>
              {(["STAFF", "OWNER"] as const).map((roleOption) => {
                const active = teamInvite.role === roleOption;
                return (
                  <Pressable key={roleOption} style={[styles.segment, { borderColor: palette.border, backgroundColor: active ? palette.accent : palette.surfaceAlt }]} onPress={() => setTeamInvite((current) => ({ ...current, role: roleOption }))}>
                    <Text style={[styles.segmentText, { color: active ? palette.accentText : palette.text }]}>{roleOption}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.permissionsWrap}>
              {TEAM_PERMISSION_OPTIONS.map((permission) => {
                const active = teamInvite.permissions.includes(permission);
                return (
                  <Pressable key={permission} style={[styles.permissionChip, { borderColor: palette.border, backgroundColor: active ? palette.accent : palette.surfaceAlt }]} onPress={() => toggleTeamPermission(permission)}>
                    <Text style={[styles.permissionChipText, { color: active ? palette.accentText : palette.text }]}>{permission}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={[styles.primaryButton, { backgroundColor: palette.text }]} onPress={() => void handleInviteTeamMember()}>
              <Text style={[styles.primaryButtonText, { color: palette.screen }]}>{isManagingTeam ? "Processing..." : "Invite team member"}</Text>
            </Pressable>
            {teamMembers.map((member) => (
              <View key={member.id} style={[styles.teamCard, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
                <View style={styles.teamHeader}>
                  <View style={styles.teamMeta}>
                    <Text style={[styles.toggleTitle, { color: palette.text }]}>{member.name}</Text>
                    <Text style={[styles.toggleNote, { color: palette.muted }]}>{member.email}</Text>
                    <Text style={[styles.toggleNote, { color: palette.muted }]}>{member.role} {member.phone ? `| ${member.phone}` : ""}</Text>
                  </View>
                  <Pressable style={[styles.permissionChip, { borderColor: palette.border, backgroundColor: palette.surface }]} onPress={() => void handleUpdateTeamMember(member.id, member.role === "STAFF" ? "OWNER" : "STAFF", member.permissions)}>
                    <Text style={[styles.permissionChipText, { color: palette.text }]}>{member.role === "STAFF" ? "Make owner" : "Make staff"}</Text>
                  </Pressable>
                </View>
                <View style={styles.permissionsWrap}>
                  {TEAM_PERMISSION_OPTIONS.map((permission) => {
                    const active = member.permissions.includes(permission);
                    return (
                      <Pressable key={`${member.id}-${permission}`} style={[styles.permissionChip, { borderColor: palette.border, backgroundColor: active ? palette.accent : palette.surface }]} onPress={() => void handleUpdateTeamMember(member.id, member.role, active ? member.permissions.filter((item) => item !== permission) : [...member.permissions, permission])}>
                        <Text style={[styles.permissionChipText, { color: active ? palette.accentText : palette.text }]}>{permission}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable style={[styles.secondaryButton, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => void handleUpdateTeamMember(member.id, member.role, member.permissions, true)}>
                  <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Resend invite</Text>
                </Pressable>
              </View>
            ))}
            <Text style={[styles.cardTitle, { color: palette.text }]}>Recent team activity</Text>
            {teamActivity.length ? teamActivity.map((entry) => (
              <View key={entry.id} style={[styles.teamCard, { borderColor: palette.border, backgroundColor: palette.surface }] }>
                <Text style={[styles.toggleTitle, { color: palette.text }]}>{entry.actorName} � {entry.actorRole}</Text>
                <Text style={[styles.toggleNote, { color: palette.muted }]}>{entry.action} � {entry.targetType}</Text>
                <Text style={[styles.toggleNote, { color: palette.muted }]}>{entry.createdAt ? entry.createdAt.slice(0, 16).replace("T", " ") : "Recent"}</Text>
              </View>
            )) : <Text style={[styles.helperText, { color: palette.muted }]}>No recent staff activity yet.</Text>}
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }] }>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{copy.session}</Text>
          <Text style={[styles.row, { color: palette.text }]}>{copy.role}: {profile?.role || "Not loaded"}</Text>
          <Text style={[styles.row, { color: palette.text }]}>{copy.shopId}: {profile?.shopId || "Not loaded"}</Text>
          <Text style={[styles.row, { color: palette.text }]}>{copy.loading}: {isLoading ? copy.syncing : copy.ready}</Text>
        </View>

        <Pressable style={[styles.primaryButton, { backgroundColor: palette.text }]} onPress={() => void handleSave()}>
          <Text style={[styles.primaryButtonText, { color: palette.screen }]}>{isSaving ? copy.saving : copy.save}</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => void loadSettings()}>
          <Text style={[styles.secondaryButtonText, { color: palette.text }]}>{copy.reload}</Text>
        </Pressable>
        <Pressable style={[styles.signOutButton, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]} onPress={() => void signOut()}>
          <Text style={[styles.signOutText, { color: palette.text }]}>{copy.signOut}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 16, gap: 12, paddingBottom: 110 },
  hero: { borderRadius: 18, padding: 16, gap: 6, borderWidth: 1 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 12 },
  alertError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  alertInfo: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 14, padding: 14 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  alertBody: { fontSize: 12, color: "#374151" },
  card: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  helperText: { fontSize: 11 },
  optionRow: { flexDirection: "row", gap: 8 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  segmentText: { fontSize: 12, fontWeight: "700" },
  toggleRow: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  toggleTextWrap: { flex: 1, gap: 4 },
  toggleTitle: { fontSize: 13, fontWeight: "700" },
  toggleNote: { fontSize: 11 },
  togglePill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  permissionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  permissionChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  permissionChipText: { fontSize: 11, fontWeight: "700" },
  teamCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  teamHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  teamMeta: { flex: 1, gap: 3 },
  togglePillText: { fontSize: 11, fontWeight: "700" },
  row: { fontSize: 13 },
  primaryButton: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { fontSize: 14, fontWeight: "700" },
  secondaryButton: { borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  secondaryButtonText: { fontSize: 14, fontWeight: "700" },
  signOutButton: { borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  signOutText: { fontSize: 14, fontWeight: "700" },
});

