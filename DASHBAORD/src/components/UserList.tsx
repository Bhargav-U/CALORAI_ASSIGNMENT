import { User } from "@/data/mockData";
import { format } from "date-fns";

interface UserListProps {
  users: User[];
  selectedUserId: number | null;
  onSelectUser: (id: number) => void;
  mealCounts: Record<number, number>;
  isLoading: boolean;
}

const avatarPalette = ["#ef4444", "#dc2626", "#b91c1c", "#7f1d1d"];

const getAvatarColor = (id: number) => {
  const index = Math.abs(id) % avatarPalette.length;
  return avatarPalette[index];
};

const UserList = ({ users, selectedUserId, onSelectUser, mealCounts, isLoading }: UserListProps) => {
  return (
    <div className="h-full flex flex-col bg-white border-r border-[#EBEBEB]">
      <div className="px-4 py-4 border-b border-[#EBEBEB]">
        <h2 className="text-[11px] uppercase tracking-[0.1em] text-[#999] font-semibold">Users</h2>
        <p className="text-xs text-[#999] mt-1">{users.length} total</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="skeleton h-[68px] rounded-md" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 text-[#999]">
            <div className="text-sm font-medium">No users yet</div>
          </div>
        ) : (
          users.map((user, index) => {
            const initials = String(user.telegram_user_id).slice(-2);
            return (
              <button
                key={user.telegram_user_id}
                onClick={() => onSelectUser(user.telegram_user_id)}
                className={`user-card w-full text-left px-4 py-[14px] border-b border-[#F0F0F0] transition-colors border-l-4 fade-slide-in ${
                  selectedUserId === user.telegram_user_id
                    ? "bg-[#fef2f2] border-l-[#b91c1c] selected"
                    : "border-l-transparent hover:bg-[#FAFAFA]"
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full text-white text-xs font-semibold flex items-center justify-center"
                    style={{ backgroundColor: getAvatarColor(user.telegram_user_id) }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div className="font-semibold text-[14px] text-[#1a1a1a]">#{user.telegram_user_id}</div>
                    <div className="text-[12px] text-[#999] mt-1">
                      Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                    </div>
                    <div className="text-[12px] text-[#999]">
                      {mealCounts[user.telegram_user_id] || 0} meals logged
                    </div>
                  </div>
                </div>
                <span className="accent-bar" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserList;
