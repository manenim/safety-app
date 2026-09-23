import { Suspense } from "react";
import { Assistant } from "@/components/assistant";
import { Loading } from "@/components/ui";
export default function AskPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Assistant />
    </Suspense>
  );
}
