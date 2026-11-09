import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "@lovable.dev/cloud-auth-js/styles.css";

export function Auth({
  open,
  onOpenChange,
  next,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  next?: string;
}) {
  const returnUrl = () => (next ? new URL(next, window.location.origin).href : window.location.origin);
  const done = () => {
    if (next) window.location.assign(next);
    else onOpenChange(false);
  };
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function social(provider: "google" | "lovable") {
    setNote("");
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: returnUrl(),
    });
    if (result.error) setNote(result.error.message);
    else if (!result.redirected) done();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{signup ? "Create your AURELIA account" : "Sign in to AURELIA"}</DialogTitle>
        </DialogHeader>
        <Button variant="outline" className="google-auth" onClick={() => social("google")}>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
          Continue with Google
        </Button>
        <Button className="lovable-auth-button" onClick={() => social("lovable")}>
          Continue with Lovable
        </Button>
        <div className="my-1 text-center text-xs text-muted-foreground">or continue with email</div>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setNote("");
            const { data, error } = signup
              ? await supabase.auth.signUp({
                  email,
                  password,
                  options: { emailRedirectTo: returnUrl() },
                })
              : await supabase.auth.signInWithPassword({ email, password });
            setBusy(false);
            if (error) setNote(error.message);
            else if (data.session) done();
            else setNote("Check your email to confirm your account.");
          }}
        >
          <Input
            aria-label="Email"
            type="email"
            placeholder="Email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            aria-label="Password"
            type="password"
            placeholder="Password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
          </Button>
        </form>
        {note && (
          <p role="status" className="text-sm text-muted-foreground">
            {note}
          </p>
        )}
        <div className="flex justify-between">
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setSignup(!signup);
              setNote("");
            }}
          >
            {signup ? "Already have an account?" : "Create an account"}
          </Button>
          <Button
            variant="link"
            size="sm"
            onClick={async () => {
              if (!email) {
                setNote("Enter your email address first.");
                return;
              }
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/reset-password",
              });
              setNote(error?.message || "Check your email for a reset link.");
            }}
          >
            Reset password
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
