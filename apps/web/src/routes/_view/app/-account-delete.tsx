import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { deleteAccount } from "@/functions/billing";

export function DeleteAccountSection() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const deleteAccountMutation = useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: () => {
      navigate({ to: "/" });
    },
  });

  return (
    <section>
      <h2 className="text-lg font-medium mb-2 font-serif">Delete Account</h2>
      <p className="text-sm text-neutral-500 mb-4">
        Char is a local-first app — your notes, transcripts, and meeting data
        are stored locally on your device and will not be affected by account
        deletion. Deleting your account only removes your cloud-stored data.
      </p>
      {showConfirm ? (
        <div className="p-4 border border-red-200 rounded-md bg-red-50">
          <p className="text-sm text-red-800 mb-3">
            Are you sure? This will permanently delete your account and all
            cloud-stored data. Your local data will not be affected.
          </p>
          {deleteAccountMutation.isError && (
            <p className="text-sm text-red-600 mb-3">
              {deleteAccountMutation.error?.message ||
                "Failed to delete account"}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
              className="px-4 h-8 flex items-center text-sm bg-red-600 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              {deleteAccountMutation.isPending
                ? "Deleting..."
                : "Yes, Delete My Account"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={deleteAccountMutation.isPending}
              className="px-4 h-8 flex items-center text-sm bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="cursor-pointer px-4 h-8 flex items-center text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-full transition-all"
        >
          Delete Account
        </button>
      )}
    </section>
  );
}
