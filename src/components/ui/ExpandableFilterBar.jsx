import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react';

export default function ExpandableFilterBar({
  options = [],
  value = 'all',
  onChange,
  label = 'Filters',
  defaultId = 'all',
}) {
  const [open, setOpen] = useState(false);

  const activeOption = value !== defaultId
    ? options.find((opt) => opt.id === value) || null
    : null;

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="filter-bar-wrap">
      <div className="filter-bar-top">
        <button
          type="button"
          className={`filter-expand-btn ${open ? 'open' : ''} ${activeOption ? 'has-active' : ''}`}
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          <SlidersHorizontal size={14} />
          <span>{label}</span>
          <ChevronDown size={14} className={`filter-expand-chevron ${open ? 'rotated' : ''}`} />
        </button>

        {activeOption && (
          <div className="active-filter-capsule" role="status" aria-live="polite">
            <span className="active-filter-label">{activeOption.label}</span>
            {typeof activeOption.count === 'number' && (
              <span className="active-filter-count">{activeOption.count}</span>
            )}
            <button
              type="button"
              className="active-filter-clear"
              onClick={() => onChange(defaultId)}
              aria-label={`Remove ${activeOption.label} filter`}
              title={`Clear ${activeOption.label} filter`}
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="filter-drawer-row" role="group" aria-label={label}>
          {options.map((opt) => {
            const isSelected = value === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`filter-option-btn ${isSelected ? 'active' : ''}`}
                onClick={() => handleSelect(opt.id)}
              >
                <span>{opt.label}</span>
                {typeof opt.count === 'number' && (
                  <span className="filter-option-count">{opt.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
