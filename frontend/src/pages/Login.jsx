import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DiscordLogo, FacebookLogo, GoogleLogo, ShieldCheck } from "@phosphor-icons/react";
import { startOauth, isUserLoggedIn } from "../lib/user_auth";

const PROVIDERS = [
  { id: "google", label: "Continue with Google", icon: GoogleLogo, color: "bg-white text-[#0B0E14] hover:bg-gray-100", testid: "login-google" },
  { id: "discord", label: "Continue with Discord", icon: DiscordLogo, color: "bg-[#5865F2] text-white hover:bg-[#4752C4]", testid: "login-discord" },
  { id: "facebook", label: "Continue with Facebook", icon: FacebookLogo, color: "bg-[#1877F2] text-white hover:bg-[#0E5FB8]", testid: "login-facebook" },
];

export default function Login() {
  const [loading, setLoading] = useState(null);

  // If already logged in, redirect home
  useEffect(() => {
    if (isUserLoggedIn()) window.location.href = "/";
  }, []);

  const handle = async (id) => {
    setLoading(id);
    try {
      await startOauth(id);
    } catch (e) {
      setLoading(null);
      alert(`${id} sign-in is not configured yet. Ask the admin to set the OAuth credentials.`);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#0B0E14] felt-grain px-4"
      data-testid="login-page"
    >
      <div className="w-full max-w-md">
        <div className="bg-[#141923] border border-[#273041] rounded-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-[Outfit] text-3xl font-semibold text-[#F3F4F6]">Sign in to CueStats</h1>
            <p className="text-sm text-[#9CA3AF]">
              Follow your favorite players and claim your profile
            </p>
          </div>

          <div className="space-y-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handle(p.id)}
                disabled={loading !== null}
                data-testid={p.testid}
                className={`w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-md font-medium text-sm transition-colors disabled:opacity-50 ${p.color}`}
              >
                <p.icon size={18} weight="fill" />
                {loading === p.id ? "Redirecting…" : p.label}
              </button>
            ))}
          </div>

          <div className="flex items-start gap-2 text-xs text-[#6B7280] bg-[#0B0E14] border border-[#273041] rounded-md p-3">
            <ShieldCheck size={16} weight="duotone" className="text-[#10B981] shrink-0 mt-0.5" />
            <span>
              Privacy first. We never expose your username or account to other players. No direct messaging. You can sign out anytime.
            </span>
          </div>

          <div className="text-center text-xs text-[#6B7280]">
            <Link to="/" className="hover:text-[#10B981]">← Continue without signing in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
