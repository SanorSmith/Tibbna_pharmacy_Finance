"use client";

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircleIcon } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { commonSettings } from "@/content/common";
import Image from "next/image";
import { useTheme } from "next-themes";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { ttt } = useLanguage();
  const { resolvedTheme } = useTheme();
  const searchParams = useSearchParams();

  useEffect(() => {
    const authError = searchParams.get("error");

    if (authError) {
      switch (authError) {
        case "NO_EMAIL":
          setError(
            ttt(
              "No email address provided. Please try again with a valid email.",
            ),
          );
          break;
        case "USER_NOT_FOUND":
          setError(
            ttt(
              "User not found. Please contact your administrator to create an account.",
            ),
          );
          break;
        case "INVALID_PASSWORD":
        case "AccessDenied":
        default:
          setError(
            ttt(
              "Invalid email or password. Please check your credentials and try again.",
            ),
          );
          break;
      }
    }
  }, [searchParams, ttt]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(""); // Clear any previous errors
    try {
      await signIn("google", { redirectTo: "/d" });
    } catch (error) {
      console.error("Google login error:", error);
      setError(ttt("Failed to sign in with Google. Please try again."));
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(""); // Clear any previous errors

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirectTo: "/d",
        redirect: false,
      });

      if (result?.error) {
        console.error("Login failed:", result.error);
        // Handle different types of errors
        if (result.error === "CredentialsSignin") {
          setError(
            ttt(
              "Invalid email or password. Please check your credentials and try again.",
            ),
          );
        } else {
          setError(ttt("An error occurred during sign in. Please try again."));
        }
      } else if (result?.ok) {
        // Successful login
        window.location.href = "/d";
      } else {
        setError(ttt("An unexpected error occurred. Please try again."));
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(
        ttt("Network error. Please check your connection and try again."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <a href="#" className="flex items-center gap-2 self-center font-medium">
        <div className="flex size-6 items-center justify-center rounded-md">
          <Image
            src={
              resolvedTheme === "dark"
                ? commonSettings.LogoDark
                : commonSettings.Logo
            }
            alt={ttt("ServiceName")}
            width={24}
            height={24}
          />
        </div>
        {ttt("ServiceName")}
      </a>

      <div className={cn("flex gap-6 flex-col", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{ttt("Welcome back")}</CardTitle>
            <CardDescription>
              {ttt("Login with your Google account or email and password")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Google Login Button */}
              <div className="flex flex-col gap-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  {ttt("Login with Google")}
                </Button>
              </div>

              {/* Separator */}
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  {ttt("Or continue with")}
                </span>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handlePasswordLogin}>
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="email">{ttt("Email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <Label htmlFor="password">{ttt("Password")}</Label>
                      <a
                        href="#"
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        {ttt("Forgot your password?")}
                      </a>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? ttt("Signing in...") : ttt("Login")}
                  </Button>
                </div>
              </form>

              <div className="text-center text-sm">
                {ttt("Don't have an account?")}{" "}
                <a href="#" className="underline underline-offset-4">
                  {ttt("Sign up")}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
