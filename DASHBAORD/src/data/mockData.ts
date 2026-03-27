export interface User {
  telegram_user_id: number;
  created_at: string;
}

export type MealTimeLabel = "breakfast" | "lunch" | "dinner" | "snack";

export interface Meal {
  id: number;
  telegram_user_id: number;
  meal_text: string;
  meal_time_label: MealTimeLabel;
  logged_at: string;
}
