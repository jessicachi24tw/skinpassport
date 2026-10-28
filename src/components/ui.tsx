import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-card p-5 shadow-[0_1px_0_rgba(31,42,68,0.04)] ${className}`}>{children}</section>;
}

export function StepTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">{n}</span>
      <div>
        <h2 className="font-display text-xl leading-tight">{title}</h2>
        {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "coral";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = {
    primary: "bg-ink text-paper hover:bg-ink/90",
    coral: "bg-coral text-white hover:bg-coral/90",
    ghost: "border border-line bg-white text-ink hover:bg-paper",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

/** Score bar where higher = healthier (used for skin scores). */
export function ScoreBar({ label, value }: { label: string; value: number }) {
  const tone = value >= 70 ? "bg-sea" : value >= 45 ? "bg-sun" : "bg-coral";
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-line">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.max(4, value)}%` }} />
      </div>
    </div>
  );
}

export function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} out of 5`} className="tracking-tight text-sun">
      {"★".repeat(n)}
      <span className="text-line">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p className="mt-3 rounded-lg bg-coral-soft px-3 py-2 text-sm text-coral">{children}</p> : null;
}

/** Renders text where **double asterisks** mark bold. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\*\*[^*]+\*\*)/g)
        .filter(Boolean)
        .map((t, i) =>
          t.startsWith("**") ? (
            <b key={i} className="font-semibold text-ink">
              {t.slice(2, -2)}
            </b>
          ) : (
            <span key={i}>{t}</span>
          ),
        )}
    </>
  );
}
