"use client";

import { Fragment, useMemo } from "react";
import { useContexts } from "@/hooks/use-contexts";
import { useSlots } from "@/hooks/use-slots";
import { useRoleStore, getVisibleDates } from "@/stores/role-store";
import { usePreferences } from "@/hooks/use-preferences";
import { CalendarCell } from "./calendar-cell";
import { ContextSymbol } from "@/components/shared/context-symbol";
import type { TimeSlotWithContext } from "@/lib/types/slot";
import { isoToLocalDateKey } from "@/lib/types/date-utils";

type CalendarGridProps = {
  onCellClick: (contextId: number, date: string) => void;
  onSlotClick: (slot: TimeSlotWithContext) => void;
};

export function CalendarGrid({ onCellClick, onSlotClick }: CalendarGridProps) {
  const { weekOffset, weeksToShow, selectedCell } = useRoleStore();
  const { data: contexts } = useContexts();
  const { data: prefs } = usePreferences();

  const dates = useMemo(
    () => getVisibleDates(weekOffset, weeksToShow),
    [weekOffset, weeksToShow]
  );

  const from = dates[0];
  const to = dates[dates.length - 1];
  const { data: slots } = useSlots(from, to);

  const roles = useMemo(
    () => (contexts ?? []).filter((ctx) => ctx.ctxType === 0),
    [contexts]
  );

  const compact = prefs?.zoom === "small";

  const slotMap = useMemo(() => {
    const map = new Map<string, TimeSlotWithContext[]>();
    for (const slot of slots ?? []) {
      const key = `${slot.contextId ?? 0}-${isoToLocalDateKey(slot.dateScheduled)}`;
      const arr = map.get(key);
      if (arr) {
        arr.push(slot);
      } else {
        map.set(key, [slot]);
      }
    }
    return map;
  }, [slots]);

  const todayStr = new Date().toISOString().split("T")[0];

  if (roles.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">
          No roles defined. Create a role context to get started.
        </p>
      </div>
    );
  }

  const dayCount = dates.length;

  return (
    <div className="flex-1 overflow-auto">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `100px repeat(${dayCount}, minmax(60px, 1fr))`,
        }}
      >
        {/* Header row */}
        <div className="sticky top-0 left-0 z-20 border-b border-r bg-white p-1 text-xs font-medium text-gray-500">
          Role
        </div>
        {dates.map((date) => {
          const d = new Date(date + "T00:00:00");
          const dayOfWeek = d.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isToday = date === todayStr;
          return (
            <div
              key={date}
              className={`sticky top-0 z-10 border-b border-r p-1 text-center text-xs ${
                isWeekend ? "bg-gray-50" : "bg-white"
              } ${isToday ? "font-bold text-blue-600" : "text-gray-600"}`}
            >
              <div>
                {d.toLocaleDateString("en-GB", { weekday: "short" })}
              </div>
              <div>{d.getDate()}</div>
            </div>
          );
        })}

        {/* Context rows */}
        {roles.map((ctx) => (
          <Fragment key={ctx.id}>
            <div className="sticky left-0 z-10 flex items-center gap-1 border-b border-r bg-white p-1 text-xs font-medium text-gray-700 truncate">
              <ContextSymbol icon={ctx.symbolIcon} className="size-3.5 text-gray-500" />
              <span className="truncate">{ctx.name}</span>
            </div>
            {dates.map((date) => {
              const key = `${ctx.id}-${date}`;
              const cellSlots = slotMap.get(key) ?? [];
              const isToday = date === todayStr;
              const isSelected =
                selectedCell?.contextId === ctx.id &&
                selectedCell?.date === date;
              return (
                <CalendarCell
                  key={key}
                  date={date}
                  contextId={ctx.id}
                  slots={cellSlots}
                  isToday={isToday}
                  isSelected={isSelected}
                  compact={compact}
                  onCellClick={onCellClick}
                  onSlotClick={onSlotClick}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
