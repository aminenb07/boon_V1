import { useMemo, useState } from "react";
import boonLogo from "../../assets/boon.png";
import type { AuthResponse, Role, VerificationResponse } from "../api";
import { login, register, resendVerificationCode, verifyPhone } from "../api";

type Language = "en" | "fr" | "ar";

type Props = {
  language: Language;
  onAuthenticated: (auth: AuthResponse) => void;
};

type AuthMode = "login" | "register" | "verify";

type CopyShape = {
  badge: string;
  headline: string;
  description: string;
  login: string;
  register: string;
  verify: string;
  identifier: string;
  identifierPlaceholder: string;
  fullName: string;
  fullNamePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  role: string;
  verificationCode: string;
  verificationCodePlaceholder: string;
  verificationHint: string;
  verificationSent: string;
  registerNotice: string;
  resendNotice: string;
  signIn: string;
  createAccount: string;
  verifyAndContinue: string;
  resendCode: string;
  loading: string;
  passwordMismatch: string;
  authFailed: string;
  createFailed: string;
  verifyFailed: string;
  resendFailed: string;
  roleOwner: string;
  roleWorker: string;
  roleSupplier: string;
};

const COPY: Record<Language, CopyShape> = {
  en: {
    badge: "BOON",
    headline: "Secure invoice rooms for construction teams",
    description:
      "Create a real account, verify the phone number, then enter the BOON workspace.",
    login: "Sign in",
    register: "Create",
    verify: "Verify",
    identifier: "Phone or email",
    identifierPlaceholder: "+2126XXXXXXXX or name@store.com",
    fullName: "Full name",
    fullNamePlaceholder: "Mohamed Amine",
    phone: "Phone",
    phonePlaceholder: "+212612345678",
    email: "Email (optional)",
    emailPlaceholder: "contact@store.com",
    password: "Password",
    passwordPlaceholder: "At least 10 chars, upper/lower/number/symbol",
    confirmPassword: "Confirm password",
    confirmPasswordPlaceholder: "Repeat the password",
    role: "Role",
    verificationCode: "Verification code",
    verificationCodePlaceholder: "123456",
    verificationHint: "Enter the code sent to",
    verificationSent:
      "Phone verification required. Enter the code that was sent to you.",
    registerNotice: "Account created. Verify the phone number to continue.",
    resendNotice: "A new verification code has been sent.",
    signIn: "Sign in",
    createAccount: "Create account",
    verifyAndContinue: "Verify and continue",
    resendCode: "Resend code",
    loading: "Please wait...",
    passwordMismatch: "Password confirmation does not match.",
    authFailed: "Authentication failed",
    createFailed: "Account creation failed",
    verifyFailed: "Verification failed",
    resendFailed: "Unable to resend code",
    roleOwner: "Owner",
    roleWorker: "Worker",
    roleSupplier: "Supplier",
  },
  fr: {
    badge: "BOON",
    headline: "Rooms securisees pour factures et bons de chantier",
    description:
      "Creez un vrai compte, verifiez le numero, puis entrez dans l'espace BOON.",
    login: "Connexion",
    register: "Creer",
    verify: "Verifier",
    identifier: "Telephone ou email",
    identifierPlaceholder: "+2126XXXXXXXX ou nom@store.com",
    fullName: "Nom complet",
    fullNamePlaceholder: "Mohamed Amine",
    phone: "Telephone",
    phonePlaceholder: "+212612345678",
    email: "Email (optionnel)",
    emailPlaceholder: "contact@store.com",
    password: "Mot de passe",
    passwordPlaceholder: "10 caracteres min, maj/min/chiffre/symbole",
    confirmPassword: "Confirmer le mot de passe",
    confirmPasswordPlaceholder: "Repetez le mot de passe",
    role: "Role",
    verificationCode: "Code de verification",
    verificationCodePlaceholder: "123456",
    verificationHint: "Saisissez le code envoye a",
    verificationSent:
      "Verification telephone requise. Entrez le code envoye.",
    registerNotice: "Compte cree. Verifiez le numero pour continuer.",
    resendNotice: "Un nouveau code a ete envoye.",
    signIn: "Se connecter",
    createAccount: "Creer le compte",
    verifyAndContinue: "Verifier et continuer",
    resendCode: "Renvoyer le code",
    loading: "Veuillez patienter...",
    passwordMismatch: "La confirmation du mot de passe ne correspond pas.",
    authFailed: "Echec d'authentification",
    createFailed: "Echec de creation du compte",
    verifyFailed: "Echec de verification",
    resendFailed: "Impossible de renvoyer le code",
    roleOwner: "Owner",
    roleWorker: "Worker",
    roleSupplier: "Supplier",
  },
  ar: {
    badge: "BOON",
    headline: "غرف فواتير وبونات آمنة لفرق البناء",
    description:
      "أنشئ حسابا حقيقيا، أكد رقم الهاتف، ثم ادخل إلى مساحة BOON.",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    verify: "تأكيد",
    identifier: "الهاتف أو البريد",
    identifierPlaceholder: "+2126XXXXXXXX أو name@store.com",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "محمد أمين",
    phone: "الهاتف",
    phonePlaceholder: "+212612345678",
    email: "البريد الإلكتروني (اختياري)",
    emailPlaceholder: "contact@store.com",
    password: "كلمة المرور",
    passwordPlaceholder: "10 أحرف على الأقل مع كبير وصغير ورقم ورمز",
    confirmPassword: "تأكيد كلمة المرور",
    confirmPasswordPlaceholder: "أعد كتابة كلمة المرور",
    role: "الدور",
    verificationCode: "رمز التحقق",
    verificationCodePlaceholder: "123456",
    verificationHint: "أدخل الرمز الذي أرسل إلى",
    verificationSent:
      "مطلوب تأكيد الهاتف. أدخل الرمز الذي تم إرساله إليك.",
    registerNotice: "تم إنشاء الحساب. أكد رقم الهاتف للمتابعة.",
    resendNotice: "تم إرسال رمز جديد.",
    signIn: "دخول",
    createAccount: "إنشاء الحساب",
    verifyAndContinue: "تأكيد والمتابعة",
    resendCode: "إعادة إرسال الرمز",
    loading: "يرجى الانتظار...",
    passwordMismatch: "تأكيد كلمة المرور غير مطابق.",
    authFailed: "فشل تسجيل الدخول",
    createFailed: "فشل إنشاء الحساب",
    verifyFailed: "فشل التحقق",
    resendFailed: "تعذر إعادة إرسال الرمز",
    roleOwner: "المالك",
    roleWorker: "العامل",
    roleSupplier: "المورد",
  },
};

function extractVerificationPayload(error: unknown): VerificationResponse | null {
  if (!(error instanceof Error)) return null;
  const payload = (error as Error & { payload?: Record<string, unknown> }).payload;
  if (!payload || payload.verificationRequired !== true) return null;

  return {
    verificationRequired: true,
    phone: String(payload.phone || ""),
    maskedPhone: String(payload.maskedPhone || ""),
    expiresInSeconds: Number(payload.expiresInSeconds || 0),
    ...(typeof payload.devCode === "string" ? { devCode: payload.devCode } : {}),
  };
}

export function AuthGate({ language, onAuthenticated }: Props) {
  const copy = useMemo(() => COPY[language], [language]);
  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("SUPPLIER");
  const [verification, setVerification] = useState<VerificationResponse | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roleOptions: Array<{ value: Role; label: string }> = [
    { value: "OWNER", label: copy.roleOwner },
    { value: "WORKER", label: copy.roleWorker },
    { value: "SUPPLIER", label: copy.roleSupplier },
  ];

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const auth = await login({ identifier, password });
      onAuthenticated(auth);
    } catch (submitError) {
      const verificationPayload = extractVerificationPayload(submitError);
      if (verificationPayload) {
        setVerification(verificationPayload);
        setPhone(verificationPayload.phone);
        setMode("verify");
        setNotice(copy.verificationSent);
      } else {
        setError(
          submitError instanceof Error ? submitError.message : copy.authFailed,
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (password !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const response = await register({
        phone,
        email: email.trim() || undefined,
        password,
        fullName,
        role,
      });
      setVerification(response);
      setPhone(response.phone);
      setCode("");
      setMode("verify");
      setNotice(copy.registerNotice);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : copy.createFailed,
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!phone || !code) return;

    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const auth = await verifyPhone({ phone, code });
      onAuthenticated(auth);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : copy.verifyFailed,
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!phone) return;
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const nextVerification = await resendVerificationCode({ phone });
      setVerification(nextVerification);
      setNotice(copy.resendNotice);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : copy.resendFailed,
      );
    } finally {
      setLoading(false);
    }
  }

  const verifyMeta = verification?.maskedPhone
    ? `${copy.verificationHint} ${verification.maskedPhone}`
    : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(246,195,65,0.16),_transparent_38%),linear-gradient(180deg,_var(--background),color-mix(in_oklab,_var(--background)_82%,black))] px-4 py-8 text-foreground">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-7 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#f6c341,#f58a2a_58%,#d95a1f)] p-5 text-black shadow-[0_30px_80px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-3">
            <img src={boonLogo} alt="BOON" className="h-12 w-12 rounded-2xl bg-white/80 p-1.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em]">{copy.badge}</p>
              <h1 className="mt-1 text-2xl font-black leading-tight">{copy.headline}</h1>
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-black/80">{copy.description}</p>
        </div>

        <div className="boon-surface p-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
          <div className="mb-4 grid grid-cols-3 rounded-2xl bg-muted p-1 text-sm">
            {(["login", "register", "verify"] as AuthMode[]).map((value) => (
              <button
                key={value}
                type="button"
                className={`rounded-xl px-3 py-2 font-semibold transition-colors ${
                  mode === value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setMode(value);
                  setError(null);
                  setNotice(null);
                }}
              >
                {value === "login" ? copy.login : value === "register" ? copy.register : copy.verify}
              </button>
            ))}
          </div>

          {notice && (
            <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              {notice}
            </p>
          )}
          {error && (
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
          {mode === "verify" && verifyMeta && (
            <div className="mb-3 rounded-2xl border border-border bg-background px-3 py-3 text-xs text-muted-foreground">
              <p>{verifyMeta}</p>
              {verification?.expiresInSeconds ? (
                <p className="mt-1">{Math.floor(verification.expiresInSeconds / 60)} min</p>
              ) : null}
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">{copy.identifier}</span>
                <input
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="boon-input"
                  placeholder={copy.identifierPlaceholder}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">{copy.password}</span>
                <input
                  required
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="boon-input"
                  placeholder={copy.passwordPlaceholder}
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? copy.loading : copy.signIn}
              </button>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">{copy.fullName}</span>
                <input
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="boon-input"
                  placeholder={copy.fullNamePlaceholder}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">{copy.phone}</span>
                <input
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="boon-input"
                  placeholder={copy.phonePlaceholder}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">{copy.email}</span>
                <input
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="boon-input"
                  placeholder={copy.emailPlaceholder}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">{copy.password}</span>
                <input
                  required
                  autoComplete="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="boon-input"
                  placeholder={copy.passwordPlaceholder}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">{copy.confirmPassword}</span>
                <input
                  required
                  autoComplete="new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="boon-input"
                  placeholder={copy.confirmPasswordPlaceholder}
                />
              </label>

              <div>
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">{copy.role}</span>
                <div className="grid grid-cols-3 gap-2">
                  {roleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      className={`rounded-2xl border px-2 py-3 text-xs font-bold transition ${
                        role === option.value
                          ? "border-amber-400 bg-amber-300 text-black"
                          : "border-border bg-background text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? copy.loading : copy.createAccount}
              </button>
            </form>
          )}

          {mode === "verify" && (
            <form onSubmit={handleVerify} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">{copy.phone}</span>
                <input
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="boon-input"
                  placeholder={copy.phonePlaceholder}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">{copy.verificationCode}</span>
                <input
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="boon-input tracking-[0.35em]"
                  placeholder={copy.verificationCodePlaceholder}
                  inputMode="numeric"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? copy.loading : copy.verifyAndContinue}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading || !phone}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.resendCode}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
