import type { Metadata } from "next";
import ActionPlanView from "@/components/ActionPlanView";

export const metadata: Metadata = { title: "Action plan · SkinPassport" };

export default function PlanPage() {
  return <ActionPlanView />;
}
