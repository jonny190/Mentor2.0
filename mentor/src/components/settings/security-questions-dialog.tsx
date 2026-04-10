"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SecurityQuestionsDialog({ open, onOpenChange }: Props) {
  const [slots, setSlots] = useState<QuestionSlot[]>([
    emptySlot(),
    emptySlot(),
    emptySlot(),
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/user/security-questions");
      if (!res.ok) return;
      const data = (await res.json()) as {
        questions: { id: number; question: string; sortOrder: number }[];
      };
      if (cancelled) return;
      const next: QuestionSlot[] = [emptySlot(), emptySlot(), emptySlot()];
      data.questions.slice(0, 3).forEach((q, i) => {
        const isPredefined = (PREDEFINED_QUESTIONS as readonly string[]).includes(
          q.question
        );
        next[i] = {
          selection: isPredefined ? q.question : CUSTOM_OPTION,
          custom: isPredefined ? "" : q.question,
          answer: "",
        };
      });
      setSlots(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const updateSlot = (index: number, patch: Partial<QuestionSlot>) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot))
    );
  };

  async function handleSave() {
    setError("");

    const questions = slots.map((slot) => ({
      question:
        slot.selection === CUSTOM_OPTION
          ? slot.custom.trim()
          : slot.selection,
      answer: slot.answer.trim(),
    }));

    for (const q of questions) {
      if (!q.question || !q.answer) {
        setError("Please fill in all questions and answers");
        return;
      }
    }

    const texts = questions.map((q) => q.question.toLowerCase());
    if (new Set(texts).size !== texts.length) {
      setError("Please use 3 different security questions");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/user/security-questions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Unable to save");
      return;
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Security Questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Update your 3 security questions. For your safety, please re-enter
            all answers.
          </p>

          {error && (
            <div className="rounded bg-red-50 p-2 text-xs text-red-600">
              {error}
            </div>
          )}

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
                />
              )}
              <Input
                type="password"
                placeholder="Answer"
                value={slot.answer}
                onChange={(e) => updateSlot(index, { answer: e.target.value })}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
