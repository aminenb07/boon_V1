import { useState } from "react";
import type { AuthResponse, Role } from "../api";
import { login, register } from "../api";

type Props = {
  onAuthenticated: (auth: AuthResponse) => void;
};

export function AuthGate({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("SUPPLIER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const auth =
        mode === "login"
          ? await login({ phone, password })
          : await register({ phone, password, fullName, role });
      onAuthenticated(auth);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1012] text-white px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-7 rounded-2xl border border-white/15 bg-gradient-to-br from-[#f6c341] via-[#f58a2a] to-[#e3561e] p-5 text-black">
          <p className="text-xs uppercase tracking-[0.2em] font-bold">BOON</p>
          <h1 className="mt-1 text-2xl font-black leading-tight">
            Invoice + Receipt Rooms
          </h1>
          <p className="mt-2 text-sm font-medium">
            Mobile-first for Morocco and MENA construction teams.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#17191c] p-5 shadow-2xl">
          <div className="mb-4 grid grid-cols-2 rounded-xl bg-black/40 p-1 text-sm">
            <button
              type="button"
              className={`rounded-lg px-3 py-2 font-semibold ${
                mode === "login"
                  ? "bg-[#f6c341] text-black"
                  : "text-white/70 hover:text-white"
              }`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 font-semibold ${
                mode === "register"
                  ? "bg-[#f6c341] text-black"
                  : "text-white/70 hover:text-white"
              }`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "register" && (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-white/80">
                  Full Name
                </span>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#f6c341]"
                  placeholder="Mohamed Amine"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-white/80">
                Phone (WhatsApp)
              </span>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#f6c341]"
                placeholder="+212600000001"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-white/80">
                Password
              </span>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#f6c341]"
                placeholder="••••••••"
              />
            </label>

            {mode === "register" && (
              <div>
                <span className="mb-1 block text-xs font-semibold text-white/80">
                  Role
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(["OWNER", "WORKER", "SUPPLIER"] as Role[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      className={`rounded-lg border px-2 py-2 text-xs font-bold ${
                        role === value
                          ? "border-[#f6c341] bg-[#f6c341] text-black"
                          : "border-white/20 text-white/80"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#f6c341] px-4 py-2.5 text-sm font-black text-black transition hover:bg-[#f5b918] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
            </button>
          </form>

          <p className="mt-3 text-[11px] text-white/60">
            Demo after seeding:
            <br />
            Owner: +212600000001 / Worker: +212600000002 / Supplier: +212600000003
            <br />
            Password: <span className="font-semibold text-white/85">boon12345</span>
          </p>
        </div>
      </div>
    </div>
  );
}
