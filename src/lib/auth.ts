import { supabase } from "@/lib/supabase";

export const allowedUsers = [
  "admin@crmapp.com",
  "user1@crmapp.com",
  "user2@crmapp.com",
] as const;

export function isAllowedUser(email?: string | null) {
  return allowedUsers.includes((email ?? "").toLowerCase() as typeof allowedUsers[number]);
}

export async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be logged in to save data.");
  }

  return user.id;
}
