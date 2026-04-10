"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Question = { id: number; question: string };

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(
      `/api/auth/forgot-password?email=${encodeURIComponent(email)}`
    );
    if (!res.ok) {
      setError("Unable to look up account");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { questions: Question[] };
    if (data.questions.length !== 3) {
      setError(
        "No security questions are set up for this account. Contact support."
      );
      setLoading(false);
      return;
    }
    setQuestions(data.questions);
    const next: Record<number, string> = {};
    for (const q of data.questions) next[q.id] = "";
    setAnswers(next);
    setStep(2);
    setLoading(false);
  }

  function handleAnswersSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    for (const q of questions) {
      if (!answers[q.id]?.trim()) {
        setError("Please answer all questions");
        return;
      }
    }
    setStep(3);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        newPassword,
        answers: questions.map((q) => ({
          questionId: q.id,
          answer: answers[q.id],
        })),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Unable to reset password");
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Mentor
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Reset your password
          </p>
        </div>

        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Looking up account..." : "Continue"}
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleAnswersSubmit} className="space-y-4">
            <p className="text-xs text-gray-600">
              Answer all 3 security questions to continue.
            </p>
            {questions.map((q) => (
              <div key={q.id} className="space-y-1.5">
                <Label>{q.question}</Label>
                <Input
                  type="text"
                  required
                  value={answers[q.id] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1">
                Next
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep(2)}
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Resetting..." : "Reset password"}
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-gray-600">
          Remembered it?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
