"use client";
import { useState } from "react";

import { SignupForm } from "@/components/signup-form";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/Navbar";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session]);

  return (
    <div className='bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10'>
      <div className='flex w-full max-w-sm flex-col gap-6'>
        <a href='#' className='flex items-center gap-2 self-center font-medium'>
          <Logo />s
        </a>
        {isSignup ? (
          <SignupForm setIsSignup={setIsSignup} />
        ) : (
          <LoginForm setIsSignup={setIsSignup} />
        )}
      </div>
    </div>
  );
}
