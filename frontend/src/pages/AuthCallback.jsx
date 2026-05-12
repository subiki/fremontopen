import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { finishOauth } from "../lib/user_auth";
import { toast } from "sonner";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [err, setErr] = useState(null);

  useEffect(() => {
    const code = params.get("code");
    const stateParam = params.get("state") || "";
    const [provider] = stateParam.split(":");
    const fallback = localStorage.getItem("cuestats_oauth_provider");
    const finalProvider = provider || fallback;

    if (!code || !finalProvider) {
      setErr("Missing OAuth code or provider");
      return;
    }
    (async () => {
      try {
        const user = await finishOauth(finalProvider, code);
        toast.success(`Welcome, ${user.display_name}`);
        nav("/me", { replace: true });
      } catch (e) {
        const msg = e?.response?.data?.detail || e.message || "Sign-in failed";
        setErr(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
    })();
  }, [params, nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] text-[#F3F4F6]" data-testid="auth-callback-page">
      <div className="text-center max-w-md">
        {err ? (
          <>
            <h2 className="font-[Outfit] text-2xl font-semibold mb-2">Sign-in failed</h2>
            <p className="text-sm text-[#EF4444] mb-4">{err}</p>
            <a href="/login" className="text-[#10B981] hover:underline text-sm">Try again →</a>
          </>
        ) : (
          <>
            <div className="animate-spin h-10 w-10 border-2 border-[#10B981] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm text-[#9CA3AF]">Completing sign-in…</p>
          </>
        )}
      </div>
    </div>
  );
}
