"use client";

import type { ReactNode } from "react";

import { Badge } from "./badge";
import { Button } from "./button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "./dropdown";

export type MultiSelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

export function MultiSelect({
  options,
  selected = []
}: {
  options: MultiSelectOption[];
  selected?: string[];
}) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button type="button" variant="outline" className="justify-between">
          <span className="truncate">
            {selected.length ? `${selected.length} selected` : "Select options"}
          </span>
        </Button>
      </DropdownTrigger>
      <DropdownContent className="w-64">
        {options.map((option) => (
          <DropdownItem key={option.value} className="justify-between">
            <span className="flex items-center gap-2">
              {option.icon}
              {option.label}
            </span>
            {selected.includes(option.value) ? <Badge>Selected</Badge> : null}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
