import Link from "next/link";

export default function NotFound() {
  return (
    <div className="error-panel">
      <h2>Page not found</h2>
      <p>The requested page does not exist or has been moved.</p>
      <Link href="/nifty500" className="btn btn-secondary">
        Return to dashboard
      </Link>
    </div>
  );
}