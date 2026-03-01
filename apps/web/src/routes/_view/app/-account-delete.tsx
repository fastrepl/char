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
      <h2 className="mb-2 font-serif text-lg font-medium">Delete Account</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Char is a local-first app — your notes, transcripts, and meeting data
        are stored locally on your device and will not be affected by account
        deletion. Deleting your account only removes your cloud-stored data.
      </p>
      {showConfirm ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="mb-3 text-sm text-red-800">
            Are you sure? This will permanently delete your account and all
            cloud-stored data. Your local data will not be affected.
          </p>
          {deleteAccountMutation.isError && (
            <p className="mb-3 text-sm text-red-600">
              {deleteAccountMutation.error?.message ||
                "Failed to delete account"}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
              className="flex h-8 items-center rounded-full bg-red-600 px-4 text-sm text-white shadow-md transition-all hover:scale-[102%] hover:shadow-lg active:scale-[98%] disabled:opacity-50 disabled:hover:scale-100"
            >
              {deleteAccountMutation.isPending
                ? "Deleting..."
                : "Yes, Delete My Account"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={deleteAccountMutation.isPending}
              className="flex h-8 items-center rounded-full border border-neutral-300 bg-linear-to-b from-white to-stone-50 px-4 text-sm text-neutral-700 shadow-xs transition-all hover:scale-[102%] hover:shadow-md active:scale-[98%] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="flex h-8 cursor-pointer items-center rounded-full border border-red-200 px-4 text-sm text-red-600 transition-all hover:border-red-300 hover:text-red-700"
        >
          Delete Account
        </button>
      )}
    </section>
  );
}
