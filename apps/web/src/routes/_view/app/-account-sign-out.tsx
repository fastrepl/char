import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { signOutFn } from "@/functions/auth";

export function SignOutSection() {
  const navigate = useNavigate();

  const signOut = useMutation({
    mutationFn: async () => {
      const res = await signOutFn();
      if (res.success) {
        return true;
      }

      throw new Error(res.message);
    },
    onSuccess: () => {
      navigate({ to: "/" });
    },
    onError: (error) => {
      console.error(error);
      navigate({ to: "/" });
    },
  });

  return (
    <section className="pt-6">
      <button
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
        className="flex h-8 cursor-pointer items-center rounded-full border border-red-200 px-4 text-sm text-red-600 transition-all hover:border-red-300 hover:text-red-700 disabled:opacity-50 disabled:hover:border-red-200"
      >
        {signOut.isPending ? "Signing out..." : "Sign out"}
      </button>
    </section>
  );
}
