import { RepeatType } from "@/lib/types/repeat";

export type RepeatConfig = {
  type: number;
  intervalVal: number;
  dateFrom: Date;
  dateTo: Date | null;
  occurrences: number;
  pattern: string;
};

export function generateRepeatDates(
  config: RepeatConfig,
  rangeFrom: Date,
  rangeTo: Date
): Date[] {
  const dates: Date[] = [];
  const maxOccurrences = config.occurrences > 0 ? config.occurrences : 1000;
  let count = 0;
  const effectiveEnd = config.dateTo && config.dateTo < rangeTo ? config.dateTo : rangeTo;

  switch (config.type) {
    case RepeatType.DAILY: {
      const current = new Date(config.dateFrom);
      while (current <= effectiveEnd && count < maxOccurrences) {
        if (current >= rangeFrom) dates.push(new Date(current));
        current.setDate(current.getDate() + config.intervalVal);
        count++;
      }
      break;
    }
    case RepeatType.WEEKLY: {
      const weekdays = config.pattern
        ? config.pattern.split(",").map((d) => parseInt(d.trim()))
        : [config.dateFrom.getDay() === 0 ? 6 : config.dateFrom.getDay() - 1];
      const current = new Date(config.dateFrom);
      const dayOfWeek = current.getDay() === 0 ? 6 : current.getDay() - 1;
      current.setDate(current.getDate() - dayOfWeek);
      while (current <= effectiveEnd && count < maxOccurrences) {
        for (const wd of weekdays) {
          const date = new Date(current);
          date.setDate(date.getDate() + wd);
          if (date >= config.dateFrom && date >= rangeFrom && date <= effectiveEnd) {
            dates.push(new Date(date));
            count++;
          }
        }
        current.setDate(current.getDate() + 7 * config.intervalVal);
      }
      break;
    }
    case RepeatType.MONTHLY_DATE: {
      const current = new Date(config.dateFrom);
      const dayOfMonth = current.getDate();
      while (current <= effectiveEnd && count < maxOccurrences) {
        if (current >= rangeFrom) dates.push(new Date(current));
        current.setMonth(current.getMonth() + config.intervalVal);
        current.setDate(Math.min(dayOfMonth, new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()));
        count++;
      }
      break;
    }
    case RepeatType.MONTHLY_DAY: {
      const current = new Date(config.dateFrom);
      const targetDay = current.getDay();
      const weekNum = Math.floor((current.getDate() - 1) / 7);
      while (current <= effectiveEnd && count < maxOccurrences) {
        if (current >= rangeFrom) dates.push(new Date(current));
        current.setMonth(current.getMonth() + config.intervalVal);
        const firstOfMonth = new Date(current.getFullYear(), current.getMonth(), 1);
        const diff = (targetDay - firstOfMonth.getDay() + 7) % 7;
        const targetDate = 1 + diff + weekNum * 7;
        if (targetDate <= new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()) {
          current.setDate(targetDate);
        }
        count++;
      }
      break;
    }
    case RepeatType.YEARLY_DATE:
    case RepeatType.YEARLY_DAY: {
      const current = new Date(config.dateFrom);
      while (current <= effectiveEnd && count < maxOccurrences) {
        if (current >= rangeFrom) dates.push(new Date(current));
        current.setFullYear(current.getFullYear() + config.intervalVal);
        count++;
      }
      break;
    }
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}
