"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, Edit, Repeat, CheckCircle, Trash2 } from "lucide-react";
import { WeekSelector } from "@/components/role-view/week-selector";
import { CalendarGrid } from "@/components/role-view/calendar-grid";
import { SlotEditorDialog } from "@/components/schedule-view/slot-editor-dialog";
import { RepeatPatternDialog } from "@/components/role-view/repeat-pattern-dialog";
import { useRoleStore } from "@/stores/role-store";
import { useDeleteSlot, useCompleteSlot } from "@/hooks/use-slots";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { TimeSlotWithContext } from "@/lib/types/slot";

export default function RolesPage() {
  const { setSelectedCell, goToCurrentWeek } = useRoleStore();
  const deleteSlot = useDeleteSlot();
  const completeSlot = useCompleteSlot();

  // Slot editor state
  const [slotEditorOpen, setSlotEditorOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlotWithContext | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [defaultContextId, setDefaultContextId] = useState<number | null>(null);

  // Repeat dialog state
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatSlotId, setRepeatSlotId] = useState<number | null>(null);
  const [repeatSlotDate, setRepeatSlotDate] = useState("");

  // Dropdown menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<TimeSlotWithContext | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleCellClick = useCallback(
    (contextId: number, date: string) => {
      setSelectedCell({ contextId, date });
      setEditingSlot(null);
      setDefaultDate(date);
      setDefaultContextId(contextId);
      setSlotEditorOpen(true);
    },
    [setSelectedCell]
  );

  const handleSlotClick = useCallback((slot: TimeSlotWithContext) => {
    setActiveSlot(slot);
    setMenuOpen(true);
  }, []);

  const handleNewSlot = () => {
    setEditingSlot(null);
    setDefaultDate(undefined);
    setDefaultContextId(null);
    setSlotEditorOpen(true);
  };

  const handleEditSlot = () => {
    if (!activeSlot) return;
    setEditingSlot(activeSlot);
    setDefaultDate(activeSlot.dateScheduled);
    setDefaultContextId(activeSlot.contextId);
    setSlotEditorOpen(true);
    setMenuOpen(false);
  };

  const handleSetRepeat = () => {
    if (!activeSlot) return;
    setRepeatSlotId(activeSlot.id);
    setRepeatSlotDate(activeSlot.dateScheduled);
    setRepeatOpen(true);
    setMenuOpen(false);
  };

  const handleCompleteSlot = async () => {
    if (!activeSlot) return;
    await completeSlot.mutateAsync(activeSlot.id);
    setMenuOpen(false);
  };

  const handleDeleteSlot = async () => {
    if (!activeSlot) return;
    await deleteSlot.mutateAsync(activeSlot.id);
    setMenuOpen(false);
  };

  const shortcuts = useMemo(
    () => ({
      "ctrl+n": () => {
        setDefaultDate(undefined);
        setDefaultContextId(null);
        setSlotEditorOpen(true);
      },
      " ": () => goToCurrentWeek(),
    }),
    [goToCurrentWeek]
  );
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleNewSlot}>
            <Plus className="mr-1 h-4 w-4" />
            New Slot
          </Button>
        </div>
        <WeekSelector />
      </div>

      {/* Calendar Grid */}
      <CalendarGrid onCellClick={handleCellClick} onSlotClick={handleSlotClick} />

      {/* Slot Editor Dialog (reused) */}
      <SlotEditorDialog
        open={slotEditorOpen}
        onOpenChange={setSlotEditorOpen}
        slot={editingSlot}
        defaultDate={defaultDate}
        defaultContextId={defaultContextId}
      />

      {/* Repeat Pattern Dialog */}
      <RepeatPatternDialog
        open={repeatOpen}
        onOpenChange={setRepeatOpen}
        slotId={repeatSlotId}
        slotDate={repeatSlotDate}
      />

      {/* Slot actions dropdown */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger render={<button ref={triggerRef} className="sr-only" aria-hidden />} />
        <DropdownMenuContent align="start" side="bottom">
          <DropdownMenuItem onClick={handleEditSlot}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Slot
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSetRepeat}>
            <Repeat className="mr-2 h-4 w-4" />
            Set Repeat
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCompleteSlot}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Complete Slot
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDeleteSlot}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Slot
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
