"use client";

import AuthForm from "@/components/auth/AuthForm";
import loginbg from "@/assets/loginbackground.gif";

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginbg.src})` }}
    >
      <div className="w-full max-w-md">
        <AuthForm />
      </div>
    </div>
  );
}
