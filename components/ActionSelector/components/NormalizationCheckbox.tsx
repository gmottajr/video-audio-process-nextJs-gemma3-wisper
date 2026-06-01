"use client";

interface NormalizationCheckboxProps {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

export function NormalizationCheckbox({ checked, disabled, onChange }: NormalizationCheckboxProps) {
  return (
    <div
      className="mt-4 rounded-xl p-4"
      style={{ background: "oklch(19% 0.02 280)", border: "1px solid oklch(38% 0.02 280 / 0.35)" }}
    >
      <label className="flex items-start cursor-pointer gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 w-4 h-4 shrink-0 rounded"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-jazz text-sm text-aura-text">Normalize Audio Levels</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-mono"
              style={{ background: "oklch(66% 0.17 195 / 0.18)", color: "oklch(74% 0.13 195)" }}
            >
              +10% time
            </span>
          </div>
          <p className="text-xs text-aura-muted leading-relaxed">
            Standardize volume to a consistent level using EBU R128 loudnorm.
            Recommended for quiet or inconsistent audio.
          </p>
        </div>
      </label>
    </div>
  );
}
