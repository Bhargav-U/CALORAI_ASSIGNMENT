import { useState } from "react";
import { Meal } from "@/data/mockData";

interface MealLogProps {
  meals: Meal[];
  selectedDate: string | null;
  onDeleteMeal: (id: number) => void;
  onEditMeal: (id: number, newText: string) => void;
  onAddMeal: (meal: Omit<Meal, "id">) => void;
  selectedUserId: number;
  isLoading: boolean;
}

const labelColors: Record<string, string> = {
  breakfast: "bg-[#fee2e2] text-[#7f1d1d]",
  lunch: "bg-[#fecaca] text-[#7f1d1d]",
  dinner: "bg-[#fca5a5] text-[#7f1d1d]",
  snack: "bg-[#f87171] text-[#7f1d1d]",
};

const MealLog = ({ meals, selectedDate, onDeleteMeal, onEditMeal, onAddMeal, selectedUserId, isLoading }: MealLogProps) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState("");
  const [newLabel, setNewLabel] = useState<Meal["meal_time_label"]>("breakfast");
  const [savedToast, setSavedToast] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  const dateMeals = meals.filter((m) => m.logged_at === selectedDate);

  if (!selectedDate) {
    return <p className="text-sm text-muted-foreground mt-4">Select a date on the calendar to view meals.</p>;
  }

  const startEdit = (meal: Meal) => {
    setEditingId(meal.id);
    setEditText(meal.meal_text);
  };

  const saveEdit = () => {
    if (editingId && editText.trim()) {
      onEditMeal(editingId, editText.trim());
    }
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newText.trim() || !selectedDate) return;
    onAddMeal({
      telegram_user_id: selectedUserId,
      meal_text: newText.trim(),
      meal_time_label: newLabel,
      logged_at: selectedDate,
    });
    setNewText("");
    setNewLabel("breakfast");
    setShowAdd(false);
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 1500);
  };

  const handleDelete = (id: number) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      onDeleteMeal(id);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 250);
  };

  return (
    <div className="mt-2 px-6 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-[#1a1a1a]">
          Meals on {selectedDate}
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-[#b91c1c] px-5 py-2 rounded-full hover:bg-[#991b1b] transition-all hover-bounce"
        >
          Add Meal
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-lg shadow-md p-5 mb-4 space-y-3 slide-down">
          <input
            type="text"
            placeholder="What did you eat?"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-[14px] bg-white text-[#1a1a1a] focus:outline-none focus:border-[#b91c1c]"
          />
          <div className="flex items-center gap-2">
            <select
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value as Meal["meal_time_label"])}
              className="border border-[#E5E7EB] rounded-md px-3 py-2 text-[14px] bg-white text-[#1a1a1a] focus:outline-none focus:border-[#b91c1c]"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
            <button
              onClick={handleAdd}
              className="bg-[#b91c1c] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#991b1b] transition-colors"
            >
              {savedToast ? "Saved!" : "Save"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="text-[13px] text-[#999] hover:text-[#1a1a1a]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((idx) => (
            <div key={idx} className="skeleton h-[60px] rounded-xl" />
          ))}
        </div>
      ) : dateMeals.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nothing logged on this day</div>
      ) : (
        <div className="space-y-2">
          {dateMeals.map((meal, index) => (
            <div
              key={meal.id}
              className={`group meal-card flex items-center gap-3 bg-white rounded-xl shadow-sm px-4 py-3 slide-in-left ${
                deletingIds.has(meal.id) ? "meal-removing" : ""
              }`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span
                className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${labelColors[meal.meal_time_label]}`}
              >
                {meal.meal_time_label}
              </span>

              {editingId === meal.id ? (
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 border border-[#E5E7EB] rounded px-3 py-2 text-[14px] bg-white text-[#1a1a1a] focus:outline-none focus:border-[#b91c1c]"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-[14px] text-[#1a1a1a]">{meal.meal_text}</span>
              )}

              {editingId === meal.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={saveEdit} className="text-[#b91c1c] hover:opacity-70">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-[#999] hover:text-[#1a1a1a]">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-xs">
                  <button onClick={() => startEdit(meal)} className="text-[#6b7280] hover:text-black">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(meal.id)} className="text-[#6b7280] hover:text-[#b91c1c]">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MealLog;
