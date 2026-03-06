import { useEffect, useMemo, useState } from "react";
import boonLogo from "../../assets/boon.png";
import { Globe, Lock, LogOut, Moon, Store, Sun, User } from "lucide-react";
import type { AuthUser, SupplierProfile } from "../api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export type Language = "en" | "fr" | "ar";
export type ThemeMode = "light" | "dark" | "system";

type Texts = {
  title: string;
  subtitle: string;
  profileCard: string;
  languageCard: string;
  languageLabel: string;
  themeCard: string;
  themeLabel: string;
  securityCard: string;
  fullName: string;
  phone: string;
  email: string;
  verification: string;
  verified: string;
  notVerified: string;
  saveProfile: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  updatePassword: string;
  logout: string;
  langEnglish: string;
  langFrench: string;
  langArabic: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  storeProfileCard: string;
  storeName: string;
  address: string;
  ice: string;
  rc: string;
  footerNote: string;
  saveStoreProfile: string;
};

type Props = {
  user: AuthUser;
  language: Language;
  themeMode: ThemeMode;
  texts: Texts;
  isSavingProfile: boolean;
  isSavingStoreProfile: boolean;
  isChangingPassword: boolean;
  notice: string | null;
  error: string | null;
  supplierProfile: SupplierProfile | null;
  onLanguageChange: (language: Language) => void;
  onThemeModeChange: (mode: ThemeMode) => void;
  onSaveProfile: (payload: { fullName: string; email?: string | null }) => Promise<void>;
  onSaveStoreProfile: (payload: {
    storeName: string;
    phone: string;
    address: string;
    ice?: string;
    rc?: string;
    footerNote?: string;
    logoUrl?: string;
  }) => Promise<void>;
  onChangePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
  onLogout: () => void;
};

export function Profile({
  user,
  language,
  themeMode,
  texts,
  isSavingProfile,
  isSavingStoreProfile,
  isChangingPassword,
  notice,
  error,
  supplierProfile,
  onLanguageChange,
  onThemeModeChange,
  onSaveProfile,
  onSaveStoreProfile,
  onChangePassword,
  onLogout,
}: Props) {
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeIce, setStoreIce] = useState("");
  const [storeRc, setStoreRc] = useState("");
  const [storeFooter, setStoreFooter] = useState("");
  const [storeLogoUrl, setStoreLogoUrl] = useState("");

  useEffect(() => {
    setFullName(user.fullName);
    setEmail(user.email ?? "");
  }, [user.email, user.fullName]);

  useEffect(() => {
    setStoreName(supplierProfile?.storeName ?? "");
    setStorePhone(supplierProfile?.phone ?? user.phone);
    setStoreAddress(supplierProfile?.address ?? "");
    setStoreIce(supplierProfile?.ice ?? "");
    setStoreRc(supplierProfile?.rc ?? "");
    setStoreFooter(supplierProfile?.footerNote ?? "");
    setStoreLogoUrl(supplierProfile?.logoUrl ?? "");
  }, [supplierProfile, user.phone]);

  const canSubmitProfile = useMemo(() => fullName.trim().length > 0, [fullName]);
  const verificationLabel = user.phoneVerifiedAt ? texts.verified : texts.notVerified;
  const storeLogoPreview = storeLogoUrl || boonLogo;

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmitProfile) return;
    await onSaveProfile({ fullName: fullName.trim(), email: email.trim() || null });
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return;
    await onChangePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleStoreProfileSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!storeName.trim() || !storePhone.trim() || !storeAddress.trim()) return;
    await onSaveStoreProfile({
      storeName: storeName.trim(),
      phone: storePhone.trim(),
      address: storeAddress.trim(),
      ice: storeIce.trim() || undefined,
      rc: storeRc.trim() || undefined,
      footerNote: storeFooter.trim() || undefined,
      logoUrl: storeLogoUrl.trim() || undefined,
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold">{texts.title}</h2>
        <p className="mt-1 text-muted-foreground">{texts.subtitle}</p>
      </div>

      <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#f6c341,#f58a2a_58%,#d95a1f)] text-black shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <User className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-bold">{user.fullName}</p>
              <p className="text-sm font-medium opacity-90">{user.role}</p>
              <p className="text-xs opacity-80">{user.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {notice && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <Card className="boon-surface border-0 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-amber-500" />
            {texts.profileCard}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleProfileSubmit}>
            <div className="space-y-2">
              <Label htmlFor="profile-full-name">{texts.fullName}</Label>
              <Input
                id="profile-full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">{texts.phone}</Label>
              <Input id="profile-phone" value={user.phone} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">{texts.email}</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{texts.verification}</Label>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-muted px-3 py-3 text-sm">
                <span>{verificationLabel}</span>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                    user.phoneVerifiedAt
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  }`}
                >
                  {user.phoneVerifiedAt ? texts.verified : texts.notVerified}
                </span>
              </div>
            </div>
            <Button
              type="submit"
              disabled={!canSubmitProfile || isSavingProfile}
              className="w-full bg-primary text-primary-foreground hover:opacity-95"
            >
              {isSavingProfile ? "..." : texts.saveProfile}
            </Button>
          </form>
        </CardContent>
      </Card>

      {user.role === "SUPPLIER" && (
        <Card className="boon-surface border-0 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-amber-500" />
              {texts.storeProfileCard}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleStoreProfileSubmit}>
              <div className="boon-subsurface flex items-center gap-4 p-3">
                <img
                  src={storeLogoPreview}
                  alt={storeName || "BOON"}
                  className="h-16 w-16 rounded-2xl border border-border bg-background object-cover p-1"
                />
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">{storeName || texts.storeName}</p>
                  <p>{storeAddress || texts.address}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store-name">{texts.storeName}</Label>
                <Input
                  id="store-name"
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-phone">{texts.phone}</Label>
                <Input
                  id="store-phone"
                  value={storePhone}
                  onChange={(event) => setStorePhone(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-address">{texts.address}</Label>
                <Input
                  id="store-address"
                  value={storeAddress}
                  onChange={(event) => setStoreAddress(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="store-ice">{texts.ice}</Label>
                  <Input
                    id="store-ice"
                    value={storeIce}
                    onChange={(event) => setStoreIce(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-rc">{texts.rc}</Label>
                  <Input
                    id="store-rc"
                    value={storeRc}
                    onChange={(event) => setStoreRc(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-footer">{texts.footerNote}</Label>
                <Input
                  id="store-footer"
                  value={storeFooter}
                  onChange={(event) => setStoreFooter(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-logo">Logo URL</Label>
                <Input
                  id="store-logo"
                  value={storeLogoUrl}
                  onChange={(event) => setStoreLogoUrl(event.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:opacity-95"
                disabled={isSavingStoreProfile}
              >
                {isSavingStoreProfile ? "..." : texts.saveStoreProfile}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="boon-surface border-0 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-amber-500" />
            {texts.languageCard}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="mb-2 block">{texts.languageLabel}</Label>
          <Select value={language} onValueChange={(value) => onLanguageChange(value as Language)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{texts.langEnglish}</SelectItem>
              <SelectItem value="fr">{texts.langFrench}</SelectItem>
              <SelectItem value="ar">{texts.langArabic}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="boon-surface border-0 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-amber-500" />
            {texts.themeCard}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="mb-2 block">{texts.themeLabel}</Label>
          <Select value={themeMode} onValueChange={(value) => onThemeModeChange(value as ThemeMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <span className="inline-flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  {texts.themeLight}
                </span>
              </SelectItem>
              <SelectItem value="dark">
                <span className="inline-flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  {texts.themeDark}
                </span>
              </SelectItem>
              <SelectItem value="system">{texts.themeSystem}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="boon-surface border-0 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            {texts.securityCard}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2">
              <Label htmlFor="current-password">{texts.currentPassword}</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">{texts.newPassword}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{texts.confirmPassword}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isChangingPassword}
              className="w-full bg-primary text-primary-foreground hover:opacity-95"
            >
              {isChangingPassword ? "..." : texts.updatePassword}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="h-12 w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
        onClick={onLogout}
      >
        <LogOut className="mr-2 h-5 w-5" />
        {texts.logout}
      </Button>
    </div>
  );
}
