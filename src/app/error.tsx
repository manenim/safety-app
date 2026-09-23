"use client";
import { ErrorMessage } from "@/components/ui";
export default function PageError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <h1>This page could not load</h1>
      <ErrorMessage
        message="An unexpected error interrupted this page. Try loading it again."
        retry={reset}
      />
    </>
  );
}
