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

const AUTH_STORAGE_KEY = "boon.auth.v1";
const LANGUAGE_STORAGE_KEY = "boon.language.v1";
const THEME_STORAGE_KEY = "boon.theme.v1";

const COPY = {
  en: {
    appTitle: "BOON Construction System",
    loading: "Loading BOON...",
    logout: "Logout",
    nav: {
      dashboard: "Home",
      rooms: "Rooms",
      boons: "Boons",
      reports: "Reports",
      profile: "Settings",
    },
    dashboard: {
      addExpense: "Send Boon",
      createProject: "Open Rooms",
    },
    rooms: {
      title: "Rooms Live Feed",
      subtitle: "Real-time room boons like chat.",
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
      linkSupplier: "Link supplier to me",
      supplierSearch: "Search supplier by name or phone",
      noRooms: "No rooms found",
    },
    boons: {
      title: "Boon Center",
      subtitle: "Personal + room boons, export and share.",
      personalTitle: "Personal Boons",
      roomTitle: "Room Boons",
      amount: "Amount",
      category: "Category",
      note: "Note",
      createPersonal: "Create Boon",
      share: "Share WhatsApp",
      pdf: "Open PDF",
      room: "Room",
      noData: "No data",
    },
    profile: {
      title: "Profile & Settings",
      subtitle: "Manage account, language, theme and security.",
      profileCard: "Profile",
      languageCard: "Language",
      languageLabel: "App language",
      themeCard: "Theme",
      themeLabel: "Appearance mode",
      securityCard: "Password",
      fullName: "Full name",
      phone: "Phone",
      saveProfile: "Save Profile",
      currentPassword: "Current password",
      newPassword: "New password",
      confirmPassword: "Confirm new password",
      updatePassword: "Update Password",
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
      saveStoreProfile: "Save Store Profile",
    },
    messages: {
      profileSaved: "Profile updated successfully.",
      passwordUpdated: "Password updated successfully.",
      passwordMismatch: "New password confirmation does not match.",
      storeProfileSaved: "Store profile saved successfully.",
    },
  },
  fr: {
    appTitle: "Systeme BOON Construction",
    loading: "Chargement BOON...",
    logout: "Deconnexion",
    nav: {
      dashboard: "Accueil",
      rooms: "Rooms",
      boons: "Boons",
      reports: "Rapports",
      profile: "Parametres",
    },
    dashboard: {
      addExpense: "Envoyer Boon",
      createProject: "Ouvrir Rooms",
    },
    rooms: {
      title: "Flux Rooms Temps Reel",
      subtitle: "Boons temps reel style chat.",
      roomLabel: "Selectionner room",
      createRoom: "Creer Room",
      joinRoom: "Rejoindre par Code",
      roomCode: "Code room",
      roomName: "Nom room",
      loadError: "Echec chargement room",
      members: "Membres room",
      live: "Connecte en direct",
      offline: "Connexion...",
      noMessages: "Aucun boon dans cette room.",
      amount: "Montant",
      category: "Categorie",
      note: "Note",
      send: "Envoyer Boon",
      linkSupplier: "Lier supplier a moi",
      supplierSearch: "Chercher supplier",
      noRooms: "Aucune room",
    },
    boons: {
      title: "Centre Boons",
      subtitle: "Boons personnels + room, export et partage.",
      personalTitle: "Boons Personnels",
      roomTitle: "Boons Room",
      amount: "Montant",
      category: "Categorie",
      note: "Note",
      createPersonal: "Creer Boon",
      share: "Partager WhatsApp",
      pdf: "Ouvrir PDF",
      room: "Room",
      noData: "Pas de donnees",
    },
    profile: {
      title: "Profil et Parametres",
      subtitle: "Gerer compte, langue, theme et securite.",
      profileCard: "Profil",
      languageCard: "Langue",
      languageLabel: "Langue app",
      themeCard: "Theme",
      themeLabel: "Mode apparence",
      securityCard: "Mot de passe",
      fullName: "Nom complet",
      phone: "Telephone",
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
      storeProfileCard: "Profil Store Supplier",
      storeName: "Nom store",
      address: "Adresse",
      ice: "ICE",
      rc: "RC",
      footerNote: "Note footer",
      saveStoreProfile: "Enregistrer Store Profile",
    },
    messages: {
      profileSaved: "Profil mis a jour.",
      passwordUpdated: "Mot de passe mis a jour.",
      passwordMismatch: "Confirmation mot de passe non valide.",
      storeProfileSaved: "Store profile enregistre.",
    },
  },
  ar: {
    appTitle: "نظام BOON للبناء",
    loading: "جاري تحميل BOON...",
    logout: "تسجيل الخروج",
    nav: {
      dashboard: "الرئيسية",
      rooms: "الغرف",
      boons: "البونات",
      reports: "التقارير",
      profile: "الإعدادات",
    },
    dashboard: {
      addExpense: "إرسال بون",
      createProject: "فتح الغرف",
    },
    rooms: {
      title: "محادثة الغرف المباشرة",
      subtitle: "بونات مباشرة مثل واتساب.",
      roomLabel: "اختر الغرفة",
      createRoom: "إنشاء غرفة",
      joinRoom: "الانضمام بالكود",
      roomCode: "كود الغرفة",
      roomName: "اسم الغرفة",
      loadError: "فشل تحميل بيانات الغرفة",
      members: "أعضاء الغرفة",
      live: "اتصال مباشر",
      offline: "جاري الاتصال...",
      noMessages: "لا توجد بونات بعد.",
      amount: "المبلغ",
      category: "الفئة",
      note: "ملاحظة",
      send: "إرسال بون",
      linkSupplier: "ربط المورد",
      supplierSearch: "ابحث عن المورد",
      noRooms: "لا توجد غرف",
    },
    boons: {
      title: "مركز البونات",
      subtitle: "بونات شخصية وبونات الغرفة مع التصدير والمشاركة.",
      personalTitle: "البونات الشخصية",
      roomTitle: "بونات الغرفة",
      amount: "المبلغ",
      category: "الفئة",
      note: "ملاحظة",
      createPersonal: "إنشاء بون",
      share: "مشاركة واتساب",
      pdf: "فتح PDF",
      room: "الغرفة",
      noData: "لا توجد بيانات",
    },
    profile: {
      title: "الملف والإعدادات",
      subtitle: "إدارة الحساب واللغة والمظهر والأمان.",
      profileCard: "الملف",
      languageCard: "اللغة",
      languageLabel: "لغة التطبيق",
      themeCard: "المظهر",
      themeLabel: "وضع العرض",
      securityCard: "كلمة المرور",
      fullName: "الاسم الكامل",
      phone: "الهاتف",
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
      footerNote: "ملاحظة التذييل",
      saveStoreProfile: "حفظ ملف المتجر",
    },
    messages: {
      profileSaved: "تم تحديث الملف بنجاح.",
      passwordUpdated: "تم تحديث كلمة المرور بنجاح.",
      passwordMismatch: "تأكيد كلمة المرور غير مطابق.",
      storeProfileSaved: "تم حفظ ملف المتجر بنجاح.",
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

  async function handleSaveProfile(payload: { fullName: string; phone: string }) {
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
      <div className="min-h-screen bg-[#0f1012] text-white grid place-items-center">
        <p className="text-sm text-white/75">{copy.loading}</p>
      </div>
    );
  }

  if (!auth) {
    return <AuthGate onAuthenticated={onAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#0f1115] dark:text-gray-100 transition-colors">
      <div className="mx-auto max-w-lg px-4 pt-5 pb-28">
        <header className="mb-5 rounded-2xl border border-white/10 bg-gradient-to-br from-[#f6c341] via-[#f58a2a] to-[#e3561e] p-4 text-black shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em]">BOON</p>
          <h1 className="mt-1 text-xl font-black leading-tight">{copy.appTitle}</h1>
          <p className="mt-1 text-sm font-medium">
            {auth.user.fullName} ({auth.user.role})
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 rounded-lg border border-black/30 px-3 py-1.5 text-xs font-semibold hover:bg-black/5"
          >
            {copy.logout}
          </button>
        </header>

        {activeTab !== "profile" && notice && (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {notice}
          </p>
        )}
        {activeTab !== "profile" && error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {activeTab === "dashboard" && (
          <Dashboard
            onAddExpense={() => setActiveTab("boons")}
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
            labels={copy.rooms}
          />
        )}

        {activeTab === "boons" && (
          <BoonCenter
            token={auth.token}
            role={auth.user.role}
            userId={auth.user.id}
            labels={copy.boons}
          />
        )}

        {activeTab === "reports" && <Reports />}

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
