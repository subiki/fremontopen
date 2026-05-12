import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, SignIn } from "@phosphor-icons/react";
import { login, formatApiError } from "../lib/auth";
import { toast } from "sonner";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back, admin");
      nav("/admin");
    } catch (ex) {
      setErr(formatApiError(ex?.response?.data?.detail) || ex.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#0B0E14] felt-grain px-4"
      data-testid="admin-login-page"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-[#141923] border border-[#273041] rounded-lg p-8 space-y-5"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center">
            <Lock size={18} weight="duotone" className="text-[#10B981]" />
          </div>
          <div>
            <h1 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6]">Admin Sign-in</h1>
            <p className="text-xs text-[#6B7280] mt-1">Tournament organizer access</p>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-[#6B7280] mb-2">Email</label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="admin-email-input"
            className="w-full bg-[#0B0E14] border border-[#273041] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none rounded-md px-4 py-2.5 text-sm text-[#F3F4F6]"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-[#6B7280] mb-2">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="admin-password-input"
            className="w-full bg-[#0B0E14] border border-[#273041] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none rounded-md px-4 py-2.5 text-sm text-[#F3F4F6]"
          />
        </div>

        {err ? (
          <div
            className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-sm px-4 py-2 rounded-md"
            data-testid="admin-login-error"
          >
            {err}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || !email || !password}
          data-testid="admin-login-submit"
          className="w-full inline-flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-[#0B0E14] font-semibold text-sm px-4 py-3 rounded-md transition-colors"
        >
          <SignIn size={16} weight="bold" />
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
