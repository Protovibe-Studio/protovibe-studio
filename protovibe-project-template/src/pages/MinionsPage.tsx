import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore, Minion } from '@/store';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TextHeading } from '@/components/ui/text-heading';
import { TextParagraph } from '@/components/ui/text-paragraph';
import { DialogContext } from '@/components/ui/dialog-trigger';
import { DialogOverlay } from '@/components/ui/dialog-overlay';
import { DialogWindow } from '@/components/ui/dialog-window';
import { DrawerOverlay } from '@/components/ui/drawer-overlay';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import { Table } from '@/components/ui/table';
import { TableRowHeading } from '@/components/ui/table-row-heading';
import { TableBody } from '@/components/ui/table-body';
import { TableRowContent } from '@/components/ui/table-row-content';
import { TableCellHeading } from '@/components/ui/table-cell-heading';
import { TableCellContent } from '@/components/ui/table-cell-content';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { DropdownItem } from '@/components/ui/dropdown-item';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';

function NewMinionDrawer({ onClose }: { onClose: () => void }) {
  const { addMinion, showToast } = useStore();
  const [name, setName] = useState('');
  const [background, setBackground] = useState('');
  const [division, setDivision] = useState('field-ops');
  const [specialty, setSpecialty] = useState('Henchwork');

  const canSubmit = name.trim().length > 0 && division.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    addMinion({ name: name.trim(), background: background.trim(), division, specialty });
    showToast({ variant: 'success', heading: 'Minion recruited', secondaryText: `${name.trim()} has joined EvilCorp.` });
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-background-default">
      {/* pv-editable-zone-start:nsd-header */}
        {/* pv-block-start:nsdh1 */}
        <div data-pv-block="nsdh1" className="flex items-center justify-between px-6 py-4 border-b border-border-default shrink-0 bg-background-elevated">
          <TextHeading typography="heading-md">New Minion</TextHeading>
          <Button variant="ghost" color="neutral" size="sm" iconOnly leftIcon="close" onClick={onClose} />
        </div>
        {/* pv-block-end:nsdh1 */}
      {/* pv-editable-zone-end:nsd-header */}

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-background-subtle">
        {/* pv-editable-zone-start:nsd-body */}
          {/* pv-block-start:nsdb1 */}
          <TextParagraph data-pv-block="nsdb1" typography="secondary" className="text-sm">
            Register a new minion and assign them to a division.
          </TextParagraph>
          {/* pv-block-end:nsdb1 */}

          {/* pv-block-start:nsdb2 */}
          <div data-pv-block="nsdb2" className="flex flex-col gap-2">
            {/* pv-editable-zone-start:nz2a1b */}
              {/* pv-block-start:nz2c3d */}
              <TextParagraph data-pv-block="nz2c3d" typography="semibold-primary" className="text-sm">Minion name</TextParagraph>
              {/* pv-block-end:nz2c3d */}
              {/* pv-block-start:nz2e4f */}
              <Input data-pv-block="nz2e4f" placeholder="e.g. Bob #428" value={name} onChange={(e) => setName(e.target.value)} />
              {/* pv-block-end:nz2e4f */}
            {/* pv-editable-zone-end:nz2a1b */}
          </div>
          {/* pv-block-end:nsdb2 */}

          {/* pv-block-start:nsdb3 */}
          <div data-pv-block="nsdb3" className="flex flex-col gap-2">
            {/* pv-editable-zone-start:nz3g5h */}
              {/* pv-block-start:nz3i6j */}
              <TextParagraph data-pv-block="nz3i6j" typography="semibold-primary" className="text-sm">Minion background</TextParagraph>
              {/* pv-block-end:nz3i6j */}
              {/* pv-block-start:nz3k7l */}
              <Textarea
                data-pv-block="nz3k7l"
                placeholder="Where did this minion come from? Notable traits, prior misdeeds, allergies to garlic, etc."
                rows={4}
                value={background}
                onChange={(e) => setBackground(e.target.value)}
              />
              {/* pv-block-end:nz3k7l */}
            {/* pv-editable-zone-end:nz3g5h */}
          </div>
          {/* pv-block-end:nsdb3 */}

          {/* pv-block-start:nsdb4 */}
          <div data-pv-block="nsdb4" className="flex flex-col gap-2">
            {/* pv-editable-zone-start:nz4m8n */}
              {/* pv-block-start:nz4o9p */}
              <TextParagraph data-pv-block="nz4o9p" typography="semibold-primary" className="text-sm">Division</TextParagraph>
              {/* pv-block-end:nz4o9p */}
              {/* pv-block-start:nz4q1r */}
              <SelectDropdown data-pv-block="nz4q1r" value={division} onSelectionChange={setDivision} placeholder="Select division...">
                {/* pv-editable-zone-start:nz4s2t */}
                  {/* pv-block-start:nz4u3v */}
                  <DropdownItem data-pv-block="nz4u3v" value="field-ops" label="Field Operations" />
                  {/* pv-block-end:nz4u3v */}
                  {/* pv-block-start:nz4w4x */}
                  <DropdownItem data-pv-block="nz4w4x" value="laser-div" label="Laser Division" />
                  {/* pv-block-end:nz4w4x */}
                  {/* pv-block-start:nz4y5z */}
                  <DropdownItem data-pv-block="nz4y5z" value="espionage" label="Espionage" />
                  {/* pv-block-end:nz4y5z */}
                  {/* pv-block-start:nz4d1g */}
                  <DropdownItem data-pv-block="nz4d1g" value="doomsday-rd" label="Doomsday R&D" />
                  {/* pv-block-end:nz4d1g */}
                  {/* pv-block-start:nz4l2m */}
                  <DropdownItem data-pv-block="nz4l2m" value="lair-maint" label="Lair Maintenance" />
                  {/* pv-block-end:nz4l2m */}
                {/* pv-editable-zone-end:nz4s2t */}
              </SelectDropdown>
              {/* pv-block-end:nz4q1r */}
            {/* pv-editable-zone-end:nz4m8n */}
          </div>
          {/* pv-block-end:nsdb4 */}

          {/* pv-block-start:nsdb6 */}
          <div data-pv-block="nsdb6" className="flex flex-col gap-2">
            {/* pv-editable-zone-start:nz6a7b */}
              {/* pv-block-start:nz6c8d */}
              <TextParagraph data-pv-block="nz6c8d" typography="semibold-primary" className="text-sm">Specialty</TextParagraph>
              {/* pv-block-end:nz6c8d */}
              {/* pv-block-start:nz6e9f */}
              <Input data-pv-block="nz6e9f" placeholder="e.g. Stealth, Mad Science, Beam Calibration" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              {/* pv-block-end:nz6e9f */}
            {/* pv-editable-zone-end:nz6a7b */}
          </div>
          {/* pv-block-end:nsdb6 */}
        {/* pv-editable-zone-end:nsd-body */}
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-border-default shrink-0 bg-background-elevated">
        {/* pv-editable-zone-start:nsd-footer */}
          {/* pv-block-start:nsdf1 */}
          <Button data-pv-block="nsdf1" variant="ghost" color="neutral" label="Cancel" onClick={onClose} />
          {/* pv-block-end:nsdf1 */}
          {/* pv-block-start:nsdf2 */}
          <Button data-pv-block="nsdf2" variant="solid" color="primary" label="Add Minion" disabled={!canSubmit} onClick={handleSubmit} />
          {/* pv-block-end:nsdf2 */}
        {/* pv-editable-zone-end:nsd-footer */}
      </div>
    </div>
  );
}

function MinionDetailsDialog({ minion, onClose }: { minion: Minion; onClose: () => void }) {
  const { updateMinion, showToast } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(minion.name);
  const [division, setDivision] = useState(minion.division);
  const [specialty, setSpecialty] = useState(minion.specialty);
  const [background, setBackground] = useState(minion.background);
  const [status, setStatus] = useState<Minion['status']>(minion.status);

  const startEdit = () => {
    setName(minion.name);
    setDivision(minion.division);
    setSpecialty(minion.specialty);
    setBackground(minion.background);
    setStatus(minion.status);
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const save = () => {
    updateMinion(minion.id, { name: name.trim(), division, specialty, background, status });
    showToast({ variant: 'success', heading: 'Minion updated', secondaryText: `${name.trim()}'s file has been updated.` });
    setIsEditing(false);
  };

  return (
    <DialogWindow size="md" showCloseButton={false}>
      <div className="flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-background-tertiary flex items-center justify-center shrink-0">
              <Icon iconSymbol="mdi:account-hard-hat" size="md" className="text-foreground-secondary" />
            </div>
            <div className="flex flex-col">
              <TextHeading typography="heading-md">{isEditing ? 'Edit Minion' : minion.name}</TextHeading>
              {!isEditing && (
                <TextParagraph typography="secondary" className="text-sm">{minion.division}</TextParagraph>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isEditing && (
              <Button variant="outline" color="neutral" size="sm" leftIcon="edit" label="Edit" onClick={startEdit} />
            )}
            <Button variant="ghost" color="neutral" size="sm" iconOnly leftIcon="close" onClick={onClose} />
          </div>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <TextParagraph typography="semibold-primary" className="text-sm">Name</TextParagraph>
            {isEditing ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            ) : (
              <TextParagraph typography="regular">{minion.name}</TextParagraph>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <TextParagraph typography="semibold-primary" className="text-sm">Division</TextParagraph>
            {isEditing ? (
              <SelectDropdown value={division} onSelectionChange={setDivision} placeholder="Select division...">
                <DropdownItem value="Field Operations" label="Field Operations" />
                <DropdownItem value="Laser Division" label="Laser Division" />
                <DropdownItem value="Espionage" label="Espionage" />
                <DropdownItem value="Doomsday R&D" label="Doomsday R&D" />
                <DropdownItem value="Lair Maintenance" label="Lair Maintenance" />
              </SelectDropdown>
            ) : (
              <TextParagraph typography="regular">{minion.division}</TextParagraph>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <TextParagraph typography="semibold-primary" className="text-sm">Specialty</TextParagraph>
            {isEditing ? (
              <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
            ) : (
              <TextParagraph typography="regular">{minion.specialty}</TextParagraph>
            )}
          </div>

          <div className="flex flex-col gap-1.5 items-start">
            <TextParagraph typography="semibold-primary" className="text-sm">Status</TextParagraph>
            {isEditing ? (
              <SelectDropdown value={status} onSelectionChange={(v) => setStatus(v as Minion['status'])} placeholder="Select status...">
                <DropdownItem value="Active" label="Active" />
                <DropdownItem value="On Mission" label="On Mission" />
                <DropdownItem value="Recovering" label="Recovering" />
              </SelectDropdown>
            ) : (
              <Badge className="" label={minion.status} color={minion.status === 'Active' ? 'success' : minion.status === 'On Mission' ? 'primary' : 'warning'} />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <TextParagraph typography="semibold-primary" className="text-sm">Background</TextParagraph>
            {isEditing ? (
              <Textarea value={background} onChange={(e) => setBackground(e.target.value)} rows={4} />
            ) : (
              <TextParagraph typography="regular" className="whitespace-pre-wrap">{minion.background || '—'}</TextParagraph>
            )}
          </div>

          {!isEditing && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-default">
              <div className="flex flex-col gap-1">
                <TextParagraph typography="secondary" className="text-xs uppercase tracking-wide">Assignments</TextParagraph>
                <TextParagraph typography="regular">{minion.assignments}</TextParagraph>
              </div>
              <div className="flex flex-col gap-1">
                <TextParagraph typography="secondary" className="text-xs uppercase tracking-wide">Recruited</TextParagraph>
                <TextParagraph typography="regular">{minion.recruited}</TextParagraph>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-default bg-background-subtle">
          {isEditing ? (
            <>
              <Button variant="ghost" color="neutral" label="Cancel" onClick={cancelEdit} />
              <Button variant="solid" color="primary" label="Save changes" onClick={save} disabled={!name.trim()} />
            </>
          ) : (
            <Button variant="solid" color="primary" label="Close" onClick={onClose} />
          )}
        </div>
      </div>
    </DialogWindow>
  );
}

export function MinionsPage() {
  const { state } = useStore();
  const [drawerFlow, setDrawerFlow] = useState<'add-minion' | null>(null);
  const [selectedMinionId, setSelectedMinionId] = useState<string | null>(null);

  const selectedMinion = state.minions.find(m => m.id === selectedMinionId) || null;

  return (
    <div className="flex flex-col">
      {/* pv-editable-zone-start:sk1a2b */}

        {/* pv-block-start:lbcm1t */}
        <div data-pv-block="lbcm1t" className="flex flex-col gap-2 border-b border-border-default p-5">
          {/* pv-editable-zone-start:uz9d2r */}
          {/* pv-block-start:sk3c4d */}
          <div data-pv-block="sk3c4d" className="flex items-center justify-between">
          {/* pv-editable-zone-start:sk5e6f */}

          {/* pv-block-start:sk7g8h */}
          <div data-pv-block="sk7g8h" className="flex flex-col gap-1">
          {/* pv-editable-zone-start:sk9i0j */}
          {/* pv-block-start:skaj1k */}
          <TextHeading data-pv-block="skaj1k" typography="heading-md">Minions</TextHeading>
          {/* pv-block-end:skaj1k */}
          {/* pv-block-start:skbl2m */}
          <TextParagraph data-pv-block="skbl2m" typography="secondary">Recruit and manage your loyal henchmen across all divisions.</TextParagraph>
          {/* pv-block-end:skbl2m */}
          {/* pv-editable-zone-end:sk9i0j */}
          </div>
          {/* pv-block-end:sk7g8h */}

          {/* pv-block-start:skcn3o */}
          <Button data-pv-block="skcn3o" label="Add Minion" leftIcon="mdi:plus" onClick={() => setDrawerFlow('add-minion')} />
          {/* pv-block-end:skcn3o */}

          {/* pv-editable-zone-end:sk5e6f */}
          </div>
          {/* pv-block-end:sk3c4d */}
          {/* pv-editable-zone-end:uz9d2r */}
        </div>
        {/* pv-block-end:lbcm1t */}



        {/* pv-block-start:skht8u */}
        {state.minions.length === 0 ? (
          <EmptyState iconSize="xl" className="min-h-92"
            data-pv-block="skht8u"
            icon="mdi:account-hard-hat"
            bigHeading="Recruit your first minion"
            secondaryText="No minions recruited yet. Start by recruiting your first henchman."
          />
        ) : (
          <div data-pv-block="skht8u" className="flex flex-col gap-4 pt-3">
            {/* pv-editable-zone-start:tb1q2w */}
              {/* pv-block-start:tb3e4r */}
              <div data-pv-block="tb3e4r" className="flex items-center justify-between gap-4 w-full px-5">
                <Input prefixIcon="search" placeholder="Search minion" className="max-w-2xl" />
                <div className="flex items-center gap-3 shrink-0">
                  <TextParagraph typography="secondary" className="text-sm">
                    1 - {state.minions.length} of {state.minions.length} minions
                  </TextParagraph>
                  <div className="inline-flex items-center">
                    <Button variant="outline" color="neutral" size="md" iconOnly leftIcon="chevron-left" className="rounded-r-none" />
                    <Button variant="outline" color="neutral" size="md" iconOnly leftIcon="chevron-right" className="rounded-l-none -ml-px" />
                  </div>
                </div>
              </div>
              {/* pv-block-end:tb3e4r */}

              {/* pv-block-start:07vjpp */}
              <div data-pv-block="07vjpp" className="flex flex-col gap-2 px-5">
                {/* pv-editable-zone-start:dg0paq */}
                {/* pv-block-start:tb5t6y */}
                <Table data-pv-block="tb5t6y" className="">
                  <TableRowHeading className="bg-background-default border-border-default">
                    {/* pv-editable-zone-start:th7u8i */}
                      {/* pv-block-start:th9o0p */}
                      <TableCellHeading data-pv-block="th9o0p" label="Minion Name" />
                      {/* pv-block-end:th9o0p */}
                      {/* pv-block-start:th1a2s */}
                      <TableCellHeading data-pv-block="th1a2s" label="Division" />
                      {/* pv-block-end:th1a2s */}
                      {/* pv-block-start:th3d4f */}
                      <TableCellHeading data-pv-block="th3d4f" label="Assignments" />
                      {/* pv-block-end:th3d4f */}
                      {/* pv-block-start:th5g6h */}
                      <TableCellHeading data-pv-block="th5g6h" label="Recruited" />
                      {/* pv-block-end:th5g6h */}
                      {/* pv-block-start:th7j8k */}
                      <TableCellHeading data-pv-block="th7j8k" label="Status" />
                      {/* pv-block-end:th7j8k */}
                      {/* pv-block-start:th9l0z */}
                      <TableCellHeading data-pv-block="th9l0z" label="" className="w-12" />
                      {/* pv-block-end:th9l0z */}
                    {/* pv-editable-zone-end:th7u8i */}
                  </TableRowHeading>
                  <TableBody>
                    {state.minions.map(minion => (
                      <TableRowContent key={minion.id} onClick={() => setSelectedMinionId(minion.id)} className="even:bg-background-default hover:!bg-background-tertiary transition-colors cursor-pointer">
                        <TableCellContent>
                          <TextParagraph typography="regular">{minion.name}</TextParagraph>
                        </TableCellContent>
                        <TableCellContent>
                          <TextParagraph typography="regular">{minion.division}</TextParagraph>
                        </TableCellContent>
                        <TableCellContent>
                          <TextParagraph typography="regular">{minion.assignments.toString()}</TextParagraph>
                        </TableCellContent>
                        <TableCellContent>
                          <TextParagraph typography="regular">{minion.recruited}</TextParagraph>
                        </TableCellContent>
                        <TableCellContent>
                          <Badge label={minion.status} color={minion.status === 'Active' ? 'success' : minion.status === 'On Mission' ? 'primary' : 'warning'} />
                        </TableCellContent>
                        <TableCellContent className="text-right">
                          <Button iconOnly variant="ghost" color="neutral" size="sm" leftIcon="MoreHorizontal" />
                        </TableCellContent>
                      </TableRowContent>
                    ))}
                  </TableBody>
                </Table>
                {/* pv-block-end:tb5t6y */}
                {/* pv-editable-zone-end:dg0paq */}
              </div>
              {/* pv-block-end:07vjpp */}
            {/* pv-editable-zone-end:tb1q2w */}
          </div>
        )}
        {/* pv-block-end:skht8u */}

      {/* pv-editable-zone-end:sk1a2b */}


      {drawerFlow === 'add-minion' && createPortal(
        <DialogContext.Provider value={{ isOpen: true, close: () => setDrawerFlow(null) }}>
          <DrawerOverlay>
            <DrawerPanel >
              <NewMinionDrawer onClose={() => setDrawerFlow(null)} />
            </DrawerPanel>
          </DrawerOverlay>
        </DialogContext.Provider>,
        document.body
      )}

      {selectedMinion && createPortal(
        <DialogContext.Provider value={{ isOpen: true, close: () => setSelectedMinionId(null) }}>
          <DialogOverlay>
            <MinionDetailsDialog minion={selectedMinion} onClose={() => setSelectedMinionId(null)} />
          </DialogOverlay>
        </DialogContext.Provider>,
        document.body
      )}
    </div>
  );
}
