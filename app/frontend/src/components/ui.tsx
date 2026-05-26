import type { MouseEvent, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import type { Notice } from '../appTypes';
import { cx } from '../lib/appUtils';

export function Button({
  children,
  variant = 'primary',
  disabled,
  onClick,
  type = 'button',
  ariaLabel,
  iconOnly,
  size = 'md'
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'blue' | 'accent' | 'danger';
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit';
  ariaLabel?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition disabled:cursor-not-allowed disabled:opacity-55',
        iconOnly ? 'size-10 px-0 text-sm' : size === 'sm' ? 'min-h-9 px-3 text-sm' : 'min-h-10 px-4 text-sm',
        variant === 'primary' && 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800',
        variant === 'secondary' && 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50',
        variant === 'blue' && 'border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700',
        variant === 'accent' && 'border-amber-500 bg-amber-500 text-zinc-950 hover:border-amber-400 hover:bg-amber-400',
        variant === 'danger' && 'border-red-200 bg-white text-red-700 hover:bg-red-50'
      )}
    >
      {children}
    </button>
  );
}

export function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  if (!notice) return null;
  const Icon = notice.type === 'success' ? CheckCircle2 : notice.type === 'error' ? AlertCircle : Loader2;
  return (
    <div
      className={cx(
        'mb-5 flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm',
        notice.type === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        notice.type === 'error' && 'border-red-200 bg-red-50 text-red-900',
        notice.type === 'info' && 'border-blue-200 bg-blue-50 text-blue-900'
      )}
    >
      <div className="flex gap-3">
        <Icon className={cx('mt-0.5 size-4 shrink-0', notice.type === 'info' && 'animate-spin')} />
        <p>{notice.message}</p>
      </div>
      <button type="button" onClick={onDismiss} className="rounded-md p-1 opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  );
}

export function LoadingPanel() {
  return (
    <section className="grid min-h-80 place-items-center rounded-md border border-zinc-200 bg-white">
      <div className="flex items-center gap-3 text-sm font-medium text-zinc-600">
        <Loader2 className="size-5 animate-spin text-emerald-700" />
        Loading workspace
      </div>
    </section>
  );
}

export function FieldShell({ label, hint, icon, children }: { label: string; hint?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <label className="block rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        {icon ? (
          <span className="grid size-7 shrink-0 place-items-center rounded-md border border-blue-100 bg-blue-50 text-blue-700">
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
      </span>
      <span className="mt-2 block">{children}</span>
      {hint ? <span className="mt-2 block text-xs leading-5 text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-zinc-950">{title}</h3>
      {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
    </div>
  );
}
