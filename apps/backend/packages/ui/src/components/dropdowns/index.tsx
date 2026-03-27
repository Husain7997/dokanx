"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "../ui/dropdown";
import { Input } from "../ui/input";
import { MultiSelect, type MultiSelectOption } from "../ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type DropdownFieldProps = {
  label?: string;
  helperText?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

function DropdownField({
  label,
  helperText,
  error,
  className,
  children
}: DropdownFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? <p className="text-sm font-medium text-foreground">{label}</p> : null}
      {children}
      {error ? (
        <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
      ) : helperText ? (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}

export type DropdownOption = {
  label: string;
  value: string;
};

export function SelectDropdown({
  label,
  helperText,
  error,
  className,
  options,
  placeholder = "Select option",
  value,
  onValueChange,
  disabled
}: {
  label?: string;
  helperText?: string;
  error?: string;
  className?: string;
  options: DropdownOption[];
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownField label={label} helperText={helperText} error={error} className={className}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger disabled={disabled}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </DropdownField>
  );
}

export function MultiSelectDropdown({
  label,
  helperText,
  error,
  className,
  options,
  selected
}: {
  label?: string;
  helperText?: string;
  error?: string;
  className?: string;
  options: MultiSelectOption[];
  selected?: string[];
}) {
  return (
    <DropdownField label={label} helperText={helperText} error={error} className={className}>
      <MultiSelect options={options} selected={selected} />
    </DropdownField>
  );
}

export function SearchableDropdown({
  label,
  helperText,
  error,
  className,
  options,
  placeholder = "Search options",
  value,
  onSelect
}: {
  label?: string;
  helperText?: string;
  error?: string;
  className?: string;
  options: DropdownOption[];
  placeholder?: string;
  value?: string;
  onSelect?: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query) return options;
    const lower = query.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(lower));
  }, [options, query]);

  const activeLabel = options.find((option) => option.value === value)?.label ?? "Select option";

  return (
    <DropdownField label={label} helperText={helperText} error={error} className={className}>
      <Dropdown>
        <DropdownTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between">
            <span className="truncate">{activeLabel}</span>
            <span className="text-xs text-muted-foreground">Search</span>
          </Button>
        </DropdownTrigger>
        <DropdownContent className="w-72 space-y-2 p-2">
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="max-h-56 overflow-auto">
            {filtered.map((option) => (
              <DropdownItem
                key={option.value}
                onSelect={() => onSelect?.(option.value)}
                className={cn(
                  "justify-between",
                  option.value === value ? "bg-accent font-medium" : ""
                )}
              >
                {option.label}
              </DropdownItem>
            ))}
            {!filtered.length ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No matches found.</p>
            ) : null}
          </div>
        </DropdownContent>
      </Dropdown>
    </DropdownField>
  );
}
