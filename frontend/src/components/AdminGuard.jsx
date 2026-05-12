import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { verifyToken } from "../lib/auth";

// Protects admin routes — redirects to /admin/login on missing/invalid token
export const AdminGuard = ({ children }) => {
  const [state, setState] = useState({ checking: true, ok: false });

  useEffect(() => {
    let active = true;
    (async () => {
      const me = await verifyToken();
      if (active) setState({ checking: false, ok: !!me });
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] text-[#6B7280] text-sm">
        Verifying session…
      </div>
    );
  }
  if (!state.ok) return <Navigate to="/admin/login" replace />;
  return children;
};
