import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/store';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { InfoBoxBanner } from '@/components/ui/info-box-banner';
import { Card } from '@/components/ui/card';
import { TextHeading } from '@/components/ui/text-heading';
import { TextParagraph } from '@/components/ui/text-paragraph';
import { Tabs } from '@/components/ui/tabs';
import { TabItem } from '@/components/ui/tab-item';
import { VerticalTabs } from '@/components/ui/vertical-tabs';
import { VerticalTabItem } from '@/components/ui/vertical-tab-item';
import { VerticalTabsExpandableSection } from '@/components/ui/vertical-tabs-expandable-section';
import { DialogContext, DialogTrigger, DialogHandle } from '@/components/ui/dialog-trigger';
import { DialogOverlay } from '@/components/ui/dialog-overlay';
import { DialogWindow } from '@/components/ui/dialog-window';
import { Table } from '@/components/ui/table';
import { TableRowHeading } from '@/components/ui/table-row-heading';
import { TableBody } from '@/components/ui/table-body';
import { TableRowContent } from '@/components/ui/table-row-content';
import { TableCellHeading } from '@/components/ui/table-cell-heading';
import { TableCellContent } from '@/components/ui/table-cell-content';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { PopoverTrigger } from '@/components/ui/popover-trigger';
import { DropdownList } from '@/components/ui/dropdown-list';
import { DropdownItem } from '@/components/ui/dropdown-item';
import { DropdownSeparator } from '@/components/ui/dropdown-separator';
import { TooltipProvider } from '@/components/ui/tooltip-provider';
import { Rectangle } from '@/components/ui/sketchpad-rectangle'
import { SelectDropdownSearch } from '@/components/ui/select-dropdown-search'
import { Container } from '@/components/ui/container'
import { Image } from '@/components/ui/image'
import { Textarea } from '@/components/ui/textarea'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { Stepper } from '@/components/ui/stepper'
import { StepCircle } from '@/components/ui/step-circle'
import { StepperConnector } from '@/components/ui/stepper-connector'
import { EmptyState } from '@/components/ui/empty-state'

// --- MOCK DATA ---

const mockEmployees = [
  { id: '1', name: 'Alice Johnson', role: 'Senior Product Designer', department: 'Design', status: 'Active', email: 'alice.j@acmecorp.com', phone: '+1 (555) 123-4567', location: 'New York, NY', startDate: '2021-03-15' },
  { id: '2', name: 'Bob Smith', role: 'Frontend Engineer', department: 'Engineering', status: 'Active', email: 'bob.s@acmecorp.com', phone: '+1 (555) 987-6543', location: 'Remote (US)', startDate: '2022-08-01' },
  { id: '3', name: 'Carol Davis', role: 'Marketing Manager', department: 'Marketing', status: 'On Leave', email: 'carol.d@acmecorp.com', phone: '+1 (555) 555-0192', location: 'London, UK', startDate: '2019-11-10' },
  { id: '4', name: 'David Wilson', role: 'HR Business Partner', department: 'Human Resources', status: 'Active', email: 'david.w@acmecorp.com', phone: '+1 (555) 444-3333', location: 'San Francisco, CA', startDate: '2023-01-20' },
  { id: '5', name: 'Eve Martinez', role: 'Data Scientist', department: 'Data', status: 'Terminated', email: 'eve.m@acmecorp.com', phone: '+1 (555) 222-1111', location: 'Austin, TX', startDate: '2020-05-05' },
];

const mockPositions = [
  { id: 'p1', title: 'Senior React Developer', department: 'Engineering', location: 'Remote', applicants: 24, status: 'Open' },
  { id: 'p2', title: 'Product Marketing Manager', department: 'Marketing', location: 'New York, NY', applicants: 12, status: 'Interviewing' },
  { id: 'p3', title: 'UX Researcher', department: 'Design', location: 'London, UK', applicants: 8, status: 'Open' },
];

const mockDepartments = [
  { id: 'd1', name: 'Engineering', manager: 'Sarah Connor', headcount: 45, budget: 'On Track' },
  { id: 'd2', name: 'Design', manager: 'John Doe', headcount: 12, budget: 'At Risk' },
  { id: 'd3', name: 'Marketing', manager: 'Jane Smith', headcount: 28, budget: 'On Track' },
  { id: 'd4', name: 'Human Resources', manager: 'Michael Scott', headcount: 8, budget: 'Under Budget' },
];

// --- SUBPAGES ---

function DashboardPage() {
  return (
    <div className="flex flex-col animate-in fade-in duration-300 gap-6 bg-background-default p-8">
      {/* pv-editable-zone-start:d8z9a1 */}
        {/* pv-block-start:da1sh2 */}
        <TextHeading className="" data-pv-block="da1sh2" typography="heading-lg">Dashboard</TextHeading>
        {/* pv-block-end:da1sh2 */}
        {/* pv-block-start:i3b4c5 */}
        <InfoBoxBanner color="info" className=""
          data-pv-block="i3b4c5"
          heading="Welcome back, HR Admin!"
          secondaryText="You have 4 pending time-off requests and 2 upcoming performance reviews to manage."
          
          icon="Sparkles"
          primaryActionLabel="Review Requests"
          actionsLayout="right">
          
        </InfoBoxBanner>
        {/* pv-block-end:i3b4c5 */}
        
        {/* pv-block-start:g0fqyb */}
        <div className="flex flex-col min-h-4" data-pv-block="g0fqyb">
          {/* pv-editable-zone-start:inside-g0fqyb */}
            {/* pv-block-start:q958wn */}
            <div data-pv-block="q958wn" className="flex flex-col gap-1">
              {/* pv-editable-zone-start:f7otuc */}
              {/* pv-block-start:lw979w */}
              <TextHeading className="py-0.5" data-pv-block="lw979w" typography="heading-md">
                Test heading
              </TextHeading>
              {/* pv-block-end:lw979w */}
              
              {/* pv-block-start:krvk39 */}
              <TextParagraph typography="small" className="asd" data-pv-block="krvk39">
                It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their <u>default</u> model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have <a href="https://" target="_blank" rel="noopener noreferrer" className="text-foreground-primary hover:opacity-80 transition-opacity">evolved</a> over the years, sometimes by accident, sometimes on purpose (injected humour and the like). <br />
              </TextParagraph>
              {/* pv-block-end:krvk39 */}
              {/* pv-block-start:uc6iij */}
              <Stepper className="pt-4" data-pv-block="uc6iij" fullWidth={false}>
                {/* pv-editable-zone-start:73b88w */}
                  {/* pv-block-start:fh2zxu */}
                  <StepCircle data-pv-block="fh2zxu" state="done" number={1} label="Details" />
                  {/* pv-block-end:fh2zxu */}
                  {/* pv-block-start:w5mflp */}
                  <StepperConnector data-pv-block="w5mflp" state="done" />
                  {/* pv-block-end:w5mflp */}
                  {/* pv-block-start:x4vrjn */}
                  <StepCircle data-pv-block="x4vrjn" state="current" number={2} label="Review" />
                  {/* pv-block-end:x4vrjn */}
                  {/* pv-block-start:ev7f7f */}
                  <StepperConnector data-pv-block="ev7f7f" state="upcoming" />
                  {/* pv-block-end:ev7f7f */}
                  {/* pv-block-start:3vozpq */}
                  <StepCircle data-pv-block="3vozpq" state="upcoming" number={3} label="Confirm" />
                  {/* pv-block-end:3vozpq */}
                {/* pv-editable-zone-end:73b88w */}
              </Stepper>
              {/* pv-block-end:uc6iij */}
              {/* pv-editable-zone-end:f7otuc */}
            </div>
            {/* pv-block-end:q958wn */}
          {/* pv-editable-zone-end:inside-g0fqyb */}
        </div>
        {/* pv-block-end:g0fqyb */}

        {/* pv-block-start:ov5gmp */}
        <SelectDropdown data-pv-block="ov5gmp" placeholder="Select an option">
          {/* pv-editable-zone-start:4sb9vj */}
            {/* pv-block-start:6rhtns */}
            <SelectDropdownSearch data-pv-block="6rhtns" placeholder="Search..." />
            {/* pv-block-end:6rhtns */}
            {/* pv-block-start:ezzsb2 */}
            <DropdownItem data-pv-block="ezzsb2" value="opt1" label="Option One" selected={false} />
            {/* pv-block-end:ezzsb2 */}
            {/* pv-block-start:cethbv */}
            <DropdownItem data-pv-block="cethbv" value="opt2" label="Option Two" selected={false} />
            {/* pv-block-end:cethbv */}
            {/* pv-block-start:h8xhhk */}
            <DropdownItem data-pv-block="h8xhhk" value="opt3" label="Option Three" selected={false} />
            {/* pv-block-end:h8xhhk */}
          {/* pv-editable-zone-end:4sb9vj */}
        </SelectDropdown>
        {/* pv-block-end:ov5gmp */}

        {/* pv-block-start:g6h7j8 */}
        <div data-pv-block="g6h7j8" className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {/* pv-editable-zone-start:w2x3y4 */}
            {/* pv-block-start:z5a6b7 */}
            <Card data-pv-block="z5a6b7" className="">
              {/* pv-editable-zone-start:c8d9e1 */}
                {/* pv-block-start:f2g3h4 */}
                <div data-pv-block="f2g3h4" className="flex items-center gap-3 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:i5j6k7 */}
                    {/* pv-block-start:l8m9n1 */}
                    <Icon data-pv-block="l8m9n1" iconSymbol="Users" size="sm" />
                    {/* pv-block-end:l8m9n1 */}
                    {/* pv-block-start:o2p3q4 */}
                    <TextParagraph typography="secondary" data-pv-block="o2p3q4" className="">Total Headcount</TextParagraph>
                    {/* pv-block-end:o2p3q4 */}
                  {/* pv-editable-zone-end:i5j6k7 */}
                </div>
                {/* pv-block-end:f2g3h4 */}
                {/* pv-block-start:r5s6t7 */}
                <TextHeading data-pv-block="r5s6t7" typography="heading-xxl" className="mb-2">
                  25
                </TextHeading>
                {/* pv-block-end:r5s6t7 */}
                {/* pv-block-start:u8v9w1 */}
                <Badge data-pv-block="u8v9w1" label="+12% vs last year" color="success" prefixIcon="trending-up" />
                {/* pv-block-end:u8v9w1 */}
              {/* pv-editable-zone-end:c8d9e1 */}
            </Card>
            {/* pv-block-end:z5a6b7 */}

            {/* pv-block-start:x2y3z4 */}
            <Card data-pv-block="x2y3z4" className="">
              {/* pv-editable-zone-start:a5b6c7 */}
                {/* pv-block-start:d8e9f1 */}
                <div data-pv-block="d8e9f1" className="flex gap-3 mb-2 text-foreground-secondary items-center">
                  {/* pv-editable-zone-start:g2h3i4 */}
                    {/* pv-block-start:j5k6l7 */}
                    <Icon data-pv-block="j5k6l7" iconSymbol="Briefcase" size="sm" />
                    {/* pv-block-end:j5k6l7 */}
                    {/* pv-block-start:m8n9o1 */}
                    <TextParagraph typography="secondary" data-pv-block="m8n9o1" className="">Open Roles</TextParagraph>
                    {/* pv-block-end:m8n9o1 */}
                  {/* pv-editable-zone-end:g2h3i4 */}
                </div>
                {/* pv-block-end:d8e9f1 */}
                {/* pv-block-start:p2q3r4 */}
                <TextHeading data-pv-block="p2q3r4" typography="heading-xxl" className="mb-2">18</TextHeading>
                {/* pv-block-end:p2q3r4 */}
                {/* pv-block-start:s5t6u7 */}
                <Badge data-pv-block="s5t6u7" label="4 critical to fill" color="warning" prefixIcon="alert-circle" />
                {/* pv-block-end:s5t6u7 */}
              {/* pv-editable-zone-end:a5b6c7 */}
            </Card>
            {/* pv-block-end:x2y3z4 */}

            {/* pv-block-start:v8w9x1 */}
            <Card data-pv-block="v8w9x1" className="">
              {/* pv-editable-zone-start:y2z3a4 */}
                {/* pv-block-start:b5c6d7 */}
                <div data-pv-block="b5c6d7" className="flex items-center gap-3 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:e8f9g1 */}
                    {/* pv-block-start:h2i3j4 */}
                    <Icon data-pv-block="h2i3j4" iconSymbol="CalendarHeart" size="sm" />
                    {/* pv-block-end:h2i3j4 */}
                    {/* pv-block-start:k5l6m7 */}
                    <TextParagraph typography="secondary" data-pv-block="k5l6m7" className="">On Leave</TextParagraph>
                    {/* pv-block-end:k5l6m7 */}
                  {/* pv-editable-zone-end:e8f9g1 */}
                </div>
                {/* pv-block-end:b5c6d7 */}
                {/* pv-block-start:n8o9p1 */}
                <TextHeading data-pv-block="n8o9p1" typography="heading-xxl" className="mb-2">6</TextHeading>
                {/* pv-block-end:n8o9p1 */}
                {/* pv-block-start:q2r3s4 */}
                <Badge data-pv-block="q2r3s4" label="2 returning this week" color="info" prefixIcon="clock" />
                {/* pv-block-end:q2r3s4 */}
              {/* pv-editable-zone-end:y2z3a4 */}
            </Card>
            {/* pv-block-end:v8w9x1 */}
          {/* pv-editable-zone-end:w2x3y4 */}
        </div>
        {/* pv-block-end:g6h7j8 */}

        {/* pv-block-start:e6x5fm */}
        <Textarea data-pv-block="e6x5fm" placeholder="Enter text..." />
        {/* pv-block-end:e6x5fm */}
      {/* pv-editable-zone-end:d8z9a1 */}
    </div>
  );
}

function EmployeesPage() {
  const [selectedEmp, setSelectedEmp] = useState<typeof mockEmployees[0] | null>(null);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 p-8">
      {/* pv-editable-zone-start:e1z2x3 */}

        {/* pv-block-start:rsafhi */}
        <div data-pv-block="rsafhi" className="flex gap-2 flex-row items-start justify-between">
          {/* pv-editable-zone-start:mhn3m1 */}
          {/* pv-block-start:em1pl2 */}
          <TextHeading className="" data-pv-block="em1pl2" typography="heading-lg">Employees</TextHeading>
          {/* pv-block-end:em1pl2 */}
          {/* pv-block-start:3qtyrv */}
          <div data-pv-block="3qtyrv" className="flex gap-2">
          <Button label="Export CSV" variant="solid" color="neutral" leftIcon="download" />
          <Button data-tooltip-dir="top" data-tooltip-text="Yo man, click this button!" label="Add Employee" variant="solid" color="primary" leftIcon="plus" />
          </div>
          {/* pv-block-end:3qtyrv */}
          {/* pv-editable-zone-end:mhn3m1 */}
        </div>
        {/* pv-block-end:rsafhi */}


        {/* pv-block-start:h4e5k6 */}
        <div data-pv-block="h4e5k6" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* pv-editable-zone-start:t5u6v7 */}
            {/* pv-block-start:w8x9y1 */}
            <Input data-pv-block="w8x9y1" placeholder="Search employees by name or role..." prefixIcon="search" className="bg-background-default" />
            {/* pv-block-end:w8x9y1 */}
          {/* pv-editable-zone-end:t5u6v7 */}
        </div>
        {/* pv-block-end:h4e5k6 */}

        {/* pv-block-start:t7m8n9 */}
        <Table data-pv-block="t7m8n9">
          <TableRowHeading>
            {/* pv-editable-zone-start:h1e2a3 */}
              {/* pv-block-start:d4e5f6 */}
              <TableCellHeading data-pv-block="d4e5f6" label="Employee" />
              {/* pv-block-end:d4e5f6 */}
              {/* pv-block-start:g7h8i9 */}
              <TableCellHeading data-pv-block="g7h8i9" label="Role" />
              {/* pv-block-end:g7h8i9 */}
              {/* pv-block-start:j1k2l3 */}
              <TableCellHeading data-pv-block="j1k2l3" label="Department" />
              {/* pv-block-end:j1k2l3 */}
              {/* pv-block-start:m4n5o6 */}
              <TableCellHeading data-pv-block="m4n5o6" label="Status" />
              {/* pv-block-end:m4n5o6 */}
              {/* pv-block-start:p7q8r9 */}
              <TableCellHeading data-pv-block="p7q8r9" label="" />
              {/* pv-block-end:p7q8r9 */}
            {/* pv-editable-zone-end:h1e2a3 */}
          </TableRowHeading>
          <TableBody>
            {mockEmployees.map(emp => (
              <TableRowContent key={emp.id} className="cursor-pointer group" onClick={() => setSelectedEmp(emp)}>
                <TableCellContent>
                  <div className="flex items-center gap-3">
                    <Avatar initials={emp.name} size="sm" bgColor="default" />
                    <div className="flex flex-col">
                      <TextHeading typography="heading-sm" className="group-hover:text-background-primary transition-colors">{emp.name}</TextHeading>
                      <TextParagraph typography="small">{emp.email}</TextParagraph>
                    </div>
                  </div>
                </TableCellContent>
                <TableCellContent>
                  <TextParagraph typography="regular">{emp.role}</TextParagraph>
                </TableCellContent>
                <TableCellContent>
                  <TextParagraph typography="regular">{emp.department}</TextParagraph>
                </TableCellContent>
                <TableCellContent>
                  <Badge
                    label={emp.status}
                    color={emp.status === 'Active' ? 'success' : emp.status === 'On Leave' ? 'warning' : 'neutral'}
                  />
                </TableCellContent>
                <TableCellContent>
                  <Icon iconSymbol="chevron-right" size="sm" className="text-foreground-tertiary group-hover:text-background-primary" />
                </TableCellContent>
              </TableRowContent>
            ))}
          </TableBody>
        </Table>
        {/* pv-block-end:t7m8n9 */}
        {/* pv-block-start:8yf60q */}
        <PaginationControls data-pv-block="8yf60q" showSummary={true} showPerPage={true} page="middle" perPageLabel="Per page: 30" summaryText="1 - 30 of 4359 employees" size="md" />
        {/* pv-block-end:8yf60q */}

      {/* pv-editable-zone-end:e1z2x3 */}

      {selectedEmp && createPortal(
        <DialogContext.Provider value={{ isOpen: true, close: () => setSelectedEmp(null) }}>
          <DialogOverlay >
            <DialogWindow size="lg" className="bg-background-default">
              <EmployeeDetailsDialog emp={selectedEmp} />
            </DialogWindow>
          </DialogOverlay>
        </DialogContext.Provider>,
        document.body
      )}
    </div>
  );
}

function PositionsPage() {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 p-8">
      {/* pv-editable-zone-start:p1z2q3 */}
        
        {/* pv-block-start:h4p5w6 */}
        <div data-pv-block="h4p5w6" className="flex justify-between items-center mb-2">
          {/* pv-editable-zone-start:e1f2g3 */}
            {/* pv-block-start:h3i4j5 */}
            <TextHeading data-pv-block="h3i4j5" typography="heading-lg">Open Positions</TextHeading>
            {/* pv-block-end:h3i4j5 */}
            {/* pv-block-start:k6l7m8 */}
            <Button data-pv-block="k6l7m8" label="Create Requisition" leftIcon="plus"  color="primary" />
            {/* pv-block-end:k6l7m8 */}
          {/* pv-editable-zone-end:e1f2g3 */}
        </div>
        {/* pv-block-end:h4p5w6 */}
        
        {mockPositions.map(pos => (
          <Card key={pos.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full hover:border-background-primary cursor-pointer group bg-background-default">
            {/* pv-editable-zone-start:f2a3b4 */}
              {/* pv-block-start:c5d6e7 */}
              <div data-pv-block="c5d6e7" className="flex items-center gap-4">
                {/* pv-editable-zone-start:w9x1y2 */}
                  {/* pv-block-start:z3a4b5 */}
                  <div data-pv-block="z3a4b5" className="bg-background-secondary flex items-center justify-center text-foreground-secondary rounded w-10 h-10">
                    <Icon iconSymbol="Briefcase" size="md" />
                  </div>
                  {/* pv-block-end:z3a4b5 */}
                  {/* pv-block-start:c6d7e8 */}
                  <div data-pv-block="c6d7e8">
                    <TextHeading typography="heading-sm" className="group-hover:text-background-primary transition-colors">{pos.title}</TextHeading>
                    <div className="flex items-center mt-1 gap-1">
                      <TextParagraph typography="small">{pos.department}</TextParagraph>
                      <span className="text-foreground-tertiary text-xs">•</span>
                      <TextParagraph typography="small">{pos.location}</TextParagraph>
                    </div>
                  </div>
                  {/* pv-block-end:c6d7e8 */}
                {/* pv-editable-zone-end:w9x1y2 */}
              </div>
              {/* pv-block-end:c5d6e7 */}

              {/* pv-block-start:h8j9k1 */}
              <div data-pv-block="h8j9k1" className="flex items-center gap-8 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                {/* pv-editable-zone-start:f9g1h2 */}
                  {/* pv-block-start:l6m7n8 */}
                  <Badge data-pv-block="l6m7n8" label={pos.status} color={pos.status === 'Open' ? 'success' : 'info'} />
                  {/* pv-block-end:l6m7n8 */}
                  {/* pv-block-start:o9p1q2 */}
                  <Button data-pv-block="o9p1q2" iconOnly variant="ghost" leftIcon="chevron-right" />
                  {/* pv-block-end:o9p1q2 */}
                {/* pv-editable-zone-end:f9g1h2 */}
              </div>
              {/* pv-block-end:h8j9k1 */}
            {/* pv-editable-zone-end:f2a3b4 */}
          </Card>
        ))}
        
      {/* pv-editable-zone-end:p1z2q3 */}
    </div>
  );
}

function DepartmentsPage() {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 p-8">
      {/* pv-editable-zone-start:d1z2r3 */}
      
        {/* pv-block-start:h4d5v6 */}
        <div data-pv-block="h4d5v6" className="flex justify-between items-center mb-2">
          {/* pv-editable-zone-start:n9o1p2 */}
            {/* pv-block-start:q3r4s5 */}
            <TextHeading data-pv-block="q3r4s5" typography="heading-lg">Departments</TextHeading>
            {/* pv-block-end:q3r4s5 */}
            {/* pv-block-start:t6u7v8 */}
            <Button data-pv-block="t6u7v8" label="Add Department" leftIcon="plus"  color="primary" />
            {/* pv-block-end:t6u7v8 */}
          {/* pv-editable-zone-end:n9o1p2 */}
        </div>
        {/* pv-block-end:h4d5v6 */}
        
        {mockDepartments.map(dept => (
          <Card key={dept.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full hover:border-background-primary cursor-pointer group bg-background-default">
            {/* pv-editable-zone-start:m2n3p4 */}
              {/* pv-block-start:q5r6s7 */}
              <div data-pv-block="q5r6s7" className="flex items-center gap-4">
                {/* pv-editable-zone-start:r3s4t5 */}
                  {/* pv-block-start:u6v7w8 */}
                  <Avatar data-pv-block="u6v7w8" icon="material-symbols:graph-2" size="md" bgColor="info" />
                  {/* pv-block-end:u6v7w8 */}
                  {/* pv-block-start:x9y1z2 */}
                  <div data-pv-block="x9y1z2">
                    <TextHeading typography="heading-sm" className="group-hover:text-background-primary transition-colors">{dept.name}</TextHeading>
                    <TextParagraph typography="small" className="">Manager: {dept.manager}</TextParagraph>
                  </div>
                  {/* pv-block-end:x9y1z2 */}
                {/* pv-editable-zone-end:r3s4t5 */}
              </div>
              {/* pv-block-end:q5r6s7 */}

              {/* pv-block-start:t8u9v1 */}
              <div data-pv-block="t8u9v1" className="flex items-center gap-8 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                {/* pv-editable-zone-start:a3b4c5 */}
                  {/* pv-block-start:d6e7f8 */}
                  <div data-pv-block="d6e7f8" className="flex flex-col items-start sm:items-end">
                    <TextHeading typography="heading-sm">{dept.headcount}</TextHeading>
                    <TextParagraph typography="small">Employees</TextParagraph>
                  </div>
                  {/* pv-block-end:d6e7f8 */}
                  {/* pv-block-start:j3k4l5 */}
                  <Button data-pv-block="j3k4l5" iconOnly variant="ghost" leftIcon="chevron-right" />
                  {/* pv-block-end:j3k4l5 */}
                {/* pv-editable-zone-end:a3b4c5 */}
              </div>
              {/* pv-block-end:t8u9v1 */}
            {/* pv-editable-zone-end:m2n3p4 */}
          </Card>
        ))}
        
      {/* pv-editable-zone-end:d1z2r3 */}
    </div>
  );
}

// --- DIALOG DETAILS COMPONENT ---

function EmployeeDetailsDialog({ emp }: { emp: any }) {
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex flex-col min-w-[500px]">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-5">
          <Avatar initials={emp.name} size="2xl" bgColor="primary" />
          <div className="flex flex-col gap-1">
            <TextHeading typography="heading-lg">{emp.name}</TextHeading>
            <TextParagraph typography="secondary">{emp.role}</TextParagraph>
            <Badge 
              label={emp.status} 
              color={emp.status === 'Active' ? 'success' : emp.status === 'On Leave' ? 'warning' : 'neutral'} 
              className="w-fit mt-1" 
            />
          </div>
        </div>
        <Button
          label={isEditing ? "Save Changes" : "Edit Profile"}
          variant={isEditing ? "solid" : "outline"}
          color="primary"
          leftIcon={isEditing ? "save" : "edit"}
          onClick={(e) => {
            e.stopPropagation(); // prevent dialog from closing
            setIsEditing(!isEditing);
          }}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabItem value="general" label="General Info" />
        <TabItem value="contact" label="Contact Details" />
        <TabItem value="job" label="Job & Pay" />
      </Tabs>

      {/* Tab Content */}
      <div className="flex flex-col gap-6">
        {activeTab === 'general' && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in">
            <DetailField label="Full Name" value={emp.name} isEditing={isEditing} />
            <DetailField label="Preferred Name" value={emp.name.split(' ')[0]} isEditing={isEditing} />
            <DetailField 
              label="Status" 
              value={emp.status} 
              isEditing={isEditing} 
              type="select" 
              options={['Active', 'On Leave', 'Terminated']} 
            />
            <DetailField label="Location" value={emp.location} isEditing={isEditing} />
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in">
            <DetailField label="Email Address" value={emp.email} isEditing={isEditing} type="email" />
            <DetailField label="Phone Number" value={emp.phone} isEditing={isEditing} type="tel" />
          </div>
        )}

        {activeTab === 'job' && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in">
            <DetailField label="Job Title" value={emp.role} isEditing={isEditing} />
            <DetailField 
              label="Department" 
              value={emp.department} 
              isEditing={isEditing} 
              type="select" 
              options={['Engineering', 'Design', 'Marketing', 'Human Resources', 'Data']} 
            />
            <DetailField label="Start Date" value={emp.startDate} isEditing={isEditing} type="date" />
            <DetailField label="Manager" value="System Administrator" isEditing={isEditing} />
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable field component for the dialog
function DetailField({ 
  label, 
  value, 
  isEditing, 
  type = 'text', 
  options = [] 
}: { 
  label: string, 
  value: string, 
  isEditing: boolean, 
  type?: 'text' | 'select' | 'email' | 'tel' | 'date',
  options?: string[] 
}) {
  return (
    <div className="flex flex-col gap-2">
      <TextParagraph typography="all-caps">{label}</TextParagraph>
      
      {isEditing ? (
        type === 'select' ? (
          <SelectDropdown value={value} placeholder={`Select ${label.toLowerCase()}`}>
            {options.map((opt) => (
              <DropdownItem key={opt} value={opt} label={opt} />
            ))}
          </SelectDropdown>
        ) : (
          <Input defaultValue={value} type={type} className="bg-background-default" />
        )
      ) : (
        <div className="h-10 flex items-center">
          <TextParagraph typography="regular" className="font-medium">{value}</TextParagraph>
        </div>
      )}
    </div>
  );
}

function SkillsPage() {
  const importDialogRef = useRef<DialogHandle>(null);
  return (
    <div className="flex flex-col">
      {/* pv-editable-zone-start:sk1a2b */}

        {/* pv-block-start:lbcm1t */}
        <div data-pv-block="lbcm1t" className="flex flex-col gap-2 border-b border-border-default pt-5 pb-0 px-5">
          {/* pv-editable-zone-start:uz9d2r */}
          {/* pv-block-start:sk3c4d */}
          <div data-pv-block="sk3c4d" className="flex items-center justify-between">
          {/* pv-editable-zone-start:sk5e6f */}
          
          {/* pv-block-start:sk7g8h */}
          <div data-pv-block="sk7g8h" className="flex flex-col gap-1">
          {/* pv-editable-zone-start:sk9i0j */}
          {/* pv-block-start:skaj1k */}
          <TextHeading data-pv-block="skaj1k" typography="heading-md">Skills</TextHeading>
          {/* pv-block-end:skaj1k */}
          {/* pv-block-start:skbl2m */}
          <TextParagraph data-pv-block="skbl2m" typography="secondary">Add skills and create areas of expertise consisting of skills.</TextParagraph>
          {/* pv-block-end:skbl2m */}
          {/* pv-editable-zone-end:sk9i0j */}
          </div>
          {/* pv-block-end:sk7g8h */}
          
          {/* pv-block-start:skcn3o */}
          <PopoverTrigger data-pv-block="skcn3o" placement="bottom" align="right">
            <Button label="Add skills" leftIcon="mdi:plus" />
            <DropdownList width="xl" className="">
              <DropdownItem prefixIcon="mdi:plus" label="Add new skill manually" secondaryText="Manually enter description and proficiency level" />
              <DropdownItem prefixIcon="mdi:upload" label="Import skills from a file" secondaryText="Upload your company document and let AI read the skills" onClick={() => importDialogRef.current?.open()} />
              <DropdownItem onClick={() => {}}>
                <Badge className="w-4 justify-center" label="AI" color="primary" />
                <div className="flex flex-col flex-1">
                  <span className="text-foreground-default font-medium">Generate suggested skills in a sheet</span>
                  <span className="text-xs text-foreground-tertiary">Don't have company skills yet? Generate a starting template file, refine it with your team, then import.</span>
                </div>
              </DropdownItem>
            </DropdownList>
          </PopoverTrigger>
          {/* pv-block-end:skcn3o */}
          
          {/* pv-editable-zone-end:sk5e6f */}
          </div>
          {/* pv-block-end:sk3c4d */}
          {/* pv-block-start:skdp4q */}
          <Tabs className="" data-pv-block="skdp4q" value="skills">
          {/* pv-editable-zone-start:skeq5r */}
          {/* pv-block-start:skfr6s */}
          <TabItem data-pv-block="skfr6s" label="Skills" value="skills" />
          {/* pv-block-end:skfr6s */}
          {/* pv-block-start:skgs7t */}
          <TabItem data-pv-block="skgs7t" label="Areas of expertise" value="areas" />
          {/* pv-block-end:skgs7t */}
          {/* pv-editable-zone-end:skeq5r */}
          </Tabs>
          {/* pv-block-end:skdp4q */}
          {/* pv-editable-zone-end:uz9d2r */}
        </div>
        {/* pv-block-end:lbcm1t */}



        {/* pv-block-start:skht8u */}
        <EmptyState iconSize="2xl" className="min-h-64"
          data-pv-block="skht8u"
          icon="mdi:text-box-outline"
          bigHeading="Create your first skill"
          secondaryText="You haven't added any skills yet. Start by adding your first skill."
        />
        {/* pv-block-end:skht8u */}

      {/* pv-editable-zone-end:sk1a2b */}

      <DialogTrigger ref={importDialogRef}>
        <span className="hidden" />
        <DialogOverlay>
          <DialogWindow size="md" />
        </DialogOverlay>
      </DialogTrigger>
    </div>
  );
}

// --- MAIN APP COMPONENT ---

export default function App() {
  const { state, navigate } = useStore();
  const currentPath = state.path;

  // Derive page title from path
  const pageTitle = currentPath.replace('/', '').charAt(0).toUpperCase() + currentPath.replace('/', '').slice(1);

  return (
    <div className="flex h-screen bg-background-default text-foreground-default font-sans overflow-hidden">
      <TooltipProvider />
      {/* Sidebar */}
      <div className="w-64 flex flex-col shrink-0 bg-background-subtle">
        <div className="h-16 flex items-center px-6 gap-3">
          <div className="w-8 h-8 rounded-lg bg-background-primary flex items-center justify-center text-foreground-on-primary shadow-sm">
            <Icon iconSymbol="Hexagon" size="sm" />
          </div>
          <TextHeading typography="heading-sm" className="tracking-tight">CoreHR</TextHeading>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
          <div>
            <VerticalTabs value={currentPath} onValueChange={navigate}>
              <VerticalTabItem value="/profile" label="John Smith" prefixIcon="mdi:account-circle-outline" />
            </VerticalTabs>
          </div>

          <div>
            <TextParagraph typography="semibold-secondary" className="mb-1 text-xs px-2">Manage</TextParagraph>
            <VerticalTabs value={currentPath} onValueChange={navigate}>
              <VerticalTabItem value="/dashboard" label="Home" prefixIcon="mdi:home" />
              <VerticalTabItem value="/calendar" label="Calendar" prefixIcon="mdi:calendar-outline" />
              <VerticalTabItem value="/employees" label="Employees" prefixIcon="mdi:account-group-outline" />
              <VerticalTabItem value="/attendance" label="Attendance" prefixIcon="mdi:clock-outline" />
              <VerticalTabItem value="/time-off" label="Time off" prefixIcon="mdi:umbrella-beach-outline" />
              <VerticalTabItem value="/payroll" label="Payroll" prefixIcon="mdi:cash-multiple" />
              <VerticalTabItem value="/expenses" label="Expenses" prefixIcon="mdi:receipt-outline" />
              <VerticalTabItem value="/journeys" label="Journeys" prefixIcon="mdi:map-marker-path" />
              <VerticalTabItem value="/company" label="Company" prefixIcon="mdi:domain" />
              <VerticalTabItem value="/reports" label="Reports" prefixIcon="mdi:chart-bar" />
              <VerticalTabItem value="/tickets" label="Tickets" prefixIcon="mdi:ticket-outline" />
            </VerticalTabs>
          </div>

          <div>
            <TextParagraph typography="semibold-secondary" className="mb-1 text-xs px-2">Grow</TextParagraph>
            <VerticalTabs value={currentPath} onValueChange={navigate}>
              <VerticalTabItem value="/overview" label="Overview" prefixIcon="mdi:sprout-outline" />
              <VerticalTabItem value="/bravos" label="Bravos" prefixIcon="mdi:hands-pray" />
              <VerticalTabItem value="/feedback" label="Feedback" prefixIcon="mdi:message-text-outline" />
              <VerticalTabItem value="/performance" label="Performance" prefixIcon="mdi:trending-up" />
              <VerticalTabItem value="/talent-reviews" label="Talent reviews" prefixIcon="mdi:account-star-outline" />
              <VerticalTabItem value="/pulse-surveys" label="Pulse Surveys" prefixIcon="mdi:pulse" />
              <VerticalTabItem value="/engagement" label="Engagement" prefixIcon="mdi:heart-outline" />
              <VerticalTabsExpandableSection label="Development" value="/development" prefixIcon="mdi:school-outline" expandable="expanded">
                <VerticalTabItem value="/skills" label="Skills" subtab />
                <VerticalTabItem value="/skills-insights" label="Skills insights" subtab />
                <VerticalTabItem value="/skills-mappings" label="Skills mappings" subtab />
                <VerticalTabItem value="/training" label="Training" subtab />
              </VerticalTabsExpandableSection>
              <VerticalTabItem value="/goals" label="Goals" prefixIcon="mdi:flag-outline" />
              <VerticalTabItem value="/people" label="People" prefixIcon="mdi:account-multiple-outline" />
            </VerticalTabs>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background-subtle">
        {/* Topbar */}
        <header className="flex items-center justify-end shrink-0 bg-background-subtle h-12 pl-8 pr-2">
          <div className="flex items-center gap-px">
            <Button iconOnly variant="ghost" color="neutral"><Icon className="text-foreground-default" iconSymbol="mdi:help-circle-outline" size="md" /></Button>
            <Button iconOnly variant="ghost" color="neutral"><Icon className="text-foreground-default" iconSymbol="mdi:cog-outline" size="md" /></Button>
            <Button iconOnly variant="ghost" color="neutral"><Icon className="text-foreground-default" iconSymbol="mdi:monitor-outline" size="md" /></Button>
            <div className="relative">
              <Button iconOnly variant="ghost" color="neutral"><Icon className="text-foreground-default" iconSymbol="mdi:bell-outline" size="md" /></Button>
              <span className="absolute top-2 right-2 w-2 h-2 bg-background-destructive rounded-full border border-background-default"></span>
            </div>

            {/* User Avatar Dropdown */}
            <PopoverTrigger placement="bottom" align="right">
              <Button iconOnly variant="ghost" color="neutral">
                <Avatar initials="JD" bgColor="info" size="sm" />
              </Button>
              
              <DropdownList width="lg" className="">
                <DropdownItem>
                  <Avatar initials="JD" bgColor="info" size="sm" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground-default">Jane Doe</span>
                    <span className="text-xs text-foreground-tertiary">jane.doe@acmecorp.com</span>
                  </div>
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem>
                  <Icon iconSymbol="bell" size="sm" className="text-foreground-secondary" />
                  <span className="text-foreground-default">Notifications</span>
                  <Badge label="4" color="destructive" />
                </DropdownItem>
                <DropdownItem label="Account Settings" prefixIcon="settings" />
                <DropdownItem label="Help & Support" prefixIcon="help-circle" />
                <DropdownSeparator />
                <DropdownItem label="Sign out" prefixIcon="log-out" destructive />
              </DropdownList>
            </PopoverTrigger>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto rounded-tl-lg bg-background-default border-t border-l border-border-default">
          <div className="mx-auto">
            {currentPath === '/dashboard' && <DashboardPage />}
            {currentPath === '/employees' && <EmployeesPage />}
            {currentPath === '/positions' && <PositionsPage />}
            {currentPath === '/departments' && <DepartmentsPage />}
            {currentPath === '/skills' && <SkillsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}