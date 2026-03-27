import { Meal } from "@/data/mockData";

interface MealCalendarProps {
  meals: Meal[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const MealCalendar = ({ meals, selectedDate, onSelectDate }: MealCalendarProps) => {
  const referenceDate = selectedDate
    ? new Date(`${selectedDate}T00:00:00.000Z`)
    : new Date();
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstDayOfWeek = new Date(Date.UTC(year, month, 1)).getUTCDay();

  const mealDates = new Set(meals.map((m) => m.logged_at));
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 m-4 fade-slide-in" style={{ animationDelay: "50ms" }}>
      <h3 key={monthLabel} className="text-[16px] font-semibold text-[#1a1a1a] mb-4 month-slide">
        {monthLabel}
      </h3>
      <div className="grid grid-cols-7 gap-2">
        {dayNames.map((d) => (
          <div
            key={d}
            className="text-[11px] uppercase tracking-[0.05em] text-[#999] text-center py-1"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = toDateStr(day);
          const hasMeals = mealDates.has(dateStr);
          const isSelected = selectedDate === dateStr;

          return (
            <button
              key={day}
              onClick={() => hasMeals && onSelectDate(dateStr)}
              className={`calendar-day min-h-[72px] w-full text-left rounded-lg transition-colors px-2 py-2 ${
                isSelected ? "bg-[#b91c1c] text-white selected" : ""
              } ${
                hasMeals
                  ? "bg-[#fee2e2] cursor-pointer hover:bg-[#fecaca] has-meal"
                  : "bg-[#FAFAFA] text-[#555] cursor-default"
              }`}
            >
              <span className={`text-[13px] ${isSelected ? "text-white" : "text-[#555]"}`}>
                {day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MealCalendar;
