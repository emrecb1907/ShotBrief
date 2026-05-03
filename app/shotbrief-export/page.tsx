import { redirect } from "next/navigation";

export default function DeprecatedShotBriefExportPage() {
  redirect("/?tab=builder&section=ai");
}
