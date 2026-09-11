import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateWorkspace } from "@/components/create/CreateWorkspace";

export const metadata: Metadata = {
  title: "إنشاء فيديو جديد | Create video — MOVO",
};

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateWorkspace />
    </Suspense>
  );
}
