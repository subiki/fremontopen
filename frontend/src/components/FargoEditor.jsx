import { useState } from "react";
import { PencilSimple, X, FloppyDisk } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { isUserLoggedIn } from "../lib/user_auth";
import { isLoggedIn as isAdminLoggedIn } from "../lib/auth";

// Inline editor for Fargo rating shown on PlayerDetail.
// - When admin is logged in: can edit any player's fargo
// - When user is logged in and this is their claimed player: can edit own
export const FargoEditor = ({ playerName, currentFargo, isOwner, onSaved }) => {
  const admin = isAdminLoggedIn();
  const user = isUserLoggedIn();
  const canEdit = admin || (user && isOwner);

  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(currentFargo ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const num = val === "" ? null : Number(val);
    if (num !== null && (Number.isNaN(num) || num < 200 || num > 900)) {
      toast.error("Fargo rating must be between 200 and 900");
      return;
    }
    setBusy(true);
    try {
      if (admin) {
        const adminToken = localStorage.getItem("cuestats_admin_token");
        await api.put(`/admin/players/${encodeURIComponent(playerName)}/fargo`, { fargo: num }, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } else {
        const userToken = localStorage.getItem("cuestats_user_token");
        await api.put("/me/fargo", { fargo: num }, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
      }
      toast.success("Fargo updated");
      setEditing(false);
      onSaved?.(num);
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message;
      toast.error(typeof msg === "string" ? msg : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="bg-[#141923] border border-[#273041] rounded-lg p-5 flex items-center justify-between"
      data-testid="fargo-card"
    >
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Fargo rating</div>
        <div className="mt-2 font-mono text-3xl font-semibold text-[#F59E0B]" data-testid="fargo-value">
          {currentFargo ?? "—"}
        </div>
        {!currentFargo && !editing ? (
          <div className="text-xs text-[#6B7280] mt-1">
            {canEdit ? "Click edit to set" : "Not set"}
          </div>
        ) : null}
      </div>
      {canEdit && !editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          data-testid="fargo-edit-button"
          className="inline-flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#F59E0B]"
        >
          <PencilSimple size={12} /> Edit
        </button>
      )}
      {editing && (
        <div className="flex items-center gap-2" data-testid="fargo-edit-form">
          <input
            type="number"
            min={200}
            max={900}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="500"
            data-testid="fargo-input"
            className="w-24 bg-[#0B0E14] border border-[#273041] rounded-md px-2 py-1 text-sm text-[#F3F4F6]"
            autoFocus
          />
          <button
            type="button"
            onClick={save}
            disabled={busy}
            data-testid="fargo-save"
            className="inline-flex items-center gap-1 bg-[#10B981] hover:bg-[#059669] text-[#0B0E14] font-semibold text-xs px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            <FloppyDisk size={12} /> Save
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setVal(currentFargo ?? ""); }}
            data-testid="fargo-cancel"
            className="text-[#9CA3AF] hover:text-[#F3F4F6]"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
