"use client";
import { useEffect, useId, useState } from "react";
import { MapPin, LoaderCircle } from "lucide-react";
import { api } from "./ui";

export type LocationSuggestion = { id: string; label: string };
type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: LocationSuggestion) => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

export function LocationAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  name,
  placeholder,
  disabled,
  required,
}: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [response, setResponse] = useState<{
    query: string;
    suggestions: LocationSuggestion[];
    error?: string;
  } | null>(null);
  const eligible = open && !disabled && value.trim().length >= 3;
  const current = response?.query === value ? response : null;
  const suggestions = current?.suggestions || [];
  const expanded = eligible && suggestions.length > 0;
  const selected = active >= 0 && active < suggestions.length ? active : -1;

  useEffect(() => {
    if (!eligible) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await api<{ suggestions: LocationSuggestion[] }>(
          `/api/locations/suggest?q=${encodeURIComponent(value.trim())}`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted)
          setResponse({ query: value, suggestions: result.suggestions });
      } catch {
        if (!controller.signal.aborted)
          setResponse({
            query: value,
            suggestions: [],
            error:
              "Location suggestions are unavailable. You can still enter a location.",
          });
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, eligible]);

  function choose(suggestion: LocationSuggestion) {
    onChange(suggestion.label);
    onSelect?.(suggestion);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div
      className="location-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="location-input-wrap">
        <MapPin size={17} aria-hidden="true" />
        <input
          id={id}
          name={name}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={`${id}-options`}
          aria-activedescendant={
            expanded && selected >= 0 ? `${id}-option-${selected}` : undefined
          }
          aria-describedby={
            eligible && (!current || current.error || !suggestions.length)
              ? `${id}-status`
              : undefined
          }
          autoComplete="off"
          spellCheck={false}
          maxLength={250}
          minLength={required ? 3 : undefined}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          value={value}
          onFocus={() => {
            setOpen(true);
            setActive(-1);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              setActive(-1);
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              if (suggestions.length)
                setActive((index) =>
                  event.key === "ArrowDown"
                    ? (index + 1) % suggestions.length
                    : index <= 0
                      ? suggestions.length - 1
                      : index - 1,
                );
            }
            if (event.key === "Enter" && expanded && selected >= 0) {
              event.preventDefault();
              choose(suggestions[selected]);
            }
          }}
        />
        {eligible && !current && (
          <LoaderCircle
            className="location-spinner spin"
            size={16}
            aria-hidden="true"
          />
        )}
        {eligible && (
          <div className="location-dropdown">
            {suggestions.length > 0 ? (
              <>
                <ul
                  id={`${id}-options`}
                  role="listbox"
                  aria-label={`${label} suggestions`}
                >
                  {suggestions.map((suggestion, index) => (
                    <li key={suggestion.id} role="presentation">
                      <button
                        id={`${id}-option-${index}`}
                        type="button"
                        role="option"
                        aria-label={suggestion.label}
                        aria-selected={selected === index}
                        tabIndex={-1}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(suggestion)}
                      >
                        <MapPin size={18} aria-hidden="true" />
                        <span>{suggestion.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div
                  className="location-attribution google-attribution"
                  translate="no"
                >
                  Google Maps
                </div>
              </>
            ) : (
              <p id={`${id}-status`} role="status" className="location-status">
                {!current
                  ? "Finding places…"
                  : current.error ||
                    "No matching places. Add a city or enter the location manually."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
