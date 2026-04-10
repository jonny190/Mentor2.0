"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PREDEFINED_QUESTIONS } from "@/lib/types/security-questions";

const CUSTOM_OPTION = "Custom...";

type QuestionSlot = {
  selection: string;
  custom: string;
  answer: string;
};

const emptySlot = (): QuestionSlot => ({
  selection: PREDEFINED_QUESTIONS[0],
  custom: "",
  answer: "",
});

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slots, setSlots] = useState<QuestionSlot[]>([
    emptySlot(),
    emptySlot(),
    emptySlot(),
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateSlot = (index: number, patch: Partial<QuestionSlot>) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot))
    );
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("Name, email, and password are required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setStep(2);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const securityQuestions = slots.map((slot) => ({
      question:
        slot.selection === CUSTOM_OPTION
          ? slot.custom.trim()
          : slot.selection,
      answer: slot.answer.trim(),
    }));

    for (const sq of securityQuestions) {
      if (!sq.question || !sq.answer) {
        setError("Please fill in all security questions and answers");
        return;
      }
    }

    const texts = securityQuestions.map((s) => s.question.toLowerCase());
    if (new Set(texts).size !== texts.length) {
      setError("Please use 3 different security questions");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, securityQuestions }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">Mentor</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 1
              ? "Create your account"
              : "Set up security questions"}
          </p>
        </div>

        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleNext} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Next
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-xs text-gray-600">
              You will need these answers to reset your password. Pick a
              question from the list or enter your own.
            </p>
            {slots.map((slot, index) => (
              <div key={index} className="space-y-2 rounded border p-3">
                <Label>Question {index + 1}</Label>
                <Select
                  value={slot.selection}
                  onValueChange={(v) =>
                    updateSlot(index, { selection: v ?? PREDEFINED_QUESTIONS[0] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_QUESTIONS.map((q) => (
                      <SelectItem key={q} value={q}>
                        {q}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_OPTION}>{CUSTOM_OPTION}</SelectItem>
                  </SelectContent>
                </Select>
                {slot.selection === CUSTOM_OPTION && (
                  <Input
                    type="text"
                    placeholder="Enter your custom question"
                    value={slot.custom}
                    onChange={(e) =>
                      updateSlot(index, { custom: e.target.value })
                    }
                    required
                  />
                )}
                <Input
                  type="text"
                  placeholder="Your answer"
                  value={slot.answer}
                  onChange={(e) =>
                    updateSlot(index, { answer: e.target.value })
                  }
                  required
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
