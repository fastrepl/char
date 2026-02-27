import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { updateUserEmail } from "@/functions/auth";

export function ProfileInfoSection({ email }: { email?: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await updateUserEmail({ data: { email } });
      if ("error" in res && res.error) {
        throw new Error(res.error);
      }
      return res;
    },
    onSuccess: (data) => {
      if ("message" in data && data.message) {
        setSuccessMessage(data.message);
      }
      setIsEditing(false);
      setNewEmail("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail && newEmail !== email) {
      updateEmailMutation.mutate(newEmail);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewEmail("");
    updateEmailMutation.reset();
  };

  return (
    <section>
      <h2 className="text-lg font-medium mb-4 font-serif">Profile info</h2>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-sm text-neutral-500 mb-1">Email</div>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={email || "Enter new email"}
                  className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              {updateEmailMutation.isError && (
                <p className="text-sm text-red-600">
                  {updateEmailMutation.error?.message ||
                    "Failed to update email"}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={
                    updateEmailMutation.isPending ||
                    !newEmail ||
                    newEmail === email
                  }
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  {updateEmailMutation.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={updateEmailMutation.isPending}
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-base">{email || "Not available"}</div>
              <button
                onClick={() => {
                  setIsEditing(true);
                  setSuccessMessage(null);
                }}
                className="px-3 h-7 flex items-center text-xs bg-linear-to-b from-white to-stone-50 border border-neutral-300 text-neutral-700 rounded-full shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
              >
                Change
              </button>
            </div>
          )}
        </div>
        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}
      </div>
    </section>
  );
}
