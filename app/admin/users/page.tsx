import type { Metadata } from "next";
import { getUsers } from "@/lib/admin/services/customers";
import { UsersView } from "@/components/admin/users/UsersView";

export const metadata: Metadata = {
  title: "المستخدمون | Users — MOVO Admin",
};

export default async function AdminUsersPage() {
  const users = await getUsers();
  return <UsersView users={users} />;
}
