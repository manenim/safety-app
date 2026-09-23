import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>Page not found</h1>
      <p>The page may have moved, or this signal is no longer available.</p>
      <Link className="button" href="/">
        Return to signal feed
      </Link>
    </div>
  );
}
