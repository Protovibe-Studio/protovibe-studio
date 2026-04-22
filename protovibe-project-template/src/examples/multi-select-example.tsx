import React, { useState } from 'react';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { MultiSelectDropdownItem } from '@/components/ui/multi-select-dropdown-item';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { DropdownItem } from '@/components/ui/dropdown-item';

/**
 * Example: Multi-Select Dropdown with Chips
 *
 * This demonstrates the new multi-select functionality with:
 * - Comma-separated value serialization
 * - Chip pills for selected items
 * - Clear button for quick deselection
 * - Context-based state management
 */
export function MultiSelectExample() {
  const [selectedPositions, setSelectedPositions] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('frontend');

  return (
    <div className="flex flex-col gap-8 p-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Multi-Select Dropdown</h2>
        <p className="text-sm text-foreground-tertiary mb-4">
          Select multiple positions. Values are stored as comma-separated strings.
        </p>
        <MultiSelectDropdown
          value={selectedPositions}
          onSelectionChange={setSelectedPositions}
          placeholder="Select team positions..."
          showClearButton
        >
          <MultiSelectDropdownItem
            value="frontend"
            label="Frontend Engineer"
            badgeLabel="3"
          />
          <MultiSelectDropdownItem
            value="backend"
            label="Backend Engineer"
            badgeLabel="2"
          />
          <MultiSelectDropdownItem
            value="design"
            label="Product Designer"
            badgeLabel="1"
          />
          <MultiSelectDropdownItem
            value="devops"
            label="DevOps Engineer"
            badgeLabel="1"
          />
        </MultiSelectDropdown>
        <p className="text-xs text-foreground-tertiary mt-2">
          Selected: {selectedPositions || '(none)'}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Single-Select Dropdown (with Clear)</h2>
        <p className="text-sm text-foreground-tertiary mb-4">
          SelectDropdown now supports a clear button via the showClearButton prop.
        </p>
        <SelectDropdown
          value={selectedTeam}
          onSelectionChange={setSelectedTeam}
          placeholder="Choose team..."
          showClearButton
        >
          <DropdownItem value="frontend" label="Frontend" />
          <DropdownItem value="backend" label="Backend" />
          <DropdownItem value="mobile" label="Mobile" />
        </SelectDropdown>
        <p className="text-xs text-foreground-tertiary mt-2">
          Selected: {selectedTeam || '(none)'}
        </p>
      </div>
    </div>
  );
}
