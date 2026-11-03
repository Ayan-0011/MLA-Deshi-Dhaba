import React from 'react';
import { LoaderCircle } from 'lucide-react';

export const ToggleSwitch = ({ checked, onChange, disabled = false, loading = false, label, id }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled || loading}
    onClick={onChange}
    className={`dhaba-toggle ${checked ? 'is-on' : ''} ${disabled || loading ? 'is-disabled' : ''}`}
  >
    <span className="dhaba-toggle-thumb">
      {loading ? <LoaderCircle aria-hidden="true" className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
    </span>
  </button>
);
