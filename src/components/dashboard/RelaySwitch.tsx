import React from 'react';

interface RelaySwitchProps {
  checked: boolean;
  disabled?: boolean;
  pending?: boolean;
  label: string;
  onToggle: () => void;
}

export const RelaySwitch: React.FC<RelaySwitchProps> = ({ checked, disabled, pending, label, onToggle }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={pending || undefined}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relay-switch ${pending ? 'is-pending' : ''}`}
    >
      <span className="relay-switch__thumb" />
    </button>
  );
};
