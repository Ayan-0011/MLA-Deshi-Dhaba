import React, { useEffect } from 'react';
import { LoaderCircle, Minus, Plus } from 'lucide-react';
import { ToggleSwitch } from '../common/ToggleSwitch';

export const Button = ({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }) => {
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover border border-primary',
    secondary: 'bg-surface text-foreground border border-border hover:bg-surface-muted',
    ghost: 'bg-transparent text-foreground hover:bg-surface-muted border border-transparent',
    danger: 'bg-danger text-white hover:opacity-90 border border-danger',
  };
  const sizes = { sm: 'min-h-10 px-3 text-xs', md: 'min-h-11 px-4 text-sm', lg: 'min-h-12 px-5 text-sm' };
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
};

const Field = ({ as: Element = 'input', label, error, icon: Icon, className = '', id, ...props }) => {
  const control = React.createElement(Element, {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
    className: `min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 ${Icon ? 'pl-10' : ''} ${className}`,
    ...props,
  });
  return (
    <div className="min-w-0 space-y-1.5">
      {label ? <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label> : null}
      <div className="relative">
        {Icon ? <Icon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /> : null}
        {control}
      </div>
      {error ? <p id={`${id}-error`} className="text-xs text-danger-foreground" role="alert">{error}</p> : null}
    </div>
  );
};
export const Input = (props) => <Field {...props} />;
export const Select = (props) => <Field as="select" {...props} />;
export const Textarea = (props) => <Field as="textarea" className="min-h-24 py-2.5" {...props} />;

export const Card = ({ className = '', children, ...props }) => <section className={`min-w-0 rounded-lg border border-border bg-surface shadow-sm ${className}`} {...props}>{children}</section>;

export const Badge = ({ tone = 'neutral', children, className = '' }) => {
  const tones = {
    neutral: 'bg-surface-muted text-muted-foreground',
    primary: 'bg-primary-soft text-primary',
    success: 'bg-success-soft text-success-foreground',
    warning: 'bg-warning-soft text-warning-foreground',
    danger: 'bg-danger-soft text-danger-foreground',
    info: 'bg-info-soft text-info-foreground',
    available: 'bg-success-soft text-success-foreground',
    occupied: 'bg-accent-soft text-warning-foreground',
    pending: 'bg-warning-soft text-warning-foreground',
  };
  return <span className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.neutral} ${className}`}>{children}</span>;
};

export const Modal = ({ open, onClose, title, children, footer, className = '' }) => {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', closeOnEscape); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl border border-border bg-surface shadow-lg sm:max-w-xl sm:rounded-xl ${className}`}>
        {title ? <header className="border-b border-border px-5 py-4"><h2 className="text-lg font-bold text-foreground">{title}</h2></header> : null}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? <footer className="border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">{footer}</footer> : null}
      </section>
    </div>
  );
};

export const Toggle = (props) => <ToggleSwitch {...props} />;
export const Tabs = ({ items, value, onChange, className = '' }) => (
  <div className={`flex max-w-full gap-1 overflow-x-auto rounded-md border border-border bg-surface-muted p-1 scrollbar-none ${className}`} role="tablist">
    {items.map((item) => <button key={item.value} type="button" role="tab" aria-selected={value === item.value} onClick={() => onChange(item.value)} className={`min-h-10 shrink-0 rounded px-3 text-sm font-semibold ${value === item.value ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{item.label}</button>)}
  </div>
);
export const SegmentedControl = Tabs;
export const Spinner = ({ className = '' }) => <LoaderCircle aria-label="Loading" className={`h-5 w-5 animate-spin text-primary ${className}`} />;
export const Skeleton = ({ className = '' }) => <div aria-hidden="true" className={`animate-pulse rounded-md bg-surface-muted ${className}`} />;
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="rounded-lg border border-dashed border-border bg-surface px-5 py-12 text-center">
    {Icon ? <Icon aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /> : null}
    <h3 className="font-semibold text-foreground">{title}</h3>
    {description ? <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);
export const PageHeader = ({ title, subtitle, action, eyebrow }) => (
  <div className="flex min-w-0 flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">{eyebrow ? <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">{eyebrow}</p> : null}<h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{title}</h1>{subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}</div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);
export const StatCard = ({ label, value, detail, icon: Icon }) => (
  <Card className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 truncate text-2xl font-bold tracking-tight text-foreground">{value}</p>{detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}</div>{Icon ? <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span> : null}</div></Card>
);
export const ConfirmDialog = ({ open, title, description, onCancel, onConfirm, confirmLabel = 'Confirm', loading = false }) => (
  <Modal open={open} onClose={onCancel} title={title} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button></div>}>
    <p className="text-sm leading-6 text-muted-foreground">{description}</p>
  </Modal>
);
export const QuantityStepper = ({ value, onDecrease, onIncrease, disabled = false, label = 'Quantity' }) => (
  <div className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface-muted p-1" aria-label={label}>
    <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={disabled} onClick={onDecrease} className="grid h-9 w-9 place-items-center rounded bg-surface text-foreground hover:bg-primary-soft disabled:opacity-50"><Minus className="h-4 w-4" /></button>
    <span aria-live="polite" className="min-w-6 text-center text-sm font-bold text-foreground">{value}</span>
    <button type="button" aria-label={`Increase ${label.toLowerCase()}`} disabled={disabled} onClick={onIncrease} className="grid h-9 w-9 place-items-center rounded bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50"><Plus className="h-4 w-4" /></button>
  </div>
);
