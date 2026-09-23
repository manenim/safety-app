import { ReportForm } from "@/components/report-form";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
export default function ReportPage() {
  return (
    <Suspense fallback={<Loading text="Opening report composer…" />}>
      <ReportForm />
    </Suspense>
  );
}
