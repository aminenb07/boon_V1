
/**
 * BOON App - Main Entry Component
 *
 * This component manages:
 * - Global app state (auth, language, theme, active tab)
 * - Local storage persistence
 * - Navigation between main sections
 * - User profile and supplier profile management
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  changeMyPassword,
  configureAuthSessionHandlers,
  getSupplierProfile,
  updateMe,
  upsertSupplierProfile,
} from "./api";
import { AuthGate } from "./components/AuthGate";
import { BoonCenter } from "./components/BoonCenter";
import { BottomNav, TAB_ICONS } from "./components/BottomNav";
import { Dashboard } from "./components/Dashboard";
import { Profile } from "./components/Profile";
import { Reports } from "./components/Reports";
import { RoomLive } from "./components/RoomLive";
import boonLogo from "../assets/boon.png";

// Local storage keys for persistence
const AUTH_STORAGE_KEY = "boon.auth.v2";
const LANGUAGE_STORAGE_KEY = "boon.language.v1";
const THEME_STORAGE_KEY = "boon.theme.v1";

// Translations for UI text (supports English, French, Arabic)
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
    appTitle: "نظام BOON للبناء",
    loading: "جار تحميل BOON...",
    nav: {
      dashboard: "الرئيسية",
      rooms: "الغرف",
      boons: "الوثائق",
      reports: "التقارير",
      profile: "الإعدادات",
    },
    dashboard: {
      addExpense: "إرسال بون",
      createProject: "فتح الغرف",
    },
    rooms: {
      title: "الغرف",
      subtitle: "تغذية شبيهة بالدردشة مع صلاحيات رؤية صارمة حسب الدور.",
      roomLabel: "اختر الغرفة",
      createRoom: "إنشاء غرفة",
      joinRoom: "الانضمام بالكود",
      roomCode: "كود الغرفة",
      roomName: "اسم الغرفة",
      loadError: "فشل تحميل بيانات الغرفة",
      members: "أعضاء الغرفة",
      live: "بث مباشر",
      offline: "جار الاتصال...",
      noMessages: "لا توجد بونات بعد في هذه الغرفة.",
      amount: "المبلغ",
      category: "الفئة",
      note: "ملاحظة",
      send: "إرسال البون",
      linkSupplier: "ربط المورد",
      supplierSearch: "ابحث عن المورد بالاسم أو الهاتف",
      noRooms: "لا توجد غرف",
    },
    boons: {
      title: "مركز الوثائق",
      subtitle: "وثائق شخصية ووثائق الغرف مع التصدير والمشاركة.",
      personalTitle: "الوثائق الشخصية",
      roomTitle: "وثائق الغرف",
      amount: "المبلغ",
      category: "الفئة",
      note: "ملاحظة",
      createPersonal: "حفظ بون شخصي",
      share: "مشاركة واتساب",
      pdf: "فتح PDF",
      room: "الغرفة",
      noData: "لا توجد بيانات",
    },
    profile: {
      title: "الملف الشخصي والإعدادات",
      subtitle: "إدارة الحساب واللغة والمظهر والحماية.",
      profileCard: "الملف الشخصي",
      languageCard: "اللغة",
      languageLabel: "لغة التطبيق",
      themeCard: "المظهر",
      themeLabel: "وضع العرض",
      securityCard: "كلمة المرور",
      fullName: "الاسم الكامل",
      phone: "الهاتف",
      email: "البريد الإلكتروني",
      verification: "تأكيد الهاتف",
      verified: "مؤكد",
      notVerified: "غير مؤكد",
      saveProfile: "حفظ الملف",
      currentPassword: "كلمة المرور الحالية",
      newPassword: "كلمة المرور الجديدة",
      confirmPassword: "تأكيد كلمة المرور",
      updatePassword: "تحديث كلمة المرور",
      logout: "تسجيل الخروج",
      langEnglish: "الإنجليزية",
      langFrench: "الفرنسية",
      langArabic: "العربية",
      themeLight: "فاتح",
      themeDark: "داكن",
      themeSystem: "حسب الجهاز",
      storeProfileCard: "ملف متجر المورد",
      storeName: "اسم المتجر",
      address: "العنوان",
      ice: "ICE",
      rc: "RC",
      footerNote: "ملاحظة الفوتر",
      saveStoreProfile: "حفظ ملف المتجر",
    },
    messages: {
      profileSaved: "تم حفظ الملف الشخصي.",
      passwordUpdated: "تم تحديث كلمة المرور.",
      passwordMismatch: "تأكيد كلمة المرور غير مطابق.",
      storeProfileSaved: "تم حفظ ملف المتجر.",
    },
  },
};

/**
 * Tabs available to each user role
 * - Owners don't see the "Docs" tab since they manage rooms
 * - Workers & Suppliers see all tabs including Docs
 */
const TABS_BY_ROLE = {
  OWNER: ["dashboard", "rooms", "reports", "profile"],
  WORKER: ["dashboard", "rooms", "boons", "reports", "profile"],
  SUPPLIER: ["dashboard", "rooms", "boons", "reports", "profile"],
};

/**
 * Read saved authentication state from localStorage
 */
function readSavedAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persist authentication state to localStorage or clear it
 */
function saveAuth(auth) {
  if (!auth) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

/**
 * Read saved language preference from localStorage
 */
function readSavedLanguage() {
  const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (raw === "en" || raw === "fr" || raw === "ar") return raw;
  return "en";
}

/**
 * Read saved theme preference from localStorage
 */
function readSavedTheme() {
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

/**
 * Resolve theme mode to actual "light" or "dark" value
 */
function resolveTheme(mode) {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

export default function App() {
  // App state
  const [booting, setBooting] = useState(true);
  const [auth, setAuth] = useState(null);
  const [language, setLanguage] = useState(readSavedLanguage);
  const [themeMode, setThemeMode] = useState(readSavedTheme);
  const [activeTab, setActiveTab] = useState("dashboard");

  // UI feedback state
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  // Loading states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingStoreProfile, setIsSavingStoreProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Additional data
  const [supplierProfile, setSupplierProfile] = useState(null);
  const authRef = useRef(null); // To access latest auth in callbacks without dependency issues

  // Computed values
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

  // Keep active tab valid when available tabs change
  useEffect(() => {
    if (!availableTabIds.includes(activeTab) && availableTabIds.length > 0) {
      setActiveTab(availableTabIds[0]);
    }
  }, [activeTab, availableTabIds]);

  // Persist and apply language preference
  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  // Persist and apply theme preference
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    const root = document.documentElement;

    const applyTheme = () => {
      const resolved = resolveTheme(themeMode);
      root.classList.toggle("dark", resolved === "dark");
      root.style.colorScheme = resolved;
    };

    applyTheme();

    // Listen for system theme changes if in system mode
    if (themeMode !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [themeMode]);

  // Boot app: load saved auth and mark as ready
  useEffect(() => {
    setAuth(readSavedAuth());
    setBooting(false);
  }, []);

  // Keep authRef in sync with auth state
  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  // Configure auth session handlers (for API refresh token support)
  useEffect(() => {
    configureAuthSessionHandlers({
      getAuth: () => authRef.current,
      saveAuth: (nextAuth) => {
        authRef.current = nextAuth;
        setAuth(nextAuth);
        saveAuth(nextAuth);
      },
      clearAuth: () => {
        authRef.current = null;
        setAuth(null);
        saveAuth(null);
        setSupplierProfile(null);
      },
    });

    return () => configureAuthSessionHandlers(null);
  }, []);

  // Load supplier profile when auth is a supplier
  useEffect(() => {
    if (!auth || auth.user.role !== "SUPPLIER") {
      setSupplierProfile(null);
      return;
    }
    getSupplierProfile(auth.token)
      .then((profile) => {
        setSupplierProfile(profile);
      })
      .catch(() => setSupplierProfile(null));
  }, [auth]);

  /**
   * Handle successful authentication (register/login/verify)
   */
  function onAuthenticated(nextAuth) {
    setAuth(nextAuth);
    saveAuth(nextAuth);
    setNotice(null);
    setError(null);
  }

  /**
   * Handle user logout: clear all auth and state
   */
  function onLogout() {
    setAuth(null);
    saveAuth(null);
    setActiveTab("dashboard");
    setNotice(null);
    setError(null);
    setSupplierProfile(null);
  }

  /**
   * Update user's profile information
   */
  async function handleSaveProfile(payload) {
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

  /**
   * Update supplier's store profile information
   */
  async function handleSaveStoreProfile(payload) {
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

  /**
   * Update user's password
   */
  async function handleChangePassword(payload) {
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

  // Show loading state while booting
  if (booting) {
    return (
      <div className="min-h-screen bg-background text-foreground grid place-items-center">
        <p className="text-sm text-muted-foreground">{copy.loading}</p>
      </div>
    );
  }

  // Show auth gate if user is not logged in
  if (!auth) {
    return <AuthGate language={language} onAuthenticated={onAuthenticated} />;
  }

  // Get verification status label
  const verificationLabel = auth.user.phoneVerifiedAt
    ? copy.profile.verified
    : copy.profile.notVerified;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <div className="mx-auto max-w-6xl px-4 pt-5 pb-28">
        <header className="mb-5 rounded-[24px] border border-border bg-card px-4 py-4 text-card-foreground shadow-[0_18px_52px_var(--boon-shadow)] sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border bg-white p-1.5 dark:bg-zinc-100">
                <img src={boonLogo} alt="BOON" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-muted-foreground">BOON</p>
                <h1 className="mt-1 truncate text-xl font-black leading-tight tracking-normal sm:text-2xl">
                  {copy.appTitle}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium sm:justify-end">
              <span className="max-w-[12rem] truncate font-bold">{auth.user.fullName}</span>
              <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-black text-secondary-foreground">{auth.user.role}</span>
              <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-black text-secondary-foreground">{auth.user.phone}</span>
              <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-black text-secondary-foreground">{verificationLabel}</span>
            </div>
          </div>
        </header>

        {activeTab !== "profile" && notice && (
          <p className="boon-success-note mb-4">
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
              role={role}
              fullName={auth.user.fullName}
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
          setActiveTab(tab);
        }}
      />
    </div>
  );
}

