"use client";

export default function Error({ error, reset }) {
  return (
    <div className="error-panel" role="alert">
      <h2>Something went wrong</h2>
      <p>{error?.message || "An unexpected error occurred."}</p>
      <button type="button" className="btn btn-secondary" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}