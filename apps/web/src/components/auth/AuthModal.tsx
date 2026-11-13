"use client";

import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import AuthForm from "./AuthForm";

export default function AuthModal() {
  const router = useRouter();

  function close() {
    router.push("/");
  }

  return (
    <ModalShell onClose={close} closeOnEscape>
      {/* Modal panel */}
      <div
        className="relative z-10 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute -top-3 -right-3 z-20 w-10 h-10 flex items-center justify-center bg-white rounded-full border-4 border-black shadow-[4px_4px_0_black] text-black font-black hover:translate-y-[2px] hover:shadow-[2px_2px_0_black] active:shadow-[0px_0px_0_black] active:translate-y-[4px] transition-all"
          aria-label="Close"
        >
          ✕
        </button>

        <AuthForm />
      </div>
    </ModalShell>
  );
}
