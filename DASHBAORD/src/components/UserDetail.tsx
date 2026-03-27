import { useEffect, useState } from "react";
import { User, Meal } from "@/data/mockData";
import { format } from "date-fns";
import MealCalendar from "./MealCalendar";
import MealLog from "./MealLog";

interface UserDetailProps {
  user: User;
  meals: Meal[];
  onDeleteMeal: (id: number) => void;
  onEditMeal: (id: number, newText: string) => void;
  onAddMeal: (meal: Omit<Meal, "id">) => void;
  isLoadingMeals: boolean;
}

const UserDetail = ({ user, meals, onDeleteMeal, onEditMeal, onAddMeal, isLoadingMeals }: UserDetailProps) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const userMeals = meals.filter((m) => m.telegram_user_id === user.telegram_user_id);

  useEffect(() => {
    setSelectedDate(null);
  }, [user.telegram_user_id]);

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* User info bar */}
      <div className="flex items-center px-6 py-4 border-b border-[#EBEBEB] bg-white">
        <div className="pr-6">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[#999]">Telegram ID</span>
          <p className="text-[16px] font-bold text-[#1a1a1a]">#{user.telegram_user_id}</p>
        </div>
        <div className="px-6 border-l border-[#EBEBEB]">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[#999]">Joined</span>
          <p className="text-[16px] font-bold text-[#1a1a1a]">{format(new Date(user.created_at), "MMM d, yyyy")}</p>
        </div>
        <div className="px-6 border-l border-[#EBEBEB]">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[#999]">Total Meals</span>
          <p className="text-[16px] font-bold text-[#1a1a1a]">{userMeals.length}</p>
        </div>
      </div>

      {/* Calendar + Meal Log */}
      <div className="flex-1">
        <MealCalendar
          meals={userMeals}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
        <MealLog
          meals={userMeals}
          selectedDate={selectedDate}
          onDeleteMeal={onDeleteMeal}
          onEditMeal={onEditMeal}
          onAddMeal={onAddMeal}
          selectedUserId={user.telegram_user_id}
          isLoading={isLoadingMeals}
        />
      </div>
    </div>
  );
};

export default UserDetail;
