import { Suspense } from "react";
import { CommandCenter } from "@/components/command-center";
import { Loading } from "@/components/ui";
export default function CommandPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CommandCenter />
    </Suspense>
  );
}
