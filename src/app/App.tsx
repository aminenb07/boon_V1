import { useEffect, useMemo, useState } from "react";
import {
  changeMyPassword,
  getMe,
  getSupplierProfile,
  updateMe,
  upsertSupplierProfile,
} from "./api";
import type { AuthResponse, Role, SupplierProfile } from "./api";
import { AuthGate } from "./components/AuthGate";
import { BoonCenter } from "./components/BoonCenter";
import { BottomNav, TAB_ICONS } from "./components/BottomNav";
import type { BottomTabId } from "./components/BottomNav";
import { Dashboard } from "./components/Dashboard";
import { Profile } from "./components/Profile";
import type { Language, ThemeMode } from "./components/Profile";
import { Reports } from "./components/Reports";
import { RoomLive } from "./components/RoomLive";

const AUTH_STORAGE_KEY = "boon.auth.v2";
const LANGUAGE_STORAGE_KEY = "boon.language.v1";
const THEME_STORAGE_KEY = "boon.theme.v1";

const COPY = {
  en: {
    appTitle: "BOON Construction System",
    loading: "Loading BOON...",
    nav: {
      dashboard: "Home",
      rooms: "Rooms",
      boons: "Docs",
      reports: "Reports",
      profile: "Settings",
    },
    dashboard: {
      addExpense: "Send Boon",
      createProject: "Open Rooms",
    },
    rooms: {
      title: "Rooms",
      subtitle: "Chat-like room feed with strict role visibility.",
      roomLabel: "Select room",
      createRoom: "Create Room",
      joinRoom: "Join by Code",
      roomCode: "Room code",
      roomName: "Room name",
      loadError: "Failed to load room data",
      members: "Room members",
      live: "Live connected",
      offline: "Connecting...",
      noMessages: "No boons yet in this room.",
      amount: "Amount",
      category: "Category",
      note: "Note",
      send: "Send Boon",
      linkSupplier: "Link supplier",
      supplierSearch: "Search supplier by name or phone",
      noRooms: "No rooms found",
    },
    boons: {
      title: "Boon Center",
      subtitle: "Personal and room documents with export and sharing.",
      personalTitle: "Personal Docs",
      roomTitle: "Room Docs",
      amount: "Amount",
      category: "Category",
      note: "Note",
      createPersonal: "Save Personal Boon",
      share: "Share WhatsApp",
      pdf: "Open PDF",
      room: "Room",
      noData: "No data",
    },
    profile: {
      title: "Profile & Settings",
      subtitle: "Manage account, language, appearance, and security.",
      profileCard: "Profile",
      languageCard: "Language",
      languageLabel: "App language",
      themeCard: "Appearance",
      themeLabel: "Theme mode",
      securityCard: "Password",
      fullName: "Full name",
      phone: "Phone",
      email: "Email",
      verification: "Phone verification",
      verified: "Verified",
      notVerified: "Not verified",
      saveProfile: "Save profile",
      currentPassword: "Current password",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      updatePassword: "Update password",
      logout: "Logout",
      langEnglish: "English",
      langFrench: "French",
      langArabic: "Arabic",
      themeLight: "Light",
      themeDark: "Dark",
      themeSystem: "System",
      storeProfileCard: "Supplier Store Profile",
      storeName: "Store name",
      address: "Address",
      ice: "ICE",
      rc: "RC",
      footerNote: "Footer note",
      saveStoreProfile: "Save store profile",
    },
    messages: {
      profileSaved: "Profile updated successfully.",
      passwordUpdated: "Password updated successfully.",
      passwordMismatch: "Password confirmation does not match.",
      storeProfileSaved: "Store profile saved successfully.",
    },
  },
  fr: {
    appTitle: "BOON Construction",
    loading: "Chargement BOON...",
    nav: {
      dashboard: "Accueil",
      rooms: "Rooms",
      boons: "Docs",
      reports: "Rapports",
      profile: "Parametres",
    },
    dashboard: {
      addExpense: "Envoyer Boon",
      createProject: "Ouvrir Rooms",
    },
    rooms: {
      title: "Rooms",
      subtitle: "Flux style chat avec visibilite par role.",
      roomLabel: "Choisir room",
      createRoom: "Creer Room",
      joinRoom: "Rejoindre par code",
      roomCode: "Code room",
      roomName: "Nom room",
      loadError: "Echec chargement room",
      members: "Membres room",
      live: "Connecte",
      offline: "Connexion...",
      noMessages: "Aucun document dans cette room.",
      amount: "Montant",
      category: "Categorie",
      note: "Note",
      send: "Envoyer Boon",
      linkSupplier: "Lier supplier",
      supplierSearch: "Chercher supplier",
      noRooms: "Aucune room",
    },
    boons: {
      title: "Centre BOON",
      subtitle: "Documents personnels et room avec partage et export.",
      personalTitle: "Docs personnels",
      roomTitle: "Docs room",
      amount: "Montant",
      category: "Categorie",
      note: "Note",
      createPersonal: "Enregistrer document personnel",
      share: "Partager WhatsApp",
      pdf: "Ouvrir PDF",
      room: "Room",
      noData: "Pas de donnees",
    },
    profile: {
      title: "Profil et Parametres",
      subtitle: "Compte, langue, apparence et securite.",
      profileCard: "Profil",
      languageCard: "Langue",
      languageLabel: "Langue de l'app",
      themeCard: "Apparence",
      themeLabel: "Mode theme",
      securityCard: "Mot de passe",
      fullName: "Nom complet",
      phone: "Telephone",
      email: "Email",
      verification: "Verification telephone",
      verified: "Verifie",
      notVerified: "Non verifie",
      saveProfile: "Enregistrer profil",
      currentPassword: "Mot de passe actuel",
      newPassword: "Nouveau mot de passe",
      confirmPassword: "Confirmer mot de passe",
      updatePassword: "Mettre a jour",
      logout: "Deconnexion",
      langEnglish: "Anglais",
      langFrench: "Francais",
      langArabic: "Arabe",
      themeLight: "Clair",
      themeDark: "Sombre",
      themeSystem: "Systeme",
      storeProfileCard: "Profil magasin supplier",
      storeName: "Nom magasin",
      address: "Adresse",
      ice: "ICE",
      rc: "RC",
      footerNote: "Note footer",
      saveStoreProfile: "Enregistrer profil magasin",
    },
    messages: {
      profileSaved: "Profil mis a jour.",
      passwordUpdated: "Mot de passe mis a jour.",
      passwordMismatch: "Confirmation mot de passe invalide.",
      storeProfileSaved: "Profil magasin enregistre.",
    },
  },
  ar: {
    appTitle: "???? BOON ??????",
    loading: "??? ????? BOON...",
    nav: {
      dashboard: "????????",
      rooms: "?????",
      boons: "???????",
      reports: "????????",
      profile: "?????????",
    },
    dashboard: {
      addExpense: "????? ???",
      createProject: "??? ?????",
    },
    rooms: {
      title: "?????",
      subtitle: "???? ???? ?????? ?? ??????? ????? ??? ?????.",
      roomLabel: "???? ??????",
      createRoom: "????? ????",
      joinRoom: "???????? ??????",
      roomCode: "??? ??????",
      roomName: "??? ??????",
      loadError: "??? ????? ?????? ??????",
      members: "????? ??????",
      live: "???? ??????",
      offline: "??? ???????...",
      noMessages: "?? ???? ????? ??? ???? ??? ??????.",
      amount: "??????",
      category: "?????",
      note: "??????",
      send: "????? ?????",
      linkSupplier: "??? ??????",
      supplierSearch: "???? ?? ?????? ?????? ?? ??????",
      noRooms: "?? ???? ???",
    },
    boons: {
      title: "???? ???????",
      subtitle: "????? ????? ?????? ????? ?? ??????? ?????????.",
      personalTitle: "??????? ???????",
      roomTitle: "????? ?????",
      amount: "??????",
      category: "?????",
      note: "??????",
      createPersonal: "??? ??? ????",
      share: "?????? ??????",
      pdf: "??? PDF",
      room: "??????",
      noData: "?? ???? ??????",
    },
    profile: {
      title: "????? ??????????",
      subtitle: "????? ?????? ?????? ??????? ???????.",
      profileCard: "?????",
      languageCard: "?????",
      languageLabel: "??? ???????",
      themeCard: "??????",
      themeLabel: "??? ?????",
      securityCard: "???? ??????",
      fullName: "????? ??????",
      phone: "??????",
      email: "?????? ??????????",
      verification: "????? ??????",
      verified: "?? ??????",
      notVerified: "??? ?????",
      saveProfile: "??? ?????",
      currentPassword: "???? ?????? ???????",
      newPassword: "???? ?????? ???????",
      confirmPassword: "????? ???? ??????",
      updatePassword: "????? ???? ??????",
      logout: "????? ??????",
      langEnglish: "??????????",
      langFrench: "????????",
      langArabic: "???????",
      themeLight: "????",
      themeDark: "????",
      themeSystem: "??? ??????",
      storeProfileCard: "??? ???? ??????",
      storeName: "??? ??????",
      address: "???????",
      ice: "ICE",
      rc: "RC",
      footerNote: "?????? ???????",
      saveStoreProfile: "??? ??? ??????",
    },
    messages: {
      profileSaved: "?? ????? ????? ?????.",
      passwordUpdated: "?? ????? ???? ?????? ?????.",
      passwordMismatch: "????? ???? ?????? ??? ?????.",
      storeProfileSaved: "?? ??? ??? ?????? ?????.",
    },
  },
} as const;

const TABS_BY_ROLE: Record<Role, BottomTabId[]> = {
  OWNER: ["dashboard", "rooms", "reports", "profile"],
  WORKER: ["dashboard", "rooms", "boons", "reports", "profile"],
  SUPPLIER: ["dashboard", "rooms", "boons", "reports", "profile"],
};

function readSavedAuth(): AuthResponse | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthResponse;
  } catch {
    return null;
  }
}

function saveAuth(auth: AuthResponse | null) {
  if (!auth) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function readSavedLanguage(): Language {
  const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (raw === "en" || raw === "fr" || raw === "ar") return raw;
  return "en";
}

function readSavedTheme(): ThemeMode {
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [language, setLanguage] = useState<Language>(readSavedLanguage);
  const [themeMode, setThemeMode] = useState<ThemeMode>(readSavedTheme);
  const [activeTab, setActiveTab] = useState<BottomTabId>("dashboard");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingStoreProfile, setIsSavingStoreProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [supplierProfile, setSupplierProfile] = useState<SupplierProfile | null>(null);

  const copy = COPY[language];
  const role = auth?.user.role;
  const availableTabIds = role ? TABS_BY_ROLE[role] : [];

  const tabs = useMemo(
    () =>
      availableTabIds.map((id) => ({
        id,
        label: copy.nav[id],
        icon: TAB_ICONS[id],
      })),
    [availableTabIds, copy.nav],
  );

  useEffect(() => {
    if (!availableTabIds.includes(activeTab) && availableTabIds.length > 0) {
      setActiveTab(availableTabIds[0]);
    }
  }, [activeTab, availableTabIds]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    const root = document.documentElement;

    const applyTheme = () => {
      const resolved = resolveTheme(themeMode);
      root.classList.toggle("dark", resolved === "dark");
      root.style.colorScheme = resolved;
    };

    applyTheme();

    if (themeMode !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [themeMode]);

  useEffect(() => {
    async function bootstrap() {
      const savedAuth = readSavedAuth();
      if (!savedAuth?.token) {
        setBooting(false);
        return;
      }

      try {
        const user = await getMe(savedAuth.token);
        const refreshed = { ...savedAuth, user };
        setAuth(refreshed);
        saveAuth(refreshed);
      } catch {
        saveAuth(null);
        setAuth(null);
      } finally {
        setBooting(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (!auth || auth.user.role !== "SUPPLIER") {
      setSupplierProfile(null);
      return;
    }
    getSupplierProfile(auth.token)
      .then((profile) => setSupplierProfile(profile))
      .catch(() => setSupplierProfile(null));
  }, [auth]);

  function onAuthenticated(nextAuth: AuthResponse) {
    setAuth(nextAuth);
    saveAuth(nextAuth);
    setNotice(null);
    setError(null);
  }

  function onLogout() {
    setAuth(null);
    saveAuth(null);
    setActiveTab("dashboard");
    setNotice(null);
    setError(null);
    setSupplierProfile(null);
  }

  async function handleSaveProfile(payload: { fullName: string; email?: string | null }) {
    if (!auth) return;
    setError(null);
    setNotice(null);
    setIsSavingProfile(true);
    try {
      const user = await updateMe(auth.token, payload);
      const next = { ...auth, user };
      setAuth(next);
      saveAuth(next);
      setNotice(copy.messages.profileSaved);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Profile update failed");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveStoreProfile(payload: {
    storeName: string;
    phone: string;
    address: string;
    ice?: string;
    rc?: string;
    footerNote?: string;
    logoUrl?: string;
  }) {
    if (!auth || auth.user.role !== "SUPPLIER") return;
    setError(null);
    setNotice(null);
    setIsSavingStoreProfile(true);
    try {
      const profile = await upsertSupplierProfile(auth.token, payload);
      setSupplierProfile(profile);
      setNotice(copy.messages.storeProfileSaved);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Store profile update failed");
    } finally {
      setIsSavingStoreProfile(false);
    }
  }

  async function handleChangePassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    if (!auth) return;
    if (payload.newPassword !== payload.confirmPassword) {
      setNotice(null);
      setError(copy.messages.passwordMismatch);
      return;
    }

    setNotice(null);
    setError(null);
    setIsChangingPassword(true);
    try {
      await changeMyPassword(auth.token, {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      });
      setNotice(copy.messages.passwordUpdated);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Password update failed");
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (booting) {
    return (
      <div className="min-h-screen bg-background text-foreground grid place-items-center">
        <p className="text-sm text-muted-foreground">{copy.loading}</p>
      </div>
    );
  }

  if (!auth) {
    return <AuthGate language={language} onAuthenticated={onAuthenticated} />;
  }

  const verificationLabel = auth.user.phoneVerifiedAt
    ? copy.profile.verified
    : copy.profile.notVerified;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_28%),linear-gradient(180deg,_var(--background),color-mix(in_oklab,_var(--background)_88%,black))] text-foreground transition-colors">
      <div className="mx-auto max-w-6xl px-4 pt-5 pb-28">
        <header className="mb-5 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#f6c341,#f58a2a_52%,#db5d21)] p-4 text-black shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
          <p className="text-xs font-bold uppercase tracking-[0.2em]">BOON</p>
          <h1 className="mt-1 text-xl font-black leading-tight">{copy.appTitle}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium">
            <span>{auth.user.fullName}</span>
            <span className="rounded-full bg-black/10 px-2 py-1 text-xs">{auth.user.role}</span>
            <span className="rounded-full bg-black/10 px-2 py-1 text-xs">{auth.user.phone}</span>
            <span className="rounded-full bg-black/10 px-2 py-1 text-xs">{verificationLabel}</span>
          </div>
        </header>

        {activeTab !== "profile" && notice && (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
            {notice}
          </p>
        )}
        {activeTab !== "profile" && error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mx-auto max-w-4xl">
          {activeTab === "dashboard" && (
            <Dashboard
              onAddExpense={() => setActiveTab(role === "OWNER" ? "rooms" : "boons")}
              onCreateProject={() => setActiveTab("rooms")}
              canAddExpense
              canCreateProject
              addExpenseLabel={copy.dashboard.addExpense}
              createProjectLabel={copy.dashboard.createProject}
            />
          )}

          {activeTab === "rooms" && (
            <RoomLive
              token={auth.token}
              userId={auth.user.id}
              role={auth.user.role}
              language={language}
              labels={copy.rooms}
            />
          )}

          {activeTab === "boons" && (
            <BoonCenter
              token={auth.token}
              role={auth.user.role}
              userId={auth.user.id}
              language={language}
              labels={copy.boons}
            />
          )}

          {activeTab === "reports" && (
            <Reports token={auth.token} language={language} />
          )}

          {activeTab === "profile" && (
            <Profile
              user={auth.user}
              language={language}
              themeMode={themeMode}
              texts={copy.profile}
              notice={notice}
              error={error}
              isSavingProfile={isSavingProfile}
              isSavingStoreProfile={isSavingStoreProfile}
              isChangingPassword={isChangingPassword}
              supplierProfile={supplierProfile}
              onLanguageChange={(nextLanguage) => {
                setLanguage(nextLanguage);
                setNotice(null);
                setError(null);
              }}
              onThemeModeChange={(nextMode) => {
                setThemeMode(nextMode);
                setNotice(null);
                setError(null);
              }}
              onSaveProfile={handleSaveProfile}
              onSaveStoreProfile={handleSaveStoreProfile}
              onChangePassword={handleChangePassword}
              onLogout={onLogout}
            />
          )}
        </div>
      </div>

      <BottomNav
        activeTab={activeTab}
        tabs={tabs}
        onTabChange={(tab) => {
          setNotice(null);
          setError(null);
          setActiveTab(tab as BottomTabId);
        }}
      />
    </div>
  );
}
