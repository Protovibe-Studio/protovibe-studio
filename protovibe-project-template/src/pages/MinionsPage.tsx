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
import { DateInput } from '@/components/ui/date-input';

function recruitedToIso(v: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function isoToRecruited(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

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

type MinionField = 'name' | 'division' | 'specialty' | 'status' | 'background' | 'recruited';

function MinionDetailsDialog({ minion, onClose }: { minion: Minion; onClose: () => void }) {
  const { updateMinion, showToast } = useStore();
  const [editingField, setEditingField] = useState<MinionField | null>(null);
  const [name, setName] = useState(minion.name);
  const [division, setDivision] = useState(minion.division);
  const [specialty, setSpecialty] = useState(minion.specialty);
  const [background, setBackground] = useState(minion.background);
  const [status, setStatus] = useState<Minion['status']>(minion.status);
  const [recruited, setRecruited] = useState(minion.recruited);

  const startEdit = (field: MinionField) => {
    setName(minion.name);
    setDivision(minion.division);
    setSpecialty(minion.specialty);
    setBackground(minion.background);
    setStatus(minion.status);
    setRecruited(minion.recruited);
    setEditingField(field);
  };

  const cancelEdit = () => setEditingField(null);

  const saveField = (field: MinionField) => {
    const patch: Partial<Minion> =
      field === 'name' ? { name: name.trim() } :
      field === 'division' ? { division } :
      field === 'specialty' ? { specialty } :
      field === 'status' ? { status } :
      field === 'recruited' ? { recruited } :
      { background };
    updateMinion(minion.id, patch);
    showToast({ variant: 'success', heading: 'Minion updated', secondaryText: `${minion.name}'s file has been updated.` });
    setEditingField(null);
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
              <TextHeading typography="heading-md">{minion.name}</TextHeading>
              <TextParagraph typography="secondary" className="text-sm">{minion.division}</TextParagraph>
            </div>
          </div>
          <Button variant="ghost" color="neutral" size="sm" iconOnly leftIcon="close" onClick={onClose} />
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
          <div className="flex flex-col gap-0">
            <TextParagraph typography="semibold-primary" className="text-sm">Name</TextParagraph>
            {editingField === 'name' ? (
              <div className="flex items-center gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
                <Button variant="solid" color="primary" size="md" label="Save" onClick={() => saveField('name')} disabled={!name.trim()} />
                <Button variant="ghost" color="neutral" size="md" label="Cancel" onClick={cancelEdit} />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <TextParagraph typography="regular">{minion.name}</TextParagraph>
                <Button variant="ghost" color="neutral" size="sm" iconOnly leftIcon="edit" onClick={() => startEdit('name')} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-0">
            <TextParagraph typography="semibold-primary" className="text-sm">Division</TextParagraph>
            {editingField === 'division' ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SelectDropdown value={division} onSelectionChange={setDivision} placeholder="Select division...">
                    <DropdownItem value="Field Operations" label="Field Operations" />
                    <DropdownItem value="Laser Division" label="Laser Division" />
                    <DropdownItem value="Espionage" label="Espionage" />
                    <DropdownItem value="Doomsday R&D" label="Doomsday R&D" />
                    <DropdownItem value="Lair Maintenance" label="Lair Maintenance" />
                  </SelectDropdown>
                </div>
                <Button variant="solid" color="primary" size="md" label="Save" onClick={() => saveField('division')} />
                <Button variant="ghost" color="neutral" size="md" label="Cancel" onClick={cancelEdit} />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <TextParagraph typography="regular">{minion.division}</TextParagraph>
                <Button variant="ghost" color="neutral" size="sm" iconOnly leftIcon="edit" onClick={() => startEdit('division')} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-0">
            <TextParagraph typography="semibold-primary" className="text-sm">Specialty</TextParagraph>
            {editingField === 'specialty' ? (
              <div className="flex items-center gap-2">
                <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="flex-1" />
                <Button variant="solid" color="primary" size="md" label="Save" onClick={() => saveField('specialty')} />
                <Button variant="ghost" color="neutral" size="md" label="Cancel" onClick={cancelEdit} />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <TextParagraph typography="regular">{minion.specialty}</TextParagraph>
                <Button variant="ghost" color="neutral" size="sm" iconOnly leftIcon="edit" onClick={() => startEdit('specialty')} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-0">
            <TextParagraph typography="semibold-primary" className="text-sm">Status</TextParagraph>
            {editingField === 'status' ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SelectDropdown value={status} onSelectionChange={(v) => setStatus(v as Minion['status'])} placeholder="Select status...">
                    <DropdownItem value="Active" label="Active" />
                    <DropdownItem value="On Mission" label="On Mission" />
                    <DropdownItem value="Recovering" label="Recovering" />
                  </SelectDropdown>
                </div>
                <Button variant="solid" color="primary" size="md" label="Save" onClick={() => saveField('status')} />
                <Button variant="ghost" color="neutral" size="md" label="Cancel" onClick={cancelEdit} />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <Badge label={minion.status} color={minion.status === 'Active' ? 'success' : minion.status === 'On Mission' ? 'primary' : 'warning'} />
                <Button variant="ghost" color="neutral" size="md" iconOnly leftIcon="edit" onClick={() => startEdit('status')} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-0">
            <TextParagraph typography="semibold-primary" className="text-sm">Background</TextParagraph>
            {editingField === 'background' ? (
              <div className="flex items-start gap-2">
                <Textarea value={background} onChange={(e) => setBackground(e.target.value)} rows={4} className="flex-1" />
                <div className="flex gap-2 flex-row">
                  <Button variant="solid" color="primary" size="md" label="Save" onClick={() => saveField('background')} />
                  <Button variant="ghost" color="neutral" size="md" label="Cancel" onClick={cancelEdit} />
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <TextParagraph typography="regular" className="whitespace-pre-wrap">{minion.background || '—'}</TextParagraph>
                <Button variant="ghost" color="neutral" size="sm" iconOnly leftIcon="edit" onClick={() => startEdit('background')} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-0">
            <TextParagraph typography="semibold-primary" className="text-sm">Recruited</TextParagraph>
            {editingField === 'recruited' ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <DateInput
                    value={recruitedToIso(recruited)}
                    onValueChange={(iso) => setRecruited(iso ? isoToRecruited(iso) : '')}
                  />
                </div>
                <Button variant="solid" color="primary" size="md" label="Save" onClick={() => saveField('recruited')} disabled={!recruited} />
                <Button variant="ghost" color="neutral" size="md" label="Cancel" onClick={cancelEdit} />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <TextParagraph typography="regular">{minion.recruited}</TextParagraph>
                <Button variant="ghost" color="neutral" size="sm" iconOnly leftIcon="edit" onClick={() => startEdit('recruited')} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-default bg-background-subtle">
          <Button variant="solid" color="primary" label="Close" onClick={onClose} />
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
        <div data-pv-block="lbcm1t" className="flex flex-col gap-2 border-border-default p-7">
          {/* pv-editable-zone-start:uz9d2r */}
          {/* pv-block-start:sk3c4d */}
          <div data-pv-block="sk3c4d" className="flex items-center justify-between">
          {/* pv-editable-zone-start:sk5e6f */}

          {/* pv-block-start:sk7g8h */}
          <div data-pv-block="sk7g8h" className="flex flex-col gap-0">
          {/* pv-editable-zone-start:sk9i0j */}
          {/* pv-block-start:skaj1k */}
          <TextHeading data-pv-block="skaj1k" typography="heading-lg">Minions</TextHeading>
          {/* pv-block-end:skaj1k */}
          {/* pv-block-start:skbl2m */}
          <TextParagraph data-pv-block="skbl2m" typography="secondary">
            Manage your loyal henchmen across all divisions.
          </TextParagraph>
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
          <div data-pv-block="skht8u" className="flex flex-col gap-4">
            {/* pv-editable-zone-start:tb1q2w */}
              {/* pv-block-start:0zvrdl */}
              <div data-pv-block="0zvrdl" className="flex items-center justify-between gap-4 w-full px-7">
                {/* pv-editable-zone-start:zn1abc */}
                  {/* pv-block-start:xnbg1g */}
                  <Input data-pv-block="xnbg1g" prefixIcon="search" placeholder="Search minion" className="" />
                  {/* pv-block-end:xnbg1g */}
                {/* pv-editable-zone-end:zn1abc */}
              </div>
              {/* pv-block-end:0zvrdl */}

              {/* pv-block-start:07vjpp */}
              <div data-pv-block="07vjpp" className="flex flex-col gap-2 pl-6 pr-7">
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
                    {/* pv-block-start:rw1m2n */}
                    {state.minions.map(minion => (
                      <TableRowContent data-pv-block="rw1m2n" key={minion.id} onClick={() => setSelectedMinionId(minion.id)} className="transition-colors cursor-pointer">
                        {/* pv-editable-zone-start:zr3o4p */}
                          {/* pv-block-start:cl5q6r */}
                          <TableCellContent data-pv-block="cl5q6r">
                            {/* pv-editable-zone-start:zc7s8t */}
                              {/* pv-block-start:tp9u0v */}
                              <TextParagraph data-pv-block="tp9u0v" typography="regular">{minion.name}</TextParagraph>
                              {/* pv-block-end:tp9u0v */}
                            {/* pv-editable-zone-end:zc7s8t */}
                          </TableCellContent>
                          {/* pv-block-end:cl5q6r */}
                          {/* pv-block-start:cl1w2x */}
                          <TableCellContent data-pv-block="cl1w2x">
                            {/* pv-editable-zone-start:zc3y4z */}
                              {/* pv-block-start:tp5a6b */}
                              <TextParagraph data-pv-block="tp5a6b" typography="regular">{minion.division}</TextParagraph>
                              {/* pv-block-end:tp5a6b */}
                            {/* pv-editable-zone-end:zc3y4z */}
                          </TableCellContent>
                          {/* pv-block-end:cl1w2x */}
                          {/* pv-block-start:cl7c8d */}
                          <TableCellContent data-pv-block="cl7c8d">
                            {/* pv-editable-zone-start:zc9e0f */}
                              {/* pv-block-start:tp1g2h */}
                              <TextParagraph data-pv-block="tp1g2h" typography="regular">{minion.assignments.toString()}</TextParagraph>
                              {/* pv-block-end:tp1g2h */}
                            {/* pv-editable-zone-end:zc9e0f */}
                          </TableCellContent>
                          {/* pv-block-end:cl7c8d */}
                          {/* pv-block-start:cl3i4j */}
                          <TableCellContent data-pv-block="cl3i4j">
                            {/* pv-editable-zone-start:zc5k6l */}
                              {/* pv-block-start:tp7m8n */}
                              <TextParagraph data-pv-block="tp7m8n" typography="regular">{minion.recruited}</TextParagraph>
                              {/* pv-block-end:tp7m8n */}
                            {/* pv-editable-zone-end:zc5k6l */}
                          </TableCellContent>
                          {/* pv-block-end:cl3i4j */}
                          {/* pv-block-start:cl9o0p */}
                          <TableCellContent data-pv-block="cl9o0p">
                            {/* pv-editable-zone-start:zc1q2r */}
                              {/* pv-block-start:bd3s4t */}
                              <Badge data-pv-block="bd3s4t" label={minion.status} color={minion.status === 'Active' ? 'success' : minion.status === 'On Mission' ? 'primary' : 'warning'} />
                              {/* pv-block-end:bd3s4t */}
                            {/* pv-editable-zone-end:zc1q2r */}
                          </TableCellContent>
                          {/* pv-block-end:cl9o0p */}
                          {/* pv-block-start:cl5u6v */}
                          <TableCellContent data-pv-block="cl5u6v" className="text-right">
                            {/* pv-editable-zone-start:zc7w8x */}
                              {/* pv-block-start:bn9y0z */}
                              <Button data-pv-block="bn9y0z" iconOnly variant="ghost" color="neutral" size="sm" leftIcon="MoreHorizontal" />
                              {/* pv-block-end:bn9y0z */}
                            {/* pv-editable-zone-end:zc7w8x */}
                          </TableCellContent>
                          {/* pv-block-end:cl5u6v */}
                        {/* pv-editable-zone-end:zr3o4p */}
                      </TableRowContent>
                    ))}
                    {/* pv-block-end:rw1m2n */}
                  </TableBody>
                </Table>
                {/* pv-block-end:tb5t6y */}
                {/* pv-editable-zone-end:dg0paq */}
              </div>
              {/* pv-block-end:07vjpp */}

              {/* pv-block-start:tb3e4r */}
              <div data-pv-block="tb3e4r" className="flex items-center gap-4 w-full px-5 justify-end">
                {/* pv-editable-zone-start:zn1abc */}
                  {/* pv-block-start:bk3ghi */}
                  <div data-pv-block="bk3ghi" className="flex items-center gap-3 shrink-0">
                    {/* pv-editable-zone-start:zn4jkl */}
                      {/* pv-block-start:bk5mno */}
                      <TextParagraph data-pv-block="bk5mno" typography="secondary" className="text-sm">
                        1 - {state.minions.length} of {state.minions.length} minions
                      </TextParagraph>
                      {/* pv-block-end:bk5mno */}
                      {/* pv-block-start:bk6pqr */}
                      <div data-pv-block="bk6pqr" className="inline-flex items-center">
                        {/* pv-editable-zone-start:zn7stu */}
                          {/* pv-block-start:bk8vwx */}
                          <Button data-pv-block="bk8vwx" variant="outline" color="neutral" size="md" iconOnly leftIcon="chevron-left" className="rounded-r-none" />
                          {/* pv-block-end:bk8vwx */}
                          {/* pv-block-start:bk9yz0 */}
                          <Button data-pv-block="bk9yz0" variant="outline" color="neutral" size="md" iconOnly leftIcon="chevron-right" className="rounded-l-none -ml-px" />
                          {/* pv-block-end:bk9yz0 */}
                        {/* pv-editable-zone-end:zn7stu */}
                      </div>
                      {/* pv-block-end:bk6pqr */}
                    {/* pv-editable-zone-end:zn4jkl */}
                  </div>
                  {/* pv-block-end:bk3ghi */}
                {/* pv-editable-zone-end:zn1abc */}
              </div>
              {/* pv-block-end:tb3e4r */}
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
