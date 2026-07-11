"use client";

import { useState } from "react";
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isBefore, isAfter, isWithinInterval,
} from "date-fns";
import { de } from "date-fns/locale";

type Props = {
  bookedRanges: { start: string; end: string }[];
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
};

function isDayBooked(day: Date, ranges: { start: string; end: string }[]): boolean {
  return ranges.some((r) => {
    const rs = new Date(r.start);
    const re = new Date(r.end);
    return isWithinInterval(day, { start: rs, end: re }) && !isSameDay(day, re);
  });
}

export default function AvailabilityCalendar({ bookedRanges, startDate, endDate, onChange }: Props) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(new Date()));

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selStart = startDate ? new Date(startDate) : null;
  const selEnd = endDate ? new Date(endDate) : null;

  function handleDayClick(day: Date) {
    if (isBefore(day, today)) return;
    if (isDayBooked(day, bookedRanges)) return;

    if (!selStart || (selStart && selEnd)) {
      onChange(format(day, "yyyy-MM-dd"), "");
      return;
    }
    if (isBefore(day, selStart)) {
      onChange(format(day, "yyyy-MM-dd"), "");
      return;
    }

    // Prüfen ob im gewählten Bereich ein belegter Tag liegt
    const range = eachDayOfInterval({ start: selStart, end: day });
    const hasBookedInRange = range.some((d) => isDayBooked(d, bookedRanges));
    if (hasBookedInRange) {
      onChange(format(day, "yyyy-MM-dd"), "");
      return;
    }

    onChange(format(selStart, "yyyy-MM-dd"), format(day, "yyyy-MM-dd"));
  }

  const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
        >
          ←
        </button>
        <span className="font-semibold text-gray-800 text-sm capitalize">
          {format(viewMonth, "MMMM yyyy", { locale: de })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
        >
          →
        </button>
      </div>

      {/* Wochentage */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Tage */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const past = isBefore(day, today);
          const booked = isDayBooked(day, bookedRanges);
          const isStart = selStart && isSameDay(day, selStart);
          const isEnd = selEnd && isSameDay(day, selEnd);
          const inRange = selStart && selEnd && isWithinInterval(day, { start: selStart, end: selEnd });
          const disabled = past || booked || !inMonth;

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => handleDayClick(day)}
              className={`aspect-square rounded-lg text-xs flex items-center justify-center transition-colors relative
                ${!inMonth ? "text-gray-200" : ""}
                ${inMonth && past ? "text-gray-300 line-through" : ""}
                ${inMonth && booked && !past ? "bg-red-50 text-red-300 line-through cursor-not-allowed" : ""}
                ${inMonth && !past && !booked ? "text-gray-700 hover:bg-green-50 cursor-pointer" : ""}
                ${isStart || isEnd ? "bg-green-600 text-white font-semibold" : ""}
                ${inRange && !isStart && !isEnd ? "bg-green-100 text-green-800" : ""}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Legende */}
      <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-600 inline-block" /> Ausgewählt</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block" /> Belegt</span>
      </div>
    </div>
  );
}
