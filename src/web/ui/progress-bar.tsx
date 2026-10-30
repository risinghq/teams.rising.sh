function ProgressBar({ value }: { value: number }) {
  return (
    <span
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="inline-block h-1.5 w-14 overflow-hidden rounded-full bg-muted"
    >
      <span
        className="block h-full bg-primary"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </span>
  );
}

export { ProgressBar };
