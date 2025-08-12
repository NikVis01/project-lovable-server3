import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignupForm({
  setIsSignup,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  setIsSignup: (isSignup: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await authClient.signUp.email({
        email,
        password,
        name,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to create account");
    }

    toast.success(
      "Account created! Please check your email to verify your account."
    );
    router.push("/dashboard");
    setIsLoading(false);
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: process.env.NEXT_PUBLIC_WEB_URL + "/dashboard",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to create account");
    }

    // Simulate a successful Google signup
    toast.success("Signed up with Google successfully.");
    router.push("/dashboard");
    setIsLoading(false);
  };
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl'>Create your account</CardTitle>
          <CardDescription>
            Sign up with your Apple or Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSignup}>
            <div className='grid gap-6'>
              <div className='flex flex-col gap-4'>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={handleGoogleSignup}
                  disabled
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    className='w-4 h-4 mr-2'
                  >
                    <path
                      d='M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'
                      fill='currentColor'
                    />
                  </svg>
                  Sign up with Google
                </Button>
              </div>
              <div className='relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border'>
                <span className='relative z-10 bg-background px-2 text-muted-foreground'>
                  Or continue with
                </span>
              </div>
              <div className='grid gap-6'>
                <div className='grid gap-2'>
                  <Label htmlFor='name'>Full Name</Label>
                  <Input
                    id='name'
                    type='text'
                    placeholder='John Doe'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='m@example.com'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='password'>Password</Label>
                  <Input
                    id='password'
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='confirm-password'>Confirm Password</Label>
                  <Input
                    id='confirm-password'
                    type='password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type='submit' className='w-full' disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </div>
              <div className='text-center text-sm'>
                Already have an account?{" "}
                <a
                  href='#'
                  className='underline underline-offset-4'
                  onClick={() => setIsSignup(false)}
                >
                  Sign in
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className='text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary  '>
        By clicking continue, you agree to our <a href='#'>Terms of Service</a>{" "}
        and <a href='#'>Privacy Policy</a>.
      </div>
    </div>
  );
}
