import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Meal, MealTimeLabel, User } from "@/data/mockData";
import UserList from "@/components/UserList";
import UserDetail from "@/components/UserDetail";
import { supabase } from "@/lib/supabaseClient";

const POLL_INTERVAL_MS = 10000;

type MealRow = {
  id: number;
  telegram_user_id: number;
  meal_text: string;
  meal_time_label: string | null;
  logged_at: string;
};

const normalizeMealLabel = (label: string | null): MealTimeLabel =>
  (label ?? "breakfast") as MealTimeLabel;

const normalizeMeal = (meal: MealRow): Meal => ({
  id: meal.id,
  telegram_user_id: meal.telegram_user_id,
  meal_text: meal.meal_text,
  meal_time_label: normalizeMealLabel(meal.meal_time_label),
  logged_at: new Date(meal.logged_at).toISOString().slice(0, 10),
});

const Index = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealCounts, setMealCounts] = useState<Record<number, number>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  const usersInitialLoad = useRef(true);
  const mealsInitialLoad = useRef(true);

  const fetchUsers = useCallback(async () => {
    if (usersInitialLoad.current) {
      setIsLoadingUsers(true);
    }
    const { data, error } = await supabase
      .from("healthbot_users")
      .select("telegram_user_id, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load users:", error);
      setIsLoadingUsers(false);
      return;
    }

    setUsers(data ?? []);
    setIsLoadingUsers(false);
    usersInitialLoad.current = false;
  }, []);

  const fetchMealCounts = useCallback(async () => {
    const { data, error } = await supabase
      .from("healthbot_meals")
      .select("telegram_user_id");

    if (error) {
      console.error("Failed to load meal counts:", error);
      return;
    }

    const counts: Record<number, number> = {};
    (data ?? []).forEach((row) => {
      counts[row.telegram_user_id] = (counts[row.telegram_user_id] || 0) + 1;
    });
    setMealCounts(counts);
  }, []);

  const fetchMealsForUser = useCallback(async (userId: number) => {
    if (mealsInitialLoad.current) {
      setIsLoadingMeals(true);
    }
    const { data, error } = await supabase
      .from("healthbot_meals")
      .select("id, telegram_user_id, meal_text, meal_time_label, logged_at")
      .eq("telegram_user_id", userId)
      .order("logged_at", { ascending: true });

    if (error) {
      console.error("Failed to load meals:", error);
      setIsLoadingMeals(false);
      return;
    }

    const normalized = (data ?? []).map(normalizeMeal);
    setMeals(normalized);
    setIsLoadingMeals(false);
    mealsInitialLoad.current = false;
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchMealCounts();

    const interval = setInterval(() => {
      fetchUsers();
      fetchMealCounts();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchUsers, fetchMealCounts]);

  useEffect(() => {
    if (!selectedUserId) return;
    mealsInitialLoad.current = true;
    fetchMealsForUser(selectedUserId);

    const interval = setInterval(() => {
      fetchMealsForUser(selectedUserId);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchMealsForUser, selectedUserId]);

  useEffect(() => {
    if (!users.length) {
      setSelectedUserId(null);
      return;
    }

    if (!selectedUserId || !users.some((u) => u.telegram_user_id === selectedUserId)) {
      setSelectedUserId(users[0].telegram_user_id);
    }
  }, [selectedUserId, users]);

  const selectedUser = useMemo(
    () => users.find((u) => u.telegram_user_id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const handleAddMeal = useCallback(
    async (meal: Omit<Meal, "id">) => {
      const loggedAt = new Date(`${meal.logged_at}T12:00:00.000Z`).toISOString();
      const { error } = await supabase.from("healthbot_meals").insert({
        telegram_user_id: meal.telegram_user_id,
        meal_text: meal.meal_text,
        meal_time_label: meal.meal_time_label,
        logged_at: loggedAt,
      });

      if (error) {
        console.error("Failed to add meal:", error);
        return;
      }

      if (selectedUserId) {
        fetchMealsForUser(selectedUserId);
      }
      fetchMealCounts();
    },
    [fetchMealsForUser, fetchMealCounts, selectedUserId],
  );

  const handleEditMeal = useCallback(
    async (id: number, newText: string) => {
      const meal = meals.find((item) => item.id === id);
      if (!meal) return;

      const { error } = await supabase
        .from("healthbot_meals")
        .update({
          meal_text: newText,
          meal_time_label: meal.meal_time_label,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Failed to update meal:", error);
        return;
      }

      if (selectedUserId) {
        fetchMealsForUser(selectedUserId);
      }
      fetchMealCounts();
    },
    [fetchMealsForUser, fetchMealCounts, meals, selectedUserId],
  );

  const handleDeleteMeal = useCallback(
    async (id: number) => {
      const { error } = await supabase.from("healthbot_meals").delete().eq("id", id);

      if (error) {
        console.error("Failed to delete meal:", error);
        return;
      }

      if (selectedUserId) {
        fetchMealsForUser(selectedUserId);
      }
      fetchMealCounts();
    },
    [fetchMealsForUser, fetchMealCounts, selectedUserId],
  );

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="h-[52px] w-full bg-black text-white flex items-center justify-between px-6">
        <div className="text-[15px] font-bold">CalorAI</div>
        <div className="text-xs text-white bg-[#1f1f1f] px-3 py-1 rounded-full">Live</div>
      </div>
      <div className="flex flex-1">
        {/* Left panel */}
        <div className="w-[30%] min-w-[260px] max-w-[360px]">
          <UserList
            users={users}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
            mealCounts={mealCounts}
            isLoading={isLoadingUsers}
          />
        </div>

        {/* Right panel */}
        <div className="flex-1">
          {selectedUser && (
            <UserDetail
              user={selectedUser}
              meals={meals}
              onAddMeal={handleAddMeal}
              onDeleteMeal={handleDeleteMeal}
              onEditMeal={handleEditMeal}
              isLoadingMeals={isLoadingMeals}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
