import React from "react";

interface DateTimeCellProps {
  value: string | Date | null | undefined;
  className?: string;
  timeClassName?: string;
  withSeconds?: boolean;
}

const dateFmt: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
const timeFmt = (withSeconds: boolean): Intl.DateTimeFormatOptions =>
  withSeconds ? { hour: "2-digit", minute: "2-digit", second: "2-digit" } : { hour: "2-digit", minute: "2-digit" };

export function DateTimeCell({ value, className = "", timeClassName = "text-xs text-gray-400", withSeconds = false }: DateTimeCellProps) {
  if (!value) {
    return <span className={`whitespace-nowrap ${className}`}>—</span>;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return <span className={`whitespace-nowrap ${className}`}>—</span>;
  }
  const dateStr = date.toLocaleDateString("en-GB", dateFmt);
  const timeStr = date.toLocaleTimeString("en-GB", timeFmt(withSeconds));
  return (
    <span className={`inline-flex flex-col gap-0.5 whitespace-nowrap leading-tight ${className}`}>
      <span className="font-medium" dir="ltr">{dateStr}</span>
      <span className={timeClassName} dir="ltr">{timeStr}</span>
    </span>
  );
}
