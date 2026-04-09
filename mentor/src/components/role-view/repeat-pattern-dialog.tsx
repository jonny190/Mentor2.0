"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { RepeatTypeLabels, RepeatPriorityLabels, WEEKDAY_LABELS } from "@/lib/types/repeat";
import { useSetRepeatPattern } from "@/hooks/use-repeat";
import { cn } from "@/lib/utils";

type RepeatPatternDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotId: number | null;
  slotDate: string;
};

export function RepeatPatternDialog({
  open,
  onOpenChange,
  slotId,
  slotDate,
}: RepeatPatternDialogProps) {
  const [type, setType] = useState(0);
  const [intervalVal, setIntervalVal] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [priority, setPriority] = useState(1);
  const [forever, setForever] = useState(true);
  const [dateTo, setDateTo] = useState("");
  const [occurrences, setOccurrences] = useState(0);

  const setRepeat = useSetRepeatPattern();

  useEffect(() => {
    if (open) {
      setType(0);
      setIntervalVal(1);
      setWeekdays([]);
      setPriority(1);
      setForever(true);
      setDateTo("");
      setOccurrences(0);
    }
  }, [open]);

  const toggleWeekday = (index: number) => {
    setWeekdays((prev) =>
      prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index]
    );
  };

  const handleSubmit = async () => {
    if (slotId === null) return;

    await setRepeat.mutateAsync({
      slotId,
      type,
      intervalVal,
      dateFrom: slotDate,
      dateTo: forever ? null : dateTo || null,
      occurrences: forever ? 0 : occurrences,
      priority,
      pattern: type === 2 ? weekdays.join(",") : "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Repeat Pattern</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Repeat Type</Label>
            <Select
              value={String(type)}
              onValueChange={(val) => setType(Number(val))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RepeatTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type > 0 && (
            <>
              <div className="space-y-2">
                <Label>Interval</Label>
                <Input
                  type="number"
                  min={1}
                  value={intervalVal}
                  onChange={(e) => setIntervalVal(Number(e.target.value))}
                />
              </div>

              {type === 2 && (
                <div className="space-y-2">
                  <Label>Weekdays</Label>
                  <div className="flex gap-1">
                    {WEEKDAY_LABELS.map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleWeekday(i)}
                        className={cn(
                          "rounded px-2 py-1 text-xs",
                          weekdays.includes(i)
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={String(priority)}
                  onValueChange={(val) => setPriority(Number(val))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RepeatPriorityLabels).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="repeat-forever"
                  checked={forever}
                  onChange={(e) => setForever(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="repeat-forever">Repeat forever</Label>
              </div>

              {!forever && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Until date</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label># Occurrences</Label>
                    <Input
                      type="number"
                      min={0}
                      value={occurrences}
                      onChange={(e) => setOccurrences(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={setRepeat.isPending}>
            {setRepeat.isPending
              ? "Saving..."
              : type === 0
                ? "Remove Repeat"
                : "Set Repeat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
