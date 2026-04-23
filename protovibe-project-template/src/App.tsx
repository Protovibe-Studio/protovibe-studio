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
import { Checkbox } from '@/components/ui/checkbox'
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown'
import { MultiSelectDropdownItem } from '@/components/ui/multi-select-dropdown-item'
import { SelectDropdownMenu } from '@/components/ui/select-dropdown-menu'
import { RadioGroup } from '@/components/ui/radio-group'
import { RadioItem } from '@/components/ui/radio-item'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import { MultiSelectDropdownMenu } from '@/components/ui/multi-select-dropdown-menu'

import { PreloaderSpinner } from '@/components/ui/preloader-spinner'
import { SuperLabel } from '@/components/ui/super-label'
import { FileDropArea } from '@/components/ui/file-drop-area'
import { Chip } from '@/components/ui/chip'


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

const mockSkillPreviews = [
  {
    id: 'sk1',
    name: 'Talent Acquisition',
    description: 'Sourcing, attracting, interviewing, and onboarding employees.',
    category: 'Technical skills',
    isExisting: true,
    totalLevels: 4,
    levels: [
      { id: 'l1', name: 'Beginner', levelIndex: 1, description: '- Screens inbound resumes against basic criteria\n- Schedules interviews and coordinates with hiring managers\n- Posts jobs to various boards and platforms\n- Conducts initial phone screens for junior roles\n- Assists with new hire onboarding paperwork', positions: ['HR Assistant', 'Junior Recruiter'] },
      { id: 'l2', name: 'Competent', levelIndex: 2, description: '- Conducts full-cycle recruiting for mid-level roles\n- Sources passive candidates using LinkedIn Recruiter\n- Advises hiring managers on interview best practices\n- Negotiates standard offers and closes candidates\n- Manages candidate pipelines in the ATS effectively', positions: ['Recruiter', 'HR Generalist'] },
      { id: 'l3', name: 'Advanced', levelIndex: 3, description: '- Recruits for highly technical, niche, or executive roles\n- Develops comprehensive employer branding initiatives\n- Analyzes recruiting metrics (Time to Fill, Cost per Hire)\n- Designs structured interview processes and rubrics\n- Trains the company on unbiased hiring practices', positions: ['Senior Recruiter', 'Talent Acquisition Manager'] },
      { id: 'l4', name: 'Expert', levelIndex: 4, description: '- Designs global hiring and workforce planning strategies\n- Optimizes enterprise recruitment processes and tool stacks\n- Builds executive search capabilities in-house\n- Aligns talent acquisition with long-term business goals\n- Navigates hiring during mergers, acquisitions, or hyper-growth', positions: [] },
    ],
  },
  {
    id: 'sk2',
    name: 'Employee Relations',
    description: 'Managing workplace relationships and resolving conflicts effectively.',
    category: 'Soft skills',
    isExisting: false,
    totalLevels: 4,
    levels: [
      { id: 'l5', name: 'Beginner', levelIndex: 1, description: '- Handles basic employee inquiries and HR process questions\n- Documents workplace incidents and concerns\n- Escalates complex issues to senior HR staff', positions: ['HR Assistant'] },
      { id: 'l6', name: 'Competent', levelIndex: 2, description: '- Mediates minor conflicts between employees\n- Conducts investigations into policy violations\n- Advises managers on corrective action procedures', positions: ['HR Generalist', 'HR Business Partner'] },
    ],
  },
];

const availablePositions = [
  'HR Assistant', 'Junior Recruiter', 'Recruiter', 'HR Generalist',
  'Senior Recruiter', 'Talent Acquisition Manager', 'HR Business Partner',
  'Junior Product Designer', 'Senior Product Designer', 'Product Designer',
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

        {/* pv-block-start:jsb1vv */}
        <Checkbox  data-pv-block="jsb1vv" primaryText="Accept terms" />
        {/* pv-block-end:jsb1vv */}
        {/* pv-block-start:q0b5zn */}
        <ToggleSwitch data-pv-block="q0b5zn" primaryText="Enable feature" />
        {/* pv-block-end:q0b5zn */}
        {/* pv-block-start:ggfppw */}
        <SelectDropdown data-pv-block="ggfppw" placeholder="Select an option" >
          {/* pv-editable-zone-start:63b0lh */}
            {/* pv-block-start:kxad94 */}
            <SelectDropdownSearch data-pv-block="kxad94" placeholder="Search..." />
            {/* pv-block-end:kxad94 */}
            {/* pv-block-start:7068rr */}
            <DropdownItem data-pv-block="7068rr" value="opt1" label="Option One" selected={false} />
            {/* pv-block-end:7068rr */}
            {/* pv-block-start:5pjwz1 */}
            <DropdownItem data-pv-block="5pjwz1" value="opt2" label="Option Two" selected={false} />
            {/* pv-block-end:5pjwz1 */}
            {/* pv-block-start:536a76 */}
            <DropdownItem data-pv-block="536a76" value="opt3" label="Option Three" selected={false} />
            {/* pv-block-end:536a76 */}
          {/* pv-editable-zone-end:63b0lh */}
        </SelectDropdown>
        {/* pv-block-end:ggfppw */}
        {/* pv-block-start:llpliu */}
        <RadioGroup data-pv-block="llpliu" orientation="vertical" value="opt1">
          {/* pv-editable-zone-start:xljzdj */}
            {/* pv-block-start:rydjad */}
            <RadioItem data-pv-block="rydjad" value="opt1" primaryText="Option One" secondaryText="Description for option one" />
            {/* pv-block-end:rydjad */}
            {/* pv-block-start:2e8cb3 */}
            <RadioItem data-pv-block="2e8cb3" value="opt2" primaryText="Option Two" secondaryText="Description for option two" />
            {/* pv-block-end:2e8cb3 */}
            {/* pv-block-start:bosme3 */}
            <RadioItem data-pv-block="bosme3" value="opt3" primaryText="Option Three" secondaryText="Third option" />
            {/* pv-block-end:bosme3 */}
          {/* pv-editable-zone-end:xljzdj */}
        </RadioGroup>
        {/* pv-block-end:llpliu */}

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
        {/* pv-block-start:dkwss2 */}
        <div data-testid="e2e-pv-block" className="flex flex-col min-h-4 p-4 border border-border-default rounded" data-pv-block="dkwss2">
          {/* pv-editable-zone-start:inside-dkwss2 */}
            {/* pv-block-start:rkj7hq */}
            <span className="" data-pv-block="rkj7hq">
              Container for testing adding and styling elements
            </span>
            {/* pv-block-end:rkj7hq */}
          {/* pv-editable-zone-end:inside-dkwss2 */}
        </div>
        {/* pv-block-end:dkwss2 */}
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
  const [dialogFlow, setDialogFlow] = useState<'generate' | 'import' | null>(null);
  const [step, setStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [proficiencyOption, setProficiencyOption] = useState('opt1');

  type SkillLevel = { id: string; name: string; levelIndex: number; description: string; positions: string[] };
  type SkillPreview = { id: string; name: string; description: string; category: string; isExisting: boolean; totalLevels: number; levels: SkillLevel[]; applyAction: 'create' | 'skip' };
  const [skillPreviews, setSkillPreviews] = useState<SkillPreview[]>(
    mockSkillPreviews.map(s => ({ ...s, applyAction: 'create' as const }))
  );
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', description: '', positions: '' });
  const [collapsedSkills, setCollapsedSkills] = useState<Set<string>>(new Set());

  const startEditLevel = (level: SkillLevel) => {
    setEditingLevelId(level.id);
    setEditFormData({ name: level.name, description: level.description, positions: level.positions.join(',') });
  };

  const saveEditLevel = (skillId: string, levelId: string) => {
    setSkillPreviews(prev => prev.map(skill =>
      skill.id !== skillId ? skill : {
        ...skill,
        levels: skill.levels.map(level =>
          level.id !== levelId ? level : {
            ...level,
            name: editFormData.name,
            description: editFormData.description,
            positions: editFormData.positions ? editFormData.positions.split(',').map((p: string) => p.trim()).filter(Boolean) : [],
          }
        ),
      }
    ));
    setEditingLevelId(null);
  };

  const toggleSkillCollapse = (skillId: string) => {
    setCollapsedSkills(prev => {
      const next = new Set(prev);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  };

  const openDialog = (flow: 'generate' | 'import') => {
    setDialogFlow(flow);
    setStep(1);
    setUploadedFile(null);
    importDialogRef.current?.open();
  };

  React.useEffect(() => {
    if (dialogFlow === 'generate' && step === 3) {
      const timer = setTimeout(() => setStep(4), 20000);
      return () => clearTimeout(timer);
    }
    if (dialogFlow === 'import' && step === 4) {
      const timer = setTimeout(() => {
        setStep(5);
      }, 20000);
      return () => clearTimeout(timer);
    }
    if (dialogFlow === 'import' && step === 6) {
      const timer = setTimeout(() => {
        setStep(7);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [dialogFlow, step]);

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
          <PopoverTrigger closeOnClickInside={true} data-pv-block="skcn3o" placement="bottom" align="right">
            <Button label="Add skills" leftIcon="mdi:plus" />
            <DropdownList width="xl" className="">
              <DropdownItem prefixIcon="mdi:plus" label="Add new skill manually" secondaryText="Manually enter description and proficiency level" />
              <DropdownItem prefixIcon="mdi:upload" label="Import skills from a file" secondaryText="Upload your company document and let AI read the skills" onClick={() => openDialog('import')} />
              <DropdownItem onClick={() => openDialog('generate')}>
                <Badge className="w-4 justify-center" label="AI" color="primary" />
                <div className="flex flex-col flex-1 gap-0.5">
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
        <EmptyState iconSize="xl" className="min-h-92"
          data-pv-block="skht8u"
          icon="mdi:text-box-outline"
          bigHeading="Create your first skill"
          secondaryText="You haven't added any skills yet. Start by adding your first skill."
        />
        {/* pv-block-end:skht8u */}

      {/* pv-editable-zone-end:sk1a2b */}

      <DialogTrigger ref={importDialogRef}>
        <span className="hidden" />
        <DialogOverlay customDistanceFromTopEdge={9}>
          {/* pv-editable-zone-start:sk9901 */}
          {dialogFlow === 'generate' && (
            <>
              {step === 1 && (
                <DialogWindow size="xl" data-pv-block="1obgh8">
                  {/* pv-editable-zone-start:jcx4p4 */}
                  {/* pv-block-start:k4mn1h */}
                  <div data-pv-block="k4mn1h" className="flex flex-col gap-2 p-12 animate-in fade-in duration-300">
                    {/* pv-editable-zone-start:xcg13x */}
                    {/* pv-block-start:2gcnka */}
                    <div data-pv-block="2gcnka" className="flex flex-row items-start gap-16">
                      {/* pv-editable-zone-start:wo74jp */}
                      {/* pv-block-start:6mrebx */}
                      <div data-pv-block="6mrebx" className="flex flex-col gap-8">
                        {/* pv-editable-zone-start:enyhfe */}
                        {/* pv-block-start:ppsjsl */}
                        <div data-pv-block="ppsjsl" className="flex flex-col gap-4">
                          {/* pv-editable-zone-start:8be0rh */}
                          {/* pv-block-start:rf94ku */}
                          <h2 data-pv-block="rf94ku" className="font-semibold text-foreground-default text-2xl">
                            Generate suggested skills in a spreadsheet
                          </h2>
                          {/* pv-block-end:rf94ku */}
                          {/* pv-block-start:fbnso8 */}
                          <TextParagraph className="pt-0.5" data-pv-block="fbnso8" typography="regular">
                            Don’t have a document that defines skills in your company yet? No worries, we can help you kick-off this project!
                          </TextParagraph>
                          {/* pv-block-end:fbnso8 */}
                          {/* pv-editable-zone-end:8be0rh */}
                        </div>
                        {/* pv-block-end:ppsjsl */}
                        {/* pv-block-start:88rls2 */}
                        <div data-pv-block="88rls2" className="flex flex-col gap-2">
                          {/* pv-editable-zone-start:4v2vz4 */}
                          {/* pv-block-start:gwhw15 */}
                          <div className="flex flex-col items-start relative pb-6 min-h-16" data-pv-block="gwhw15">
                            {/* pv-editable-zone-start:inside-gwhw15 */}
                            {/* pv-block-start:j88xbh */}
                            <div data-pv-block="j88xbh" className="flex flex-row items-start justify-start gap-3">
                              {/* pv-editable-zone-start:qyqjnc */}
                              {/* pv-block-start:ucan3m */}
                              <StepCircle data-pv-block="ucan3m" state="current" number={1} />
                              {/* pv-block-end:ucan3m */}
                              {/* pv-block-start:1zpetx */}
                              <TextParagraph className="pt-0.5" data-pv-block="1zpetx" typography="regular">
                                Generate a file with all your positions and suggested skills
                              </TextParagraph>
                              {/* pv-block-end:1zpetx */}
                              {/* pv-editable-zone-end:qyqjnc */}
                            </div>
                            {/* pv-block-end:j88xbh */}
                            {/* pv-block-start:v7f6k0 */}
                            <div className="flex flex-col w-6 items-center absolute top-8 bottom-0 min-h-2" data-pv-block="v7f6k0">
                              <div className="flex flex-col min-h-4 w-px bg-background-primary flex-1"></div>
                            </div>
                            {/* pv-block-end:v7f6k0 */}
                            {/* pv-editable-zone-end:inside-gwhw15 */}
                          </div>
                          {/* pv-block-end:gwhw15 */}
                          {/* pv-block-start:hx1izr */}
                          <div className="flex flex-col items-start relative pb-6 min-h-16" data-pv-block="hx1izr">
                            {/* pv-editable-zone-start:inside-hx1izr */}
                            {/* pv-block-start:ak7cus */}
                            <div data-pv-block="ak7cus" className="flex flex-row items-start justify-start gap-3">
                              {/* pv-editable-zone-start:qyqjnc */}
                              {/* pv-block-start:s9muwj */}
                              <StepCircle data-pv-block="s9muwj" state="current" number={2} />
                              {/* pv-block-end:s9muwj */}
                              {/* pv-block-start:r9c9b0 */}
                              <TextParagraph className="pt-0.5" data-pv-block="r9c9b0" typography="regular">
                                Collaborate on the file in your favourite tools, like Google Sheets
                              </TextParagraph>
                              {/* pv-block-end:r9c9b0 */}
                              {/* pv-editable-zone-end:qyqjnc */}
                            </div>
                            {/* pv-block-end:ak7cus */}
                            {/* pv-block-start:kgphdx */}
                            <div className="flex flex-col w-6 items-center absolute top-8 bottom-0 min-h-2" data-pv-block="kgphdx">
                              <div className="flex flex-col min-h-4 w-px bg-background-primary flex-1"></div>
                            </div>
                            {/* pv-block-end:kgphdx */}
                            {/* pv-editable-zone-end:inside-hx1izr */}
                          </div>
                          {/* pv-block-end:hx1izr */}
                          {/* pv-block-start:tiw2gl */}
                          <div className="flex flex-col items-start relative pb-6 min-h-0" data-pv-block="tiw2gl">
                            {/* pv-editable-zone-start:inside-tiw2gl */}
                            {/* pv-block-start:lwlyb3 */}
                            <div data-pv-block="lwlyb3" className="flex flex-row items-start justify-start gap-3">
                              {/* pv-editable-zone-start:qyqjnc */}
                              {/* pv-block-start:7s71o1 */}
                              <StepCircle data-pv-block="7s71o1" state="current" number={3} />
                              {/* pv-block-end:7s71o1 */}
                              {/* pv-block-start:iejkht */}
                              <TextParagraph className="pt-0.5" data-pv-block="iejkht" typography="regular">
                                Once you’re done, import the file to Tellent HR
                              </TextParagraph>
                              {/* pv-block-end:iejkht */}
                              {/* pv-editable-zone-end:qyqjnc */}
                            </div>
                            {/* pv-block-end:lwlyb3 */}
                            {/* pv-editable-zone-end:inside-tiw2gl */}
                          </div>
                          {/* pv-block-end:tiw2gl */}
                          {/* pv-editable-zone-end:4v2vz4 */}
                        </div>
                        {/* pv-block-end:88rls2 */}
                        {/* pv-editable-zone-end:enyhfe */}
                      </div>
                      {/* pv-block-end:6mrebx */}
                      {/* pv-block-start:mk6tvu */}
                      <Image data-pv-block="mk6tvu" className="bg-cover bg-center bg-no-repeat w-full bg-[url('/src/images/from-protovibe/ai-spreadsheet-illustration.svg')] aspect-[133/174] max-w-[258px]" />
                      {/* pv-block-end:mk6tvu */}
                      {/* pv-editable-zone-end:wo74jp */}
                    </div>
                    {/* pv-block-end:2gcnka */}
                    {/* pv-editable-zone-end:xcg13x */}
                  </div>
                  {/* pv-block-end:k4mn1h */}
                  {/* pv-block-start:u9rjmz */}
                  <div data-pv-block="u9rjmz" className="flex min-h-4 bg-background-subtle border-t border-border-default flex-row items-center gap-4 justify-between py-3 px-5">
                    {/* pv-editable-zone-start:inside-u9rjmz */}
                    {/* pv-block-start:iozn25 */}
                    <Checkbox data-pv-block="iozn25" primaryText="Don't show this intro again" />
                    {/* pv-block-end:iozn25 */}
                    {/* pv-block-start:zlkw0l */}
                    <div data-pv-block="zlkw0l" className="flex gap-2 flex-row">
                      {/* pv-editable-zone-start:dwfhaa */}
                      {/* pv-block-start:k89jww */}
                      <Button data-pv-block="k89jww" label="Cancel" variant="ghost" color="neutral" size="md" onClick={() => importDialogRef.current?.close()} />
                      {/* pv-block-end:k89jww */}
                      {/* pv-block-start:kr4iot */}
                      <Button data-pv-block="kr4iot" rightIcon="mdi:arrow-right" label="Let's start" variant="solid" color="primary" size="md" onClick={() => setStep(2)} />
                      {/* pv-block-end:kr4iot */}
                      {/* pv-editable-zone-end:dwfhaa */}
                    </div>
                    {/* pv-block-end:zlkw0l */}
                    {/* pv-editable-zone-end:inside-u9rjmz */}
                  </div>
                  {/* pv-block-end:u9rjmz */}
                  {/* pv-editable-zone-end:jcx4p4 */}
                </DialogWindow>
              )}
              {step === 2 && (
                <DialogWindow size="xl" data-pv-block="sdaeec">
                  {/* pv-editable-zone-start:tw6q5w */}
                  {/* pv-block-start:9la13c */}
                  <div data-pv-block="9la13c" className="flex min-h-4 border-border-default flex-row items-center gap-4 justify-start border-b p-5 animate-in fade-in duration-300">
                    {/* pv-editable-zone-start:2xmyp4 */}
                    {/* pv-block-start:wiwrw5 */}
                    <div data-pv-block="wiwrw5" className="flex flex-col gap-0">
                      {/* pv-editable-zone-start:dt5pv2 */}
                      {/* pv-block-start:sxnnbw */}
                      <h2 data-pv-block="sxnnbw" className="text-xl font-semibold text-foreground-default">
                        Generate suggested skills in a spreadsheet
                      </h2>
                      {/* pv-block-end:sxnnbw */}
                      {/* pv-block-start:9ay3vt */}
                      <TextParagraph data-pv-block="9ay3vt" className="pt-0.5 text-sm text-foreground-secondary" typography="regular">
                        Get a template that already has suggested skills matching your positions. <a href="#" className="text-foreground-primary hover:opacity-80 transition-opacity">Learn more</a>
                      </TextParagraph>
                      {/* pv-block-end:9ay3vt */}
                      {/* pv-editable-zone-end:dt5pv2 */}
                    </div>
                    {/* pv-block-end:wiwrw5 */}
                    {/* pv-editable-zone-end:2xmyp4 */}
                  </div>
                  {/* pv-block-end:9la13c */}
                  {/* pv-block-start:pmsui8 */}
                  <div data-pv-block="pmsui8" className="flex flex-col p-5 gap-7">
                    {/* pv-editable-zone-start:9fo3ep */}
                    {/* pv-block-start:7g6gk1 */}
                    <div data-pv-block="7g6gk1" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:or3y0q1 */}
                      {/* pv-block-start:eel6bk */}
                      <SuperLabel data-pv-block="eel6bk" heading="Which positions would you like to fill with skills?" />
                      {/* pv-block-end:eel6bk */}
                      {/* pv-block-start:ldmppg */}
                      <MultiSelectDropdown data-pv-block="ldmppg" placeholder="Select..." value="all">
                        {/* pv-editable-zone-start:qxnsyn */}
                        {/* pv-block-start:e22vfj */}
                        <SelectDropdownSearch data-pv-block="e22vfj" placeholder="Search people..." />
                        {/* pv-block-end:e22vfj */}
                        {/* pv-block-start:fxw1kv */}
                        <MultiSelectDropdownItem data-pv-block="fxw1kv" value="all" label="All" />
                        {/* pv-block-end:fxw1kv */}
                        {/* pv-block-start:tluv3b */}
                        <DropdownSeparator data-pv-block="tluv3b" />
                        {/* pv-block-end:tluv3b */}
                        {/* pv-block-start:ms4sjs */}
                        <MultiSelectDropdownItem data-pv-block="ms4sjs" value="2" label="Backend Developer" />
                        {/* pv-block-end:ms4sjs */}
                        {/* pv-block-start:m1d65b */}
                        <MultiSelectDropdownItem data-pv-block="m1d65b" value="3" label="Senior Backend Developer" />
                        {/* pv-block-end:m1d65b */}
                        {/* pv-block-start:s64qm4 */}
                        <MultiSelectDropdownItem data-pv-block="s64qm4" value="4" label="Junior Backend Developer" />
                        {/* pv-block-end:s64qm4 */}
                        {/* pv-editable-zone-end:qxnsyn */}
                      </MultiSelectDropdown>
                      {/* pv-block-end:ldmppg */}
                      {/* pv-editable-zone-end:or3y0q1 */}
                    </div>
                    {/* pv-block-end:7g6gk1 */}
                    {/* pv-block-start:fmnn7e */}
                    <div data-pv-block="fmnn7e" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:or3y0q2 */}
                      {/* pv-block-start:404k9n */}
                      <SuperLabel data-pv-block="404k9n" heading="Fill the template with suggested skills?" />
                      {/* pv-block-end:404k9n */}
                      {/* pv-block-start:qrdh7f */}
                      <RadioGroup data-pv-block="qrdh7f" orientation="vertical" value="yes">
                        {/* pv-editable-zone-start:cygyr2 */}
                        {/* pv-block-start:p40mmq */}
                        <RadioItem data-pv-block="p40mmq" value="yes" primaryText="Yes, fill the template with suggested skills" />
                        {/* pv-block-end:p40mmq */}
                        {/* pv-block-start:m823s6 */}
                        <RadioItem data-pv-block="m823s6" value="no" primaryText="No, get an empty template without example skills" />
                        {/* pv-block-end:m823s6 */}
                        {/* pv-editable-zone-end:cygyr2 */}
                      </RadioGroup>
                      {/* pv-block-end:qrdh7f */}
                      {/* pv-editable-zone-end:or3y0q2 */}
                    </div>
                    {/* pv-block-end:fmnn7e */}
                    {/* pv-block-start:bb62pi */}
                    <div data-pv-block="bb62pi" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:or3y0q3 */}
                      {/* pv-block-start:tfzb3g */}
                      <SuperLabel data-pv-block="tfzb3g" secondaryText="What framework do you prefer?" heading="How many proficiency levels per skill?" />
                      {/* pv-block-end:tfzb3g */}
                      {/* pv-block-start:pvjmg7 */}
                      <SelectDropdown data-pv-block="pvjmg7" showClearButton={false} value={proficiencyOption} onSelectionChange={setProficiencyOption} placeholder="Select an option">
                        {/* pv-editable-zone-start:vtz9zr */}
                        {/* pv-block-start:03p0a3 */}
                        <SelectDropdownSearch data-pv-block="03p0a3" placeholder="Search..." />
                        {/* pv-block-end:03p0a3 */}
                        {/* pv-block-start:5ax979 */}
                        <DropdownItem data-pv-block="5ax979" secondaryText="Beginner, Competent, Advanced, Expert" value="opt1" label="Standard 4-level framework" />
                        {/* pv-block-end:5ax979 */}
                        {/* pv-block-start:d8tv3a */}
                        <DropdownItem data-pv-block="d8tv3a" secondaryText="Novice, Beginner, Competent, Proficient, Expert" value="opt2" label="Standard 5-level framework" />
                        {/* pv-block-end:d8tv3a */}
                        {/* pv-block-start:u04oe5 */}
                        <DropdownItem data-pv-block="u04oe5" secondaryText="Your own list of proficiency levels" value="opt3" label="Custom" />
                        {/* pv-block-end:u04oe5 */}
                        {/* pv-editable-zone-end:vtz9zr */}
                      </SelectDropdown>
                      {/* pv-block-end:pvjmg7 */}
                      {/* pv-editable-zone-end:or3y0q3 */}
                    </div>
                    {/* pv-block-end:bb62pi */}
                    {proficiencyOption === 'opt3' && (
                      <div  data-pv-block="45ndt1" className="flex flex-col gap-2">
                        {/* pv-block-start:8gfm24 */}
                        <SuperLabel secondaryText="A lower number indicates a lower level." heading="Custom proficiency levels" data-pv-block="8gfm24" primaryText="" />
                        {/* pv-block-end:8gfm24 */}
                        {/* pv-editable-zone-start:or3y0q */}
                        {/* pv-block-start:2qwfpd */}
                        <div data-pv-block="2qwfpd" className="flex flex-col gap-2">
                          {/* pv-editable-zone-start:9h5za1 */}
                          {/* pv-block-start:4v3qaz */}
                          <div className="flex min-h-4 flex-row items-center justify-start gap-1" data-pv-block="4v3qaz">
                            {/* pv-editable-zone-start:w2v43y */}
                            {/* pv-block-start:lhwc6d */}
                            <Icon data-pv-block="lhwc6d" iconSymbol="mdi:drag-vertical" size="lg" />
                            {/* pv-block-end:lhwc6d */}
                            {/* pv-block-start:mk878m */}
                            <div className="flex flex-col min-h-4 text-center leading-none items-center justify-center w-6 h-6 rounded-full bg-background-primary-subtle text-foreground-secondary text-sm font-semibold mr-1" data-pv-block="mk878m">
                              {/* pv-editable-zone-start:lczuef */}
                              {/* pv-block-start:17ktzk */}
                              <span data-pv-block="17ktzk">1</span>
                              {/* pv-block-end:17ktzk */}
                              {/* pv-editable-zone-end:lczuef */}
                            </div>
                            {/* pv-block-end:mk878m */}
                            {/* pv-block-start:4zmjbv */}
                            <Input data-pv-block="4zmjbv" placeholder="Proficiency level name, e.g. Beginner" />
                            {/* pv-block-end:4zmjbv */}
                            {/* pv-block-start:bpfr6l */}
                            <Button leftIcon="mdi:close" iconOnly data-pv-block="bpfr6l" label="Button" variant="ghost" color="neutral" size="md" />
                            {/* pv-block-end:bpfr6l */}
                            {/* pv-editable-zone-end:w2v43y */}
                          </div>
                          {/* pv-block-end:4v3qaz */}
                          {/* pv-block-start:e2l3o6 */}
                          <div className="flex min-h-4 flex-row items-center justify-start gap-1" data-pv-block="e2l3o6">
                            {/* pv-editable-zone-start:w2v43y_2 */}
                            {/* pv-block-start:rr3pxh */}
                            <Icon data-pv-block="rr3pxh" iconSymbol="mdi:drag-vertical" size="lg" />
                            {/* pv-block-end:rr3pxh */}
                            {/* pv-block-start:p533ek */}
                            <div className="flex flex-col min-h-4 text-center leading-none items-center justify-center w-6 h-6 rounded-full bg-background-primary-subtle text-foreground-secondary text-sm font-semibold mr-1" data-pv-block="p533ek">
                              {/* pv-editable-zone-start:lczuef_2 */}
                              {/* pv-block-start:y2ft84 */}
                              <span data-pv-block="y2ft84">2</span>
                              {/* pv-block-end:y2ft84 */}
                              {/* pv-editable-zone-end:lczuef_2 */}
                            </div>
                            {/* pv-block-end:p533ek */}
                            {/* pv-block-start:rutske */}
                            <Input data-pv-block="rutske" placeholder="Proficiency level name, e.g. Beginner" />
                            {/* pv-block-end:rutske */}
                            {/* pv-block-start:eeww6b */}
                            <Button leftIcon="mdi:close" iconOnly data-pv-block="eeww6b" label="Button" variant="ghost" color="neutral" size="md" />
                            {/* pv-block-end:eeww6b */}
                            {/* pv-editable-zone-end:w2v43y_2 */}
                          </div>
                          {/* pv-block-end:e2l3o6 */}
                          {/* pv-block-start:iusjyg */}
                          <div className="flex min-h-4 flex-row items-center justify-start gap-1" data-pv-block="iusjyg">
                            {/* pv-editable-zone-start:w2v43y_3 */}
                            {/* pv-block-start:w73vbh */}
                            <Icon data-pv-block="w73vbh" iconSymbol="mdi:drag-vertical" size="lg" />
                            {/* pv-block-end:w73vbh */}
                            {/* pv-block-start:r2su0r */}
                            <div className="flex flex-col min-h-4 text-center leading-none items-center justify-center w-6 h-6 rounded-full bg-background-primary-subtle text-foreground-secondary text-sm font-semibold mr-1" data-pv-block="r2su0r">
                              {/* pv-editable-zone-start:lczuef_3 */}
                              {/* pv-block-start:y0lcl7 */}
                              <span data-pv-block="y0lcl7">3</span>
                              {/* pv-block-end:y0lcl7 */}
                              {/* pv-editable-zone-end:lczuef_3 */}
                            </div>
                            {/* pv-block-end:r2su0r */}
                            {/* pv-block-start:oain13 */}
                            <Input data-pv-block="oain13" placeholder="Proficiency level name, e.g. Beginner" />
                            {/* pv-block-end:oain13 */}
                            {/* pv-block-start:6i3uho */}
                            <Button leftIcon="mdi:close" iconOnly data-pv-block="6i3uho" label="Button" variant="ghost" color="neutral" size="md" />
                            {/* pv-block-end:6i3uho */}
                            {/* pv-editable-zone-end:w2v43y_3 */}
                          </div>
                          {/* pv-block-end:iusjyg */}
                          {/* pv-editable-zone-end:9h5za1 */}
                        </div>
                        {/* pv-block-end:2qwfpd */}

                        {/* pv-block-start:adlvl1 */}
                        <Button className="self-start mt-2" leftIcon="mdi:plus" data-pv-block="adlvl1" label="Add another level" variant="outline" color="neutral" size="md" />
                        {/* pv-block-end:adlvl1 */}
                        {/* pv-editable-zone-end:or3y0q */}
                      </div>
                    )}
                    {/* pv-block-start:y84j4i */}
                    <div data-pv-block="y84j4i" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:or3y0q4 */}
                      {/* pv-block-start:ra8wjw */}
                      <SuperLabel data-pv-block="ra8wjw" secondaryText="For example, what methodologies you plan to use, what industry you’re in." heading="Additonal instructions for AI" />
                      {/* pv-block-end:ra8wjw */}
                      {/* pv-block-start:fxmbq4 */}
                      <Textarea data-pv-block="fxmbq4" placeholder="Optional" />
                      {/* pv-block-end:fxmbq4 */}
                      {/* pv-editable-zone-end:or3y0q4 */}
                    </div>
                    {/* pv-block-end:y84j4i */}
                    {/* pv-editable-zone-end:9fo3ep */}
                  </div>
                  {/* pv-block-end:pmsui8 */}
                  {/* pv-block-start:1a6f2n */}
                  <div data-pv-block="1a6f2n" className="flex min-h-4 bg-background-subtle border-t border-border-default flex-row items-center gap-4 justify-end py-3 px-5">
                    {/* pv-editable-zone-start:2xmyp4_2 */}
                    {/* pv-block-start:vsdapq */}
                    <div data-pv-block="vsdapq" className="flex gap-2 flex-row">
                      {/* pv-editable-zone-start:e2sff4 */}
                      {/* pv-block-start:kig1wi */}
                      <Button data-pv-block="kig1wi" label="Cancel" variant="ghost" color="neutral" size="md" onClick={() => importDialogRef.current?.close()} />
                      {/* pv-block-end:kig1wi */}
                      {/* pv-block-start:0z0827 */}
                      <Button data-pv-block="0z0827" rightIcon="mdi:arrow-right" label="Generate file" variant="solid" color="primary" size="md" onClick={() => setStep(3)} />
                      {/* pv-block-end:0z0827 */}
                      {/* pv-editable-zone-end:e2sff4 */}
                    </div>
                    {/* pv-block-end:vsdapq */}
                    {/* pv-editable-zone-end:2xmyp4_2 */}
                  </div>
                  {/* pv-block-end:1a6f2n */}
                  {/* pv-editable-zone-end:tw6q5w */}
                </DialogWindow>
              )}
              {step === 3 && (
                <DialogWindow size="xl" data-pv-block="4e1bxy">
                  {/* pv-editable-zone-start:bkrv6t */}
                  {/* pv-block-start:9hly6q */}
                  <div data-pv-block="9hly6q" className="flex min-h-4 border-border-default flex-row items-center gap-4 justify-start border-b p-5 animate-in fade-in duration-300">
                    {/* pv-editable-zone-start:wdklis */}
                    {/* pv-block-start:t5mn6q */}
                    <div data-pv-block="t5mn6q" className="flex flex-col gap-0">
                      {/* pv-editable-zone-start:gu1d0k */}
                      {/* pv-block-start:6ysty8 */}
                      <h2 data-pv-block="6ysty8" className="text-xl font-semibold text-foreground-default">
                        Generate suggested skills in a spreadsheet
                      </h2>
                      {/* pv-block-end:6ysty8 */}
                      {/* pv-block-start:7sypun */}
                      <TextParagraph data-pv-block="7sypun" className="pt-0.5 text-sm text-foreground-secondary" typography="regular">
                        Get a template that already has suggested skills matching your positions. <a href="#" className="text-foreground-primary hover:opacity-80 transition-opacity">Learn more</a>
                      </TextParagraph>
                      {/* pv-block-end:7sypun */}
                      {/* pv-editable-zone-end:gu1d0k */}
                    </div>
                    {/* pv-block-end:t5mn6q */}
                    {/* pv-editable-zone-end:wdklis */}
                  </div>
                  {/* pv-block-end:9hly6q */}
                  {/* pv-block-start:032m3g */}
                  <div data-pv-block="032m3g" className="flex flex-col gap-4 items-center p-5">
                    {/* pv-editable-zone-start:pwrm31 */}
                    {/* pv-block-start:iq5pnn */}
                    <div data-pv-block="iq5pnn" className="flex flex-col gap-2 pt-4 items-center">
                      {/* pv-editable-zone-start:23nmht */}
                      {/* pv-block-start:wae0ho */}
                      <PreloaderSpinner data-pv-block="wae0ho" size="xl" className="cursor-pointer" onClick={() => setStep(4)} />
                      {/* pv-block-end:wae0ho */}
                      {/* pv-block-start:twwrwu */}
                      <div data-pv-block="twwrwu" className="flex flex-col gap-0">
                        {/* pv-editable-zone-start:rcg384 */}
                        {/* pv-block-start:oy0e3w */}
                        <TextParagraph data-pv-block="oy0e3w" className="text-center" typography="bold-primary">
                          Analysing your positions...
                        </TextParagraph>
                        {/* pv-block-end:oy0e3w */}
                        {/* pv-block-start:czuex1 */}
                        <TextParagraph data-pv-block="czuex1" className="text-center" typography="regular">
                          It will take about 20 seconds. In the meantime your can play the game below.
                        </TextParagraph>
                        {/* pv-block-end:czuex1 */}
                        {/* pv-editable-zone-end:rcg384 */}
                      </div>
                      {/* pv-block-end:twwrwu */}
                      {/* pv-editable-zone-end:23nmht */}
                    </div>
                    {/* pv-block-end:iq5pnn */}
                    {/* pv-block-start:kzpqe8 */}
                    <div data-pv-block="kzpqe8" className="flex flex-col min-h-32 w-full px-8 h-72">
                      {/* pv-editable-zone-start:s73jd2 */}
                      {/* pv-block-start:m7n2p9 */}
                      <iframe
                        data-pv-block="m7n2p9"
                        src="https://thriving-bombolone-1cfc2b.netlify.app/"
                        className="w-full h-full border-0"
                      />
                      {/* pv-block-end:m7n2p9 */}
                      {/* pv-editable-zone-end:s73jd2 */}
                    </div>
                    {/* pv-block-end:kzpqe8 */}
                    {/* pv-editable-zone-end:pwrm31 */}
                  </div>
                  {/* pv-block-end:032m3g */}
                  {/* pv-block-start:2j5her */}
                  <div data-pv-block="2j5her" className="flex min-h-4 bg-background-subtle border-t border-border-default flex-row items-center gap-4 py-3 px-5 justify-start">
                    {/* pv-editable-zone-start:wdklis_2 */}
                    {/* pv-block-start:rbnqt4 */}
                    <div data-pv-block="rbnqt4" className="flex gap-2 flex-row">
                      {/* pv-editable-zone-start:ekn2l6 */}
                      {/* pv-block-start:qrvgeo */}
                      <Button data-pv-block="qrvgeo" leftIcon="mdi:arrow-left" label="Back" variant="ghost" color="neutral" size="md" onClick={() => setStep(2)} />
                      {/* pv-block-end:qrvgeo */}
                      {/* pv-editable-zone-end:ekn2l6 */}
                    </div>
                    {/* pv-block-end:rbnqt4 */}
                    {/* pv-editable-zone-end:wdklis_2 */}
                  </div>
                  {/* pv-block-end:2j5her */}
                  {/* pv-editable-zone-end:bkrv6t */}
                </DialogWindow>
              )}
              {step === 4 && (
                <DialogWindow size="xl" data-pv-block="7tzslw">
                  {/* pv-editable-zone-start:x75tmm */}
                  {/* pv-block-start:2gwe6k */}
                  <div data-pv-block="2gwe6k" className="flex min-h-4 border-border-default flex-row items-center gap-4 justify-start border-b p-5 animate-in fade-in duration-300">
                    {/* pv-editable-zone-start:94ubwd */}
                    {/* pv-block-start:tb0aj0 */}
                    <div data-pv-block="tb0aj0" className="flex flex-col gap-0">
                      {/* pv-editable-zone-start:i0v2ao */}
                      {/* pv-block-start:n9xnpm */}
                      <h2 data-pv-block="n9xnpm" className="text-xl font-semibold text-foreground-default">
                        Generate suggested skills in a spreadsheet
                      </h2>
                      {/* pv-block-end:n9xnpm */}
                      {/* pv-block-start:gohxyu */}
                      <TextParagraph data-pv-block="gohxyu" className="pt-0.5 text-sm text-foreground-secondary" typography="regular">
                        Get a template that already has suggested skills matching your positions. <a href="#" className="text-foreground-primary hover:opacity-80 transition-opacity">Learn more</a>
                      </TextParagraph>
                      {/* pv-block-end:gohxyu */}
                      {/* pv-editable-zone-end:i0v2ao */}
                    </div>
                    {/* pv-block-end:tb0aj0 */}
                    {/* pv-editable-zone-end:94ubwd */}
                  </div>
                  {/* pv-block-end:2gwe6k */}
                  {/* pv-block-start:mb9rfa */}
                  <div data-pv-block="mb9rfa" className="flex flex-col gap-4 items-center py-16 px-5 animate-in fade-in duration-300">
                    {/* pv-editable-zone-start:tnanie */}
                    {/* pv-block-start:f60dt8 */}
                    <div data-pv-block="f60dt8" className="flex flex-col flex-none bg-[url('/src/images/from-protovibe/sheet-ready-icon-square.svg')] bg-contain bg-center bg-no-repeat aspect-[104/101] w-32">
                    </div>
                    {/* pv-block-end:f60dt8 */}
                    {/* pv-block-start:jzpvwl */}
                    <div data-pv-block="jzpvwl" className="flex flex-col gap-0">
                      {/* pv-editable-zone-start:zx79g1 */}
                      {/* pv-block-start:s9j25t */}
                      <TextParagraph data-pv-block="s9j25t" className="text-center" typography="bold-primary">
                        Your spreadsheet is ready
                      </TextParagraph>
                      {/* pv-block-end:s9j25t */}
                      {/* pv-block-start:3q23tv */}
                      <TextParagraph data-pv-block="3q23tv" className="text-center" typography="regular">
                        We grouped your positions into 30 job families and suggested 56 skills
                      </TextParagraph>
                      {/* pv-block-end:3q23tv */}
                      {/* pv-editable-zone-end:zx79g1 */}
                    </div>
                    {/* pv-block-end:jzpvwl */}
                    {/* pv-block-start:ctfod2 */}
                    <Button data-pv-block="ctfod2" leftIcon="mdi:download" label="Download file" variant="solid" color="primary" size="md" />
                    {/* pv-block-end:ctfod2 */}
                    {/* pv-editable-zone-end:tnanie */}
                  </div>
                  {/* pv-block-end:mb9rfa */}
                  {/* pv-block-start:aqb7og */}
                  <div data-pv-block="aqb7og" className="flex min-h-4 bg-background-subtle border-t border-border-default flex-row items-center gap-4 py-3 px-5 justify-between">
                    {/* pv-editable-zone-start:94ubwd_2 */}
                    {/* pv-block-start:wrud9e */}
                    <Button data-pv-block="wrud9e" leftIcon="mdi:arrow-left" label="Back to start" variant="ghost" color="neutral" size="md" onClick={() => setStep(1)} />
                    {/* pv-block-end:wrud9e */}
                    {/* pv-block-start:vadcyb */}
                    <Button data-pv-block="vadcyb" leftIcon="mdi:check" label="Finish and close" variant="ghost" color="neutral" size="md" onClick={() => importDialogRef.current?.close()} />
                    {/* pv-block-end:vadcyb */}
                    {/* pv-editable-zone-end:94ubwd_2 */}
                  </div>
                  {/* pv-block-end:aqb7og */}
                  {/* pv-editable-zone-end:x75tmm */}
                </DialogWindow>
              )}
            </>
          )}
          {dialogFlow === 'import' && (
            <>
              {step === 1 && (
                <DialogWindow size="xl" data-pv-block="li8oi4">
                  {/* pv-editable-zone-start:wzj4f3 */}
                  {/* pv-block-start:awni33 */}
                  <div data-pv-block="awni33" className="flex flex-col gap-2 p-12 animate-in fade-in duration-300">
                    {/* pv-editable-zone-start:d1m5f2 */}
                    {/* pv-block-start:ootyxe */}
                    <div data-pv-block="ootyxe" className="flex flex-row items-start gap-16">
                      {/* pv-editable-zone-start:fr3dox */}
                      {/* pv-block-start:hv7kpz */}
                      <div data-pv-block="hv7kpz" className="flex flex-col gap-8">
                        {/* pv-editable-zone-start:p6xn0l */}
                        {/* pv-block-start:p9p37g */}
                        <div data-pv-block="p9p37g" className="flex flex-col gap-4">
                          {/* pv-editable-zone-start:36283e */}
                          {/* pv-block-start:setiw2 */}
                          <h2 data-pv-block="setiw2" className="font-semibold text-foreground-default text-2xl">
                            Import skills to positions from a file
                          </h2>
                          {/* pv-block-end:setiw2 */}
                          {/* pv-editable-zone-end:36283e */}
                        </div>
                        {/* pv-block-end:p9p37g */}
                        {/* pv-block-start:0iw2xd */}
                        <div data-pv-block="0iw2xd" className="flex flex-col gap-2">
                          {/* pv-editable-zone-start:qldj8q */}
                          {/* pv-block-start:ams851 */}
                          <div data-pv-block="ams851" className="flex flex-col items-start relative pb-6 min-h-16">
                            {/* pv-editable-zone-start:28v94v */}
                            {/* pv-block-start:xwxd9r */}
                            <div data-pv-block="xwxd9r" className="flex flex-row items-start justify-start gap-3">
                              {/* pv-editable-zone-start:d46es7_1 */}
                              {/* pv-block-start:s1q6p4 */}
                              <StepCircle data-pv-block="s1q6p4" state="current" number={1} />
                              {/* pv-block-end:s1q6p4 */}
                              {/* pv-block-start:43mq4n */}
                              <div data-pv-block="43mq4n" className="flex flex-col gap-0">
                                {/* pv-editable-zone-start:fq7vb3_1 */}
                                {/* pv-block-start:d58yn8 */}
                                <TextParagraph data-pv-block="d58yn8" className="pt-0.5" typography="bold-primary">
                                  Upload a file with company skills
                                </TextParagraph>
                                {/* pv-block-end:d58yn8 */}
                                {/* pv-block-start:zwj3hr */}
                                <TextParagraph data-pv-block="zwj3hr" className="pt-0.5" typography="regular">
                                  Don’t have a document that defines skills in your company yet? No worries, we can help you kick-off this project!
                                </TextParagraph>
                                {/* pv-block-end:zwj3hr */}
                                {/* pv-editable-zone-end:fq7vb3_1 */}
                              </div>
                              {/* pv-block-end:43mq4n */}
                              {/* pv-editable-zone-end:d46es7_1 */}
                            </div>
                            {/* pv-block-end:xwxd9r */}
                            {/* pv-block-start:coqa5y */}
                            <div data-pv-block="coqa5y" className="flex flex-col w-6 items-center absolute top-8 bottom-0 min-h-2">
                              <div className="flex flex-col min-h-4 w-px bg-background-primary flex-1"></div>
                            </div>
                            {/* pv-block-end:coqa5y */}
                            {/* pv-editable-zone-end:28v94v */}
                          </div>
                          {/* pv-block-end:ams851 */}
                          {/* pv-block-start:y2ez92 */}
                          <div data-pv-block="y2ez92" className="flex flex-col items-start relative pb-6 min-h-16">
                            {/* pv-editable-zone-start:q67k1c */}
                            {/* pv-block-start:rt83ku */}
                            <div data-pv-block="rt83ku" className="flex flex-row items-start justify-start gap-3">
                              {/* pv-editable-zone-start:d46es7_2 */}
                              {/* pv-block-start:rj843c */}
                              <StepCircle data-pv-block="rj843c" state="current" number={2} />
                              {/* pv-block-end:rj843c */}
                              {/* pv-block-start:4fmsib */}
                              <div data-pv-block="4fmsib" className="flex flex-col gap-0">
                                {/* pv-editable-zone-start:fq7vb3_2 */}
                                {/* pv-block-start:gtwskv */}
                                <TextParagraph data-pv-block="gtwskv" className="pt-0.5" typography="bold-primary">
                                  Preview
                                </TextParagraph>
                                {/* pv-block-end:gtwskv */}
                                {/* pv-block-start:v40yil */}
                                <TextParagraph data-pv-block="v40yil" className="pt-0.5" typography="regular">
                                  See list of skills and positions before applying changes
                                </TextParagraph>
                                {/* pv-block-end:v40yil */}
                                {/* pv-editable-zone-end:fq7vb3_2 */}
                              </div>
                              {/* pv-block-end:4fmsib */}
                              {/* pv-editable-zone-end:d46es7_2 */}
                            </div>
                            {/* pv-block-end:rt83ku */}
                            {/* pv-block-start:o5x116 */}
                            <div data-pv-block="o5x116" className="flex flex-col w-6 items-center absolute top-8 bottom-0 min-h-2">
                              <div className="flex flex-col min-h-4 w-px bg-background-primary flex-1"></div>
                            </div>
                            {/* pv-block-end:o5x116 */}
                            {/* pv-editable-zone-end:q67k1c */}
                          </div>
                          {/* pv-block-end:y2ez92 */}
                          {/* pv-block-start:bjkghv */}
                          <div data-pv-block="bjkghv" className="flex flex-col items-start relative pb-6 min-h-0">
                            {/* pv-editable-zone-start:no8bze */}
                            {/* pv-block-start:lwkw3n */}
                            <div data-pv-block="lwkw3n" className="flex flex-row items-start justify-start gap-3">
                              {/* pv-editable-zone-start:d46es7_3 */}
                              {/* pv-block-start:luha31 */}
                              <StepCircle data-pv-block="luha31" state="current" number={3} />
                              {/* pv-block-end:luha31 */}
                              {/* pv-block-start:hb42kq */}
                              <div data-pv-block="hb42kq" className="flex flex-col gap-0">
                                {/* pv-editable-zone-start:fq7vb3_3 */}
                                {/* pv-block-start:l4gbx4 */}
                                <TextParagraph data-pv-block="l4gbx4" className="pt-0.5" typography="bold-primary">
                                  Apply changes
                                </TextParagraph>
                                {/* pv-block-end:l4gbx4 */}
                                {/* pv-block-start:6yh4hz */}
                                <TextParagraph data-pv-block="6yh4hz" className="pt-0.5" typography="regular">
                                  Confirm and import skills
                                </TextParagraph>
                                {/* pv-block-end:6yh4hz */}
                                {/* pv-editable-zone-end:fq7vb3_3 */}
                              </div>
                              {/* pv-block-end:hb42kq */}
                              {/* pv-editable-zone-end:d46es7_3 */}
                            </div>
                            {/* pv-block-end:lwkw3n */}
                            {/* pv-editable-zone-end:no8bze */}
                          </div>
                          {/* pv-block-end:bjkghv */}
                          {/* pv-editable-zone-end:qldj8q */}
                        </div>
                        {/* pv-block-end:0iw2xd */}
                        {/* pv-editable-zone-end:p6xn0l */}
                      </div>
                      {/* pv-block-end:hv7kpz */}
                      {/* pv-block-start:tqgkud */}
                      <Image data-pv-block="tqgkud" className="bg-cover bg-center bg-no-repeat w-full bg-[url('/src/images/from-protovibe/ai-skills-illustration.svg')] aspect-[314/371] max-w-[323px]" />
                      {/* pv-block-end:tqgkud */}
                      {/* pv-editable-zone-end:fr3dox */}
                    </div>
                    {/* pv-block-end:ootyxe */}
                    {/* pv-editable-zone-end:d1m5f2 */}
                  </div>
                  {/* pv-block-end:awni33 */}
                  {/* pv-block-start:axe22k */}
                  <div data-pv-block="axe22k" className="flex min-h-4 bg-background-subtle border-t border-border-default flex-row items-center gap-4 justify-between py-3 px-5">
                    {/* pv-editable-zone-start:8etqlx */}
                    {/* pv-block-start:v19je1 */}
                    <Checkbox data-pv-block="v19je1" primaryText="Don't show this intro again" />
                    {/* pv-block-end:v19je1 */}
                    {/* pv-block-start:xw3vxw */}
                    <div data-pv-block="xw3vxw" className="flex gap-2 flex-row">
                      {/* pv-editable-zone-start:hspybn */}
                      {/* pv-block-start:iefp1d */}
                      <Button data-pv-block="iefp1d" label="Cancel" variant="ghost" color="neutral" size="md" onClick={() => importDialogRef.current?.close()} />
                      {/* pv-block-end:iefp1d */}
                      {/* pv-block-start:evqex1 */}
                      <Button data-pv-block="evqex1" rightIcon="mdi:arrow-right" label="Let's start" variant="solid" color="primary" size="md" onClick={() => setStep(2)} />
                      {/* pv-block-end:evqex1 */}
                      {/* pv-editable-zone-end:hspybn */}
                    </div>
                    {/* pv-block-end:xw3vxw */}
                    {/* pv-editable-zone-end:8etqlx */}
                  </div>
                  {/* pv-block-end:axe22k */}
                  {/* pv-editable-zone-end:wzj4f3 */}
                </DialogWindow>
              )}
              {step === 2 && (
                <DialogWindow size="xl" data-pv-block="jipw8f">
                  {/* pv-editable-zone-start:ghpyxn */}
                  {/* pv-block-start:my9lvs */}
                  <div data-pv-block="my9lvs" className="flex min-h-4 border-border-default flex-row items-center gap-4 justify-start border-b p-5 animate-in fade-in duration-300">
                    {/* pv-editable-zone-start:t7nd3c */}
                    {/* pv-block-start:d9f5jx */}
                    <div data-pv-block="d9f5jx" className="flex flex-col gap-0">
                      {/* pv-editable-zone-start:7l5x7c */}
                      {/* pv-block-start:vw310f */}
                      <h2 data-pv-block="vw310f" className="text-xl font-semibold text-foreground-default">
                        Import skills to positions from a file
                      </h2>
                      {/* pv-block-end:vw310f */}
                      {/* pv-block-start:rwtf2d */}
                      <TextParagraph data-pv-block="rwtf2d" className="pt-0.5 text-sm text-foreground-secondary" typography="regular">
                        Upload your document and AI will read it and import skills to Tellent HR. <a href="#" className="text-foreground-primary hover:opacity-80 transition-opacity">Learn more</a>
                      </TextParagraph>
                      {/* pv-block-end:rwtf2d */}
                      {/* pv-editable-zone-end:7l5x7c */}
                    </div>
                    {/* pv-block-end:d9f5jx */}
                    {/* pv-editable-zone-end:t7nd3c */}
                  </div>
                  {/* pv-block-end:my9lvs */}
                  {/* pv-block-start:cozohu */}
                  <div data-pv-block="cozohu" className="flex flex-col p-5 gap-7">
                    {/* pv-editable-zone-start:1907kq */}
                    {/* pv-block-start:h1e3bn */}
                    <Stepper data-pv-block="h1e3bn" fullWidth={false}>
                      {/* pv-editable-zone-start:v4z32l */}
                      {/* pv-block-start:jteecl */}
                      <StepCircle data-pv-block="jteecl" labelPosition="right" state="current" number={1} label="Upload file" />
                      {/* pv-block-end:jteecl */}
                      {/* pv-block-start:s7bgd8 */}
                      <StepperConnector data-pv-block="s7bgd8" state="upcoming" />
                      {/* pv-block-end:s7bgd8 */}
                      {/* pv-block-start:kar3j0 */}
                      <StepCircle data-pv-block="kar3j0" labelPosition="right" state="upcoming" number={2} label="Preview skills" />
                      {/* pv-block-end:kar3j0 */}
                      {/* pv-block-start:179spq */}
                      <StepperConnector data-pv-block="179spq" state="upcoming" />
                      {/* pv-block-end:179spq */}
                      {/* pv-block-start:dlc7vi */}
                      <StepCircle data-pv-block="dlc7vi" labelPosition="right" state="upcoming" number={3} label="Apply changes" />
                      {/* pv-block-end:dlc7vi */}
                      {/* pv-editable-zone-end:v4z32l */}
                    </Stepper>
                    {/* pv-block-end:h1e3bn */}
                    {/* pv-block-start:v2w9lh */}
                    <div data-pv-block="v2w9lh" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:hikm6d */}
                      {/* pv-block-start:0fqt9h */}
                      <SuperLabel data-pv-block="0fqt9h" secondaryText="Supported file formats: PDF, DOCX, CSV or XLSX • Max. file size: 5 MB" heading="Upload files with skills" />
                      {/* pv-block-end:0fqt9h */}
                      {/* pv-block-start:bkeq1m */}
                      <div data-pv-block="bkeq1m" className="flex min-h-4 flex-row gap-2 rounded bg-background-primary-subtle p-3">
                        {/* pv-editable-zone-start:fzw0z4 */}
                        {/* pv-block-start:mgc6pa */}
                        <div data-pv-block="mgc6pa" className="flex flex-col gap-2">
                          {/* pv-editable-zone-start:a3ohvi */}
                          {/* pv-block-start:72nslo */}
                          <Icon data-pv-block="72nslo" className="text-background-primary-soft" iconSymbol="glyphs:sparkle-bold" size="md" />
                          {/* pv-block-end:72nslo */}
                          {/* pv-editable-zone-end:a3ohvi */}
                        </div>
                        {/* pv-block-end:mgc6pa */}
                        {/* pv-block-start:aa013h */}
                        <div data-pv-block="aa013h" className="flex flex-col gap-2">
                          {/* pv-editable-zone-start:vhplpm */}
                          {/* pv-block-start:4r4rdw */}
                          <TextParagraph data-pv-block="4r4rdw" typography="secondary">
                            No special template is required, Tellent AI is smart enough to analyse any file with company skills. Don’t have such a file yet? <a href="#" onClick={(e) => { e.preventDefault(); openDialog('generate'); }} className="text-foreground-primary hover:opacity-80 transition-opacity">Generate suggested skills in a sheet</a>
                          </TextParagraph>
                          {/* pv-block-end:4r4rdw */}
                          {/* pv-editable-zone-end:vhplpm */}
                        </div>
                        {/* pv-block-end:aa013h */}
                        {/* pv-editable-zone-end:fzw0z4 */}
                      </div>
                      {/* pv-block-end:bkeq1m */}
                      {/* pv-block-start:rnkizt */}
                      <FileDropArea  
                        data-pv-block="rnkizt"
                        heading="Upload a file with skills, levels and positions"
                        multiple
                        onFilesChange={(files) => {
                          if (files[0]) {
                            setUploadedFile(files[0]);
                            setStep(3);
                          }
                        }}
                      />
                      {/* pv-block-end:rnkizt */}
                      {/* pv-editable-zone-end:hikm6d */}
                    </div>
                    {/* pv-block-end:v2w9lh */}
                    {/* pv-editable-zone-end:1907kq */}
                  </div>
                  {/* pv-block-end:cozohu */}
                  {/* pv-block-start:686fs1 */}
                  <div data-pv-block="686fs1" className="flex min-h-4 bg-background-subtle border-t border-border-default flex-row items-center gap-4 justify-end py-3 px-5">
                    {/* pv-editable-zone-start:t7nd3c_2 */}
                    {/* pv-block-start:kgo6ug */}
                    <div data-pv-block="kgo6ug" className="flex gap-2 flex-row">
                      {/* pv-editable-zone-start:olib04 */}
                      {/* pv-block-start:pxxeyc */}
                      <Button data-pv-block="pxxeyc" label="Cancel" variant="ghost" color="neutral" size="md" onClick={() => importDialogRef.current?.close()} />
                      {/* pv-block-end:pxxeyc */}
                      {/* pv-editable-zone-end:olib04 */}
                    </div>
                    {/* pv-block-end:kgo6ug */}
                    {/* pv-editable-zone-end:t7nd3c_2 */}
                  </div>
                  {/* pv-block-end:686fs1 */}
                  {/* pv-editable-zone-end:ghpyxn */}
                </DialogWindow>
              )}
              {step === 3 && (
                <DialogWindow size="xl" data-pv-block="cs131a">
                  {/* pv-editable-zone-start:mi0z44 */}
                  {/* pv-block-start:657op2 */}
                  <div data-pv-block="657op2" className="flex min-h-4 border-border-default flex-row items-center gap-4 justify-start border-b p-5 animate-in fade-in duration-300">
                    {/* pv-editable-zone-start:t7nd3c_3 */}
                    {/* pv-block-start:1qh7o4 */}
                    <div data-pv-block="1qh7o4" className="flex flex-col gap-0">
                      {/* pv-editable-zone-start:7l5x7c_2 */}
                      {/* pv-block-start:q0aexa */}
                      <h2 data-pv-block="q0aexa" className="text-xl font-semibold text-foreground-default">
                        Import skills to positions from a file
                      </h2>
                      {/* pv-block-end:q0aexa */}
                      {/* pv-block-start:utdpi0 */}
                      <TextParagraph data-pv-block="utdpi0" className="pt-0.5 text-sm text-foreground-secondary" typography="regular">
                        Upload your document and AI will read it and import skills to Tellent HR. <a href="#" className="text-foreground-primary hover:opacity-80 transition-opacity">Learn more</a>
                      </TextParagraph>
                      {/* pv-block-end:utdpi0 */}
                      {/* pv-editable-zone-end:7l5x7c_2 */}
                    </div>
                    {/* pv-block-end:1qh7o4 */}
                    {/* pv-editable-zone-end:t7nd3c_3 */}
                  </div>
                  {/* pv-block-end:657op2 */}
                  {/* pv-block-start:8vzh4t */}
                  <div data-pv-block="8vzh4t" className="flex flex-col p-5 gap-7">
                    {/* pv-editable-zone-start:zzgb3q */}
                    {/* pv-block-start:inbixm */}
                    <Stepper data-pv-block="inbixm" fullWidth={false}>
                      {/* pv-editable-zone-start:v4z32l_2 */}
                      {/* pv-block-start:j2037q */}
                      <StepCircle data-pv-block="j2037q" labelPosition="right" state="current" number={1} label="Upload file" />
                      {/* pv-block-end:j2037q */}
                      {/* pv-block-start:prdr4d */}
                      <StepperConnector data-pv-block="prdr4d" state="upcoming" />
                      {/* pv-block-end:prdr4d */}
                      {/* pv-block-start:b1mzqk */}
                      <StepCircle data-pv-block="b1mzqk" labelPosition="right" state="upcoming" number={2} label="Preview skills" />
                      {/* pv-block-end:b1mzqk */}
                      {/* pv-block-start:9r4yey */}
                      <StepperConnector data-pv-block="9r4yey" state="upcoming" />
                      {/* pv-block-end:9r4yey */}
                      {/* pv-block-start:tsf3yd */}
                      <StepCircle data-pv-block="tsf3yd" labelPosition="right" state="upcoming" number={3} label="Apply changes" />
                      {/* pv-block-end:tsf3yd */}
                      {/* pv-editable-zone-end:v4z32l_2 */}
                    </Stepper>
                    {/* pv-block-end:inbixm */}
                    {/* pv-block-start:gi7tw3 */}
                    <div data-pv-block="gi7tw3" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:z2ub36 */}
                      {/* pv-block-start:6qscpx */}
                      <SuperLabel data-pv-block="6qscpx" secondaryText="Supported file formats: PDF, DOCX, CSV or XLSX • Max. file size: 5 MB" heading="Upload files with skills" />
                      {/* pv-block-end:6qscpx */}
                      {/* pv-block-start:qyad0c */}
                      <Card data-pv-block="qyad0c" className="gap-1 p-3 flex-row items-center">
                        {/* pv-editable-zone-start:pgd735_1 */}
                        {/* pv-block-start:d6c1v4 */}
                        <Icon data-pv-block="d6c1v4" iconSymbol="mdi:file-text" size="md" />
                        {/* pv-block-end:d6c1v4 */}
                        {/* pv-block-start:k5n3e5 */}
                        <TextParagraph data-pv-block="k5n3e5" className="flex-1" typography="regular">
                          {uploadedFile?.name || 'company skills final.docx'}
                        </TextParagraph>
                        {/* pv-block-end:k5n3e5 */}
                        {/* pv-block-start:kqeyjl */}
                        <Button data-pv-block="kqeyjl" leftIcon="mdi:close" iconOnly label="Remove" variant="ghost" color="neutral" size="md" onClick={() => { setUploadedFile(null); setStep(2); }} />
                        {/* pv-block-end:kqeyjl */}
                        {/* pv-editable-zone-end:pgd735_1 */}
                      </Card>
                      {/* pv-block-end:qyad0c */}
                      {/* pv-block-start:xl24qo */}
                      <Button data-pv-block="xl24qo" leftIcon="mdi:upload" className="self-start" label="Upload more files" variant="outline" color="neutral" size="sm" />
                      {/* pv-block-end:xl24qo */}
                      {/* pv-editable-zone-end:z2ub36 */}
                    </div>
                    {/* pv-block-end:gi7tw3 */}
                    {/* pv-block-start:5t0e9k */}
                    <div data-pv-block="5t0e9k" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:karvkw_1 */}
                      {/* pv-block-start:98fw46 */}
                      <SuperLabel data-pv-block="98fw46" secondaryText="To ensure best quality, instruct AI what to expect in your file" heading="What's in your file?" />
                      {/* pv-block-end:98fw46 */}
                      {/* pv-block-start:jb66tm */}
                      <Card data-pv-block="jb66tm" className="gap-1 p-3">
                        {/* pv-editable-zone-start:pgd735_2 */}
                        {/* pv-block-start:p71vtz */}
                        <Checkbox data-pv-block="p71vtz" primaryText="Skills have a unique name and description" defaultChecked />
                        {/* pv-block-end:p71vtz */}
                        {/* pv-block-start:vqsgx0 */}
                        <Checkbox data-pv-block="vqsgx0" primaryText="Skills have proficiency levels (e.g. ‘Beginner’, ‘Intermediate’, ‘Expert’)" defaultChecked />
                        {/* pv-block-end:vqsgx0 */}
                        {/* pv-block-start:nfh43p */}
                        <Checkbox data-pv-block="nfh43p" primaryText="Each proficiency level have a description what is expected" />
                        {/* pv-block-end:nfh43p */}
                        {/* pv-block-start:ttmtb2 */}
                        <Checkbox data-pv-block="ttmtb2" primaryText="Positions are associated with a skill and its proficiency level" />
                        {/* pv-block-end:ttmtb2 */}
                        {/* pv-block-start:287n40 */}
                        <Checkbox data-pv-block="287n40" primaryText="Skills are grouped into categories" />
                        {/* pv-block-end:287n40 */}
                        {/* pv-editable-zone-end:pgd735_2 */}
                      </Card>
                      {/* pv-block-end:jb66tm */}
                      {/* pv-editable-zone-end:karvkw_1 */}
                    </div>
                    {/* pv-block-end:5t0e9k */}
                    {/* pv-block-start:f6ckmi */}
                    <div data-pv-block="f6ckmi" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:karvkw_2 */}
                      {/* pv-block-start:jvujl1 */}
                      <SuperLabel data-pv-block="jvujl1" secondaryText="For example, what methodologies you plan to use, what industry you’re in." heading="Additonal instructions for AI" />
                      {/* pv-block-end:jvujl1 */}
                      {/* pv-block-start:vesrkd */}
                      <Textarea data-pv-block="vesrkd" placeholder="Optional" />
                      {/* pv-block-end:vesrkd */}
                      {/* pv-editable-zone-end:karvkw_2 */}
                    </div>
                    {/* pv-block-end:f6ckmi */}
                    {/* pv-editable-zone-end:zzgb3q */}
                  </div>
                  {/* pv-block-end:8vzh4t */}
                  {/* pv-block-start:bvrioh */}
                  <div data-pv-block="bvrioh" className="flex min-h-4 bg-background-subtle border-t border-border-default flex-row items-center gap-4 justify-end py-3 px-5">
                    {/* pv-editable-zone-start:zbrnm6 */}
                    {/* pv-block-start:f42yvj */}
                    <div data-pv-block="f42yvj" className="flex gap-2 flex-row">
                      {/* pv-editable-zone-start:mllxfs */}
                      {/* pv-block-start:o0h153 */}
                      <Button data-pv-block="o0h153" label="Cancel" variant="ghost" color="neutral" size="md" onClick={() => importDialogRef.current?.close()} />
                      {/* pv-block-end:o0h153 */}
                      {/* pv-block-start:ke0plm */}
                      <Button data-pv-block="ke0plm" rightIcon="mdi:arrow-right" label="Continue" variant="solid" color="primary" size="md" onClick={() => setStep(4)} />
                      {/* pv-block-end:ke0plm */}
                      {/* pv-editable-zone-end:mllxfs */}
                    </div>
                    {/* pv-block-end:f42yvj */}
                    {/* pv-editable-zone-end:zbrnm6 */}
                  </div>
                  {/* pv-block-end:bvrioh */}
                  {/* pv-editable-zone-end:mi0z44 */}
                </DialogWindow>
              )}
              {step === 4 && (
                <DialogWindow size="xl" data-pv-block="t4c5ob">
                  {/* pv-editable-zone-start:a760ay */}
                  {/* pv-block-start:qcnj1k */}
                  <div data-pv-block="qcnj1k" className="flex min-h-4 border-border-default flex-row items-center gap-4 justify-start border-b p-5 animate-in fade-in duration-300">
                    {/* pv-editable-zone-start:rmnciv */}
                    {/* pv-block-start:wflmtv */}
                    <div data-pv-block="wflmtv" className="flex flex-col gap-0">
                      {/* pv-editable-zone-start:ux6dfh */}
                      {/* pv-block-start:bw2j4o */}
                      <h2 data-pv-block="bw2j4o" className="text-xl font-semibold text-foreground-default">
                        Import skills to positions from a file
                      </h2>
                      {/* pv-block-end:bw2j4o */}
                      {/* pv-block-start:t23xtp */}
                      <TextParagraph data-pv-block="t23xtp" className="pt-0.5 text-sm text-foreground-secondary" typography="regular">
                        Upload your document and AI will read it and import skills to Tellent HR. <a className="text-foreground-primary hover:opacity-80 transition-opacity" href="#">Learn more</a>
                      </TextParagraph>
                      {/* pv-block-end:t23xtp */}
                      {/* pv-editable-zone-end:ux6dfh */}
                    </div>
                    {/* pv-block-end:wflmtv */}
                    {/* pv-editable-zone-end:rmnciv */}
                  </div>
                  {/* pv-block-end:qcnj1k */}
                  {/* pv-block-start:1m09ay */}
                  <div data-pv-block="1m09ay" className="flex flex-col gap-4 items-center p-5">
                    {/* pv-editable-zone-start:3gvhjd */}
                    {/* pv-block-start:uoivqm */}
                    <div data-pv-block="uoivqm" className="flex flex-col gap-2 pt-4 items-center">
                      {/* pv-editable-zone-start:n7yumz */}
                      {/* pv-block-start:v647n2 */}
                      <PreloaderSpinner data-pv-block="v647n2" size="xl" className="cursor-pointer" onClick={() => setStep(5)} />
                      {/* pv-block-end:v647n2 */}
                      {/* pv-block-start:k6zv6d */}
                      <div data-pv-block="k6zv6d" className="flex flex-col gap-0">
                        {/* pv-editable-zone-start:clgc05 */}
                        {/* pv-block-start:nzx2lw */}
                        <TextParagraph data-pv-block="nzx2lw" className="text-center" typography="bold-primary">
                          Analysing your skills...
                        </TextParagraph>
                        {/* pv-block-end:nzx2lw */}
                        {/* pv-block-start:w63ldn */}
                        <TextParagraph data-pv-block="w63ldn" className="text-center" typography="regular">
                          It will take about 20 seconds. In the meantime your can play the game below.
                        </TextParagraph>
                        {/* pv-block-end:w63ldn */}
                        {/* pv-editable-zone-end:clgc05 */}
                      </div>
                      {/* pv-block-end:k6zv6d */}
                      {/* pv-editable-zone-end:n7yumz */}
                    </div>
                    {/* pv-block-end:uoivqm */}
                    {/* pv-block-start:3zvcri */}
                    <div data-pv-block="3zvcri" className="flex flex-col min-h-32 w-full px-8 h-72">
                      {/* pv-editable-zone-start:3dgjq3 */}
                      {/* pv-block-start:sk482h */}
                      <iframe
                        data-pv-block="sk482h"
                        src="https://thriving-bombolone-1cfc2b.netlify.app/"
                        className="w-full h-full border-0"
                      />
                      {/* pv-block-end:sk482h */}
                      {/* pv-editable-zone-end:3dgjq3 */}
                    </div>
                    {/* pv-block-end:3zvcri */}
                    {/* pv-editable-zone-end:3gvhjd */}
                  </div>
                  {/* pv-block-end:1m09ay */}
                  {/* pv-block-start:1pk9cx */}
                  <div data-pv-block="1pk9cx" className="flex min-h-4 bg-background-subtle border-t border-border-default flex-row items-center gap-4 py-3 px-5 justify-start">
                    {/* pv-editable-zone-start:rmnciv_2 */}
                    {/* pv-block-start:3ez3j3 */}
                    <div data-pv-block="3ez3j3" className="flex gap-2 flex-row">
                      {/* pv-editable-zone-start:oaa0c1 */}
                      {/* pv-block-start:5hq39d */}
                      <Button data-pv-block="5hq39d" leftIcon="mdi:arrow-left" label="Back" variant="ghost" color="neutral" size="md" onClick={() => setStep(3)} />
                      {/* pv-block-end:5hq39d */}
                      {/* pv-editable-zone-end:oaa0c1 */}
                    </div>
                    {/* pv-block-end:3ez3j3 */}
                    {/* pv-editable-zone-end:rmnciv_2 */}
                  </div>
                  {/* pv-block-end:1pk9cx */}
                  {/* pv-editable-zone-end:a760ay */}
                </DialogWindow>
              )}
              {step === 5 && (
                <DialogWindow size="xl" data-pv-block="exm6jg">
                  {/* pv-editable-zone-start:gu24cs */}
                  {/* pv-block-start:jlpm2v */}
                  <div className="flex min-h-4 border-border-default flex-row items-center gap-4 justify-start border-b p-5" data-pv-block="jlpm2v">
                    {/* pv-editable-zone-start:t7nd3c */}
                    {/* pv-block-start:c39vrv */}
                    <div data-pv-block="c39vrv" className="flex flex-col gap-0">
                      {/* pv-editable-zone-start:7l5x7c */}
                      {/* pv-block-start:xedfkz */}
                      <h2 data-pv-block="xedfkz" className="text-xl font-semibold text-foreground-default">
                        Import skills to positions from a file
                      </h2>
                      {/* pv-block-end:xedfkz */}
                      {/* pv-block-start:ahfwpg */}
                      <TextParagraph className="pt-0.5 text-sm text-foreground-secondary" data-pv-block="ahfwpg" typography="regular">
                        Upload your document and AI will read it and import skills to Tellent HR. <a href="https://" target="_blank" rel="noopener noreferrer" className="text-foreground-primary hover:opacity-80 transition-opacity">Learn more</a>
                      </TextParagraph>
                      {/* pv-block-end:ahfwpg */}
                      {/* pv-editable-zone-end:7l5x7c */}
                    </div>
                    {/* pv-block-end:c39vrv */}
                    {/* pv-editable-zone-end:t7nd3c */}
                  </div>
                  {/* pv-block-end:jlpm2v */}
                  {/* pv-block-start:e5voje */}
                  <div data-pv-block="e5voje" className="flex flex-col p-5 gap-7">
                    {/* pv-editable-zone-start:hb3knb */}
                    {/* pv-block-start:8vnpes */}
                    <Stepper data-pv-block="8vnpes" fullWidth={false}>
                      {/* pv-editable-zone-start:v4z32l */}
                      {/* pv-block-start:m13np6 */}
                      <StepCircle labelPosition="right" data-pv-block="m13np6" state="done" number={1} label="Upload file" />
                      {/* pv-block-end:m13np6 */}
                      {/* pv-block-start:v16pbl */}
                      <StepperConnector data-pv-block="v16pbl" state="done" />
                      {/* pv-block-end:v16pbl */}
                      {/* pv-block-start:27weus */}
                      <StepCircle labelPosition="right" data-pv-block="27weus" state="current" number={2} label="Preview skills" />
                      {/* pv-block-end:27weus */}
                      {/* pv-block-start:0ujm7q */}
                      <StepperConnector data-pv-block="0ujm7q" state="upcoming" />
                      {/* pv-block-end:0ujm7q */}
                      {/* pv-block-start:wgqg5q */}
                      <StepCircle labelPosition="right" data-pv-block="wgqg5q" state="upcoming" number={3} label="Apply changes" />
                      {/* pv-block-end:wgqg5q */}
                      {/* pv-editable-zone-end:v4z32l */}
                    </Stepper>
                    {/* pv-block-end:8vnpes */}
                    {/* pv-block-start:vs3109 */}
                    <Container className="items-stretch" data-pv-block="vs3109">
                      {/* pv-editable-zone-start:gvn75e */}
                        {/* pv-block-start:k8x2m1 */}
                        <div data-pv-block="k8x2m1" className="rounded flex flex-col gap-2 p-5 bg-background-special-gradient-subtle">
                          {/* pv-editable-zone-start:m1n2o3 */}
                            {/* pv-block-start:p1q2r3 */}
                            <div data-pv-block="p1q2r3" className="flex gap-2 flex-row">
                              {/* pv-editable-zone-start:s3t4u5 */}
                                {/* pv-block-start:v6w7x8 */}
                                <Badge data-pv-block="v6w7x8" label="AI" color="primary" />
                                {/* pv-block-end:v6w7x8 */}
                                {/* pv-block-start:859kkk */}
                                <TextParagraph data-pv-block="859kkk" typography="bold-primary">
                                  Summary of the plan
                                </TextParagraph>
                                {/* pv-block-end:859kkk */}
                              {/* pv-editable-zone-end:s3t4u5 */}
                            </div>
                            {/* pv-block-end:p1q2r3 */}
                            {/* pv-block-start:r6s7t8 */}
                            <TextHeading data-pv-block="r6s7t8" typography="heading-lg">We are about to add 64 new skills to 32 positions</TextHeading>
                            {/* pv-block-end:r6s7t8 */}
                            {/* pv-block-start:u9v0w1 */}
                            <TextParagraph data-pv-block="u9v0w1" typography="regular">I've analysed your file to prepare a draft suggestion of skills and their proficiency level.</TextParagraph>
                            {/* pv-block-end:u9v0w1 */}
                            {/* pv-block-start:x2y3z4 */}
                            <div data-pv-block="x2y3z4" className="flex flex-col gap-0.5">
                              {/* pv-editable-zone-start:a5b6c7 */}
                                {/* pv-block-start:d8e9f0 */}
                                <div data-pv-block="d8e9f0" className="flex gap-3 items-start">
                                  <Icon iconSymbol="mdi:check" size="sm" className="text-foreground-success shrink-0 mt-0.5" />
                                  <TextParagraph typography="regular">The file looks correct, no problems found</TextParagraph>
                                </div>
                                {/* pv-block-end:d8e9f0 */}
                                {/* pv-block-start:g1h2i3 */}
                                <div data-pv-block="g1h2i3" className="flex gap-3 items-start">
                                  <Icon iconSymbol="mdi:check" size="sm" className="text-foreground-success shrink-0 mt-0.5" />
                                  <TextParagraph typography="regular">We will create 52 skills and update 12 existing skills</TextParagraph>
                                </div>
                                {/* pv-block-end:g1h2i3 */}
                                {/* pv-block-start:j4k5l6 */}
                                <div data-pv-block="j4k5l6" className="flex gap-3 items-start">
                                  <Icon iconSymbol="mdi:check" size="sm" className="text-foreground-success shrink-0 mt-0.5" />
                                  <TextParagraph typography="regular">We will create 12 new positions and assign 20 existing positions</TextParagraph>
                                </div>
                                {/* pv-block-end:j4k5l6 */}
                                {/* pv-block-start:m7n8o9 */}
                                <div data-pv-block="m7n8o9" className="flex gap-3 items-start">
                                  <Icon iconSymbol="mdi:information-outline" size="sm" className="text-foreground-info shrink-0 mt-0.5" />
                                  <TextParagraph typography="regular">Some skills from your file don't need to be created because they already existed, I will just update them</TextParagraph>
                                </div>
                                {/* pv-block-end:m7n8o9 */}
                              {/* pv-editable-zone-end:a5b6c7 */}
                            </div>
                            {/* pv-block-end:x2y3z4 */}
                          {/* pv-editable-zone-end:m1n2o3 */}
                        </div>
                        {/* pv-block-end:k8x2m1 */}
                      {/* pv-editable-zone-end:gvn75e */}
                    </Container>
                    {/* pv-block-end:vs3109 */}
                    {/* pv-block-start:hzjvx2 */}
                    <Container className="gap-2" data-pv-block="hzjvx2">
                      {/* pv-editable-zone-start:x62gm5 */}
                        {/* pv-block-start:b2c3d4 */}
                        <SuperLabel data-pv-block="b2c3d4" heading="Missing positions" secondaryText="Some positions from your file are not yet added to Tellent HR" />
                        {/* pv-block-end:b2c3d4 */}
                        {/* pv-block-start:e5f6g7 */}
                        <Card data-pv-block="e5f6g7" className="w-full">
                          {/* pv-editable-zone-start:h8i9j0 */}
                            {/* pv-block-start:k1l2m3 */}
                            <div data-pv-block="k1l2m3" className="flex flex-wrap w-full gap-1">
                              {/* pv-editable-zone-start:m1n2o3 */}
                                {/* pv-block-start:n4o5p6 */}
                                <Chip data-pv-block="n4o5p6" label="Junior Product Designer"  />
                                {/* pv-block-end:n4o5p6 */}
                                {/* pv-block-start:q7r8s9 */}
                                <Chip data-pv-block="q7r8s9" label="Senior Product Designer"  />
                                {/* pv-block-end:q7r8s9 */}
                                {/* pv-block-start:t0u1v2 */}
                                <Chip data-pv-block="t0u1v2" label="Product Designer"  />
                                {/* pv-block-end:t0u1v2 */}
                                {/* pv-block-start:w3x4y5 */}
                                <Chip data-pv-block="w3x4y5" label="Product Designer"  />
                                {/* pv-block-end:w3x4y5 */}
                                {/* pv-block-start:z6a7b8 */}
                                <Chip data-pv-block="z6a7b8" label="Product Designer"  />
                                {/* pv-block-end:z6a7b8 */}
                              {/* pv-editable-zone-end:m1n2o3 */}
                            </div>
                            {/* pv-block-end:k1l2m3 */}
                            {/* pv-block-start:c9d0e1 */}
                            <RadioGroup data-pv-block="c9d0e1" value="create" orientation="vertical" className="w-full pt-2 border-border-default mt-2">
                              {/* pv-editable-zone-start:d0e1f2 */}
                                {/* pv-block-start:f2g3h4 */}
                                <RadioItem data-pv-block="f2g3h4" value="create" primaryText="Create these positions" />
                                {/* pv-block-end:f2g3h4 */}
                                {/* pv-block-start:i5j6k7 */}
                                <RadioItem data-pv-block="i5j6k7" value="dont-create" primaryText="Don't create missing positions and don't assign them to skills" />
                                {/* pv-block-end:i5j6k7 */}
                              {/* pv-editable-zone-end:d0e1f2 */}
                            </RadioGroup>
                            {/* pv-block-end:c9d0e1 */}
                          {/* pv-editable-zone-end:h8i9j0 */}
                        </Card>
                        {/* pv-block-end:e5f6g7 */}
                      {/* pv-editable-zone-end:x62gm5 */}
                    </Container>
                    {/* pv-block-end:hzjvx2 */}
                    {/* pv-block-start:m7kral */}
                    <div  data-pv-block="m7kral" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:dy3ds8 */}
                      {/* pv-block-start:lvjh8x */}
                      <SuperLabel secondaryText="AI can make mistakes. Before applying changes, check if it correctly read your file." heading="Preview skills to import" data-pv-block="lvjh8x" primaryText="" />
                      {/* pv-block-end:lvjh8x */}
                      {/* pv-block-start:48gr18 */}
                      <Container data-pv-block="48gr18">
                        {/* pv-editable-zone-start:syk5ag */}
                          {/* pv-block-start:rp1qa2 */}
                          <div data-pv-block="rp1qa2" className="flex flex-col gap-4 w-full">
                            {skillPreviews.map(skill => (
                              <div key={skill.id} className="border border-border-default rounded overflow-hidden bg-background-elevated">
                                <div className="flex flex-col gap-2 items-start p-7">
                                  <div className="flex justify-between gap-4 w-full items-center">
                                    <div className="flex flex-col gap-1 flex-1">
                                      <TextHeading typography="heading-lg">{skill.name}</TextHeading>
                                      {skill.isExisting && (
                                        <TextParagraph typography="small" className="text-foreground-success font-semibold">This skill already existed and will be updated</TextParagraph>
                                      )}
                                      <TextParagraph typography="regular">{skill.description}</TextParagraph>
                                    </div>
                                    {collapsedSkills.has(skill.id) && (
                                      <Button variant="ghost" color="neutral" label="Expand" rightIcon="mdi:chevron-down" size="md" onClick={() => toggleSkillCollapse(skill.id)} />
                                    )}
                                  </div>
                                </div>
                                <div
                                  data-collapsed={String(collapsedSkills.has(skill.id))}
                                  className="grid [grid-template-rows:1fr] data-[collapsed=true]:[grid-template-rows:0fr] transition-all duration-600 ease-in-out"
                                >
                                  <div className="overflow-hidden flex flex-col items-stretch gap-6">
                                    <div className="px-7">
                                      <div className="inline-flex items-center px-2 py-0.5 border border-border-default text-sm text-foreground-secondary rounded-full">{skill.category}</div>
                                    </div>
                                    <div className="px-7">
                                      <div className="border-border-default rounded overflow-hidden">
                                        <div className="grid grid-cols-2 gap-4 border-b border-border-default py-2">
                                          <TextParagraph typography="semibold-primary">Proficiency levels</TextParagraph>
                                          <TextParagraph typography="semibold-primary">Positions</TextParagraph>
                                        </div>
                                        {skill.levels.map(level => (
                                          <div key={level.id} className="border-b border-border-default last:border-b-0">
                                            {editingLevelId === level.id ? (
                                              <div className="p-3 m-2 bg-background-primary-subtle rounded border border-border-strong/15 flex flex-col gap-4">
                                                <div className="flex items-center justify-between gap-4">
                                                  <TextParagraph typography="semibold-primary">Edit level</TextParagraph>
                                                  <div className="flex gap-2">
                                                    <Button variant="solid" color="primary" label="Save" size="sm" onClick={() => saveEditLevel(skill.id, level.id)} />
                                                    <Button variant="ghost" color="neutral" label="Cancel" size="sm" onClick={() => setEditingLevelId(null)} />
                                                  </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div className="flex flex-col gap-1">
                                                    <TextParagraph typography="semibold-secondary">Proficiency level name</TextParagraph>
                                                    <Input value={editFormData.name} onChange={e => setEditFormData(prev => ({ ...prev, name: e.target.value }))} />
                                                  </div>
                                                  <div className="flex flex-col gap-1">
                                                    <TextParagraph typography="semibold-secondary">Assigned positions</TextParagraph>
                                                    <MultiSelectDropdown value={editFormData.positions} onSelectionChange={val => setEditFormData(prev => ({ ...prev, positions: val }))}>
                                                      {availablePositions.map(pos => (
                                                        <MultiSelectDropdownItem key={pos} value={pos} label={pos} />
                                                      ))}
                                                    </MultiSelectDropdown>
                                                  </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                  <TextParagraph typography="semibold-secondary">Description</TextParagraph>
                                                  <Textarea value={editFormData.description} onChange={e => setEditFormData(prev => ({ ...prev, description: e.target.value }))} rows={5} />
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="grid grid-cols-2 gap-4 items-start py-3">
                                                <div className="flex flex-col gap-2">
                                                  <div className="flex items-center gap-2">
                                                    <div className="flex items-center shrink-0 gap-1">
                                                      {[1, 2, 3, 4].map(i => (
                                                        <div key={i} data-filled={String(i <= level.levelIndex)} className="rounded-full data-[filled=true]:bg-foreground-primary rounded-tr-none rounded-bl-none rounded-br-[6px] rounded-tl-[6px] w-3 h-3 bg-background-tertiary" />
                                                      ))}
                                                    </div>
                                                    <TextParagraph typography="semibold-primary">{level.name}</TextParagraph>
                                                  </div>
                                                  <TextParagraph typography="small" className="whitespace-pre-line">{level.description}</TextParagraph>
                                                </div>
                                                <div className="flex items-start justify-between gap-2">
                                                  <TextParagraph typography="regular">
                                                    {level.positions.length > 0 ? level.positions.join(', ') : '(no positions)'}
                                                  </TextParagraph>
                                                  <Button variant="outline" color="neutral" label="Edit" leftIcon="mdi:pencil" size="sm" onClick={() => startEditLevel(level)} />
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between p-7">
                                      <RadioGroup value={skill.applyAction} onValueChange={val => setSkillPreviews(prev => prev.map(s => s.id === skill.id ? { ...s, applyAction: val as 'create' | 'skip' } : s))}>
                                        <RadioItem value="create" primaryText="Create this skill and assign positions" />
                                        <RadioItem value="skip" primaryText="Don't apply this" />
                                      </RadioGroup>
                                      <Button variant="ghost" color="neutral" label={collapsedSkills.has(skill.id) ? 'Expand' : 'Collapse'} rightIcon={collapsedSkills.has(skill.id) ? 'mdi:chevron-down' : 'mdi:chevron-up'} size="md" onClick={() => toggleSkillCollapse(skill.id)} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* pv-block-end:rp1qa2 */}
                        {/* pv-editable-zone-end:syk5ag */}
                      </Container>
                      {/* pv-block-end:48gr18 */}
                      {/* pv-editable-zone-end:dy3ds8 */}
                    </div>
                    {/* pv-block-end:m7kral */}
                    {/* pv-editable-zone-end:hb3knb */}
                  </div>
                  {/* pv-block-end:e5voje */}
                  {/* pv-block-start:mbv43u */}
                  <div className="flex min-h-4 bg-background-subtle border-t border-border-default flex-row items-center gap-4 py-3 px-5 justify-between" data-pv-block="mbv43u">
                    {/* pv-editable-zone-start:2mi6w3 */}
                    {/* pv-block-start:x4y4gr */}
                    <Button leftIcon="mdi:arrow-back" data-pv-block="x4y4gr" label="Back" variant="ghost" color="neutral" size="md" onClick={() => setStep(4)} />
                    {/* pv-block-end:x4y4gr */}
                    {/* pv-block-start:gh1jlr */}
                    <div data-pv-block="gh1jlr" className="flex gap-2 flex-row">
                      {/* pv-editable-zone-start:2x30wg */}
                      {/* pv-block-start:t8stw0 */}
                      <Button leftIcon="mdi:check" data-pv-block="t8stw0" label="Apply changes" variant="solid" color="primary" size="md" onClick={() => setStep(6)} />
                      {/* pv-block-end:t8stw0 */}
                      {/* pv-editable-zone-end:2x30wg */}
                    </div>
                    {/* pv-block-end:gh1jlr */}
                    {/* pv-editable-zone-end:2mi6w3 */}
                  </div>
                  {/* pv-block-end:mbv43u */}
                  {/* pv-editable-zone-end:gu24cs */}
                </DialogWindow>
              )}
              {step === 6 && (
                <DialogWindow size="xl" data-pv-block="pamzt2">
                  {/* pv-editable-zone-start:qwbcbc */}
                  {/* pv-block-start:t9kscq */}
                  <div className="flex min-h-4 border-border-default flex-row items-center gap-4 justify-start border-b p-5" data-pv-block="t9kscq">
                    {/* pv-editable-zone-start:38zx36 */}
                    {/* pv-block-start:3nf5lh */}
                    <div data-pv-block="3nf5lh" className="flex flex-col gap-0">
                      {/* pv-editable-zone-start:2s35ui */}
                      {/* pv-block-start:8fber7 */}
                      <h2 data-pv-block="8fber7" className="text-xl font-semibold text-foreground-default">
                        Import skills to positions from a file
                      </h2>
                      {/* pv-block-end:8fber7 */}
                      {/* pv-block-start:hhaij0 */}
                      <TextParagraph className="pt-0.5 text-sm text-foreground-secondary" data-pv-block="hhaij0" typography="regular">
                        Upload your document and AI will read it and import skills to Tellent HR. <a className="text-foreground-primary hover:opacity-80 transition-opacity" href="https://" target="_blank" rel="noopener noreferrer">Learn more</a>
                      </TextParagraph>
                      {/* pv-block-end:hhaij0 */}
                      {/* pv-editable-zone-end:2s35ui */}
                    </div>
                    {/* pv-block-end:3nf5lh */}
                    {/* pv-editable-zone-end:38zx36 */}
                  </div>
                  {/* pv-block-end:t9kscq */}
                  {/* pv-block-start:12g8us */}
                  <div data-pv-block="12g8us" className="flex flex-col gap-4 items-center p-5">
                    {/* pv-editable-zone-start:1lwlgc */}
                    {/* pv-block-start:ckg5l1 */}
                    <div data-pv-block="ckg5l1" className="flex flex-col gap-2 pt-4 justify-center min-h-72">
                      {/* pv-editable-zone-start:o1rs2a */}
                      {/* pv-block-start:gerekd */}
                      <PreloaderSpinner data-pv-block="gerekd" size="xl" className="cursor-pointer" onClick={() => setStep(7)} />
                      {/* pv-block-end:gerekd */}
                      {/* pv-block-start:zb0716 */}
                      <div data-pv-block="zb0716" className="flex flex-col gap-0">
                        {/* pv-editable-zone-start:xbptpy */}
                        {/* pv-block-start:04acs2 */}
                        <TextParagraph className="text-center" data-pv-block="04acs2" typography="bold-primary">
                          Creating skills and assigning positions...
                        </TextParagraph>
                        {/* pv-block-end:04acs2 */}
                        {/* pv-block-start:icz2gj */}
                        <TextParagraph className="text-center" data-pv-block="icz2gj" typography="regular">
                          Please wait...
                        </TextParagraph>
                        {/* pv-block-end:icz2gj */}
                        {/* pv-editable-zone-end:xbptpy */}
                      </div>
                      {/* pv-block-end:zb0716 */}
                      {/* pv-editable-zone-end:o1rs2a */}
                    </div>
                    {/* pv-block-end:ckg5l1 */}
                    {/* pv-editable-zone-end:1lwlgc */}
                  </div>
                  {/* pv-block-end:12g8us */}
                  {/* pv-editable-zone-end:qwbcbc */}
                </DialogWindow>
              )}
              {step === 7 && (
                <DialogWindow size="lg" data-pv-block="iic05m">
                  {/* pv-editable-zone-start:lgeu7v */}
                  {/* pv-block-start:6sjda0 */}
                  <div data-pv-block="6sjda0" className="flex flex-col items-center py-16 px-5 gap-8">
                    {/* pv-editable-zone-start:q2vvul */}
                    {/* pv-block-start:dce4pv */}
                    <div className="flex flex-col flex-none bg-contain bg-center bg-no-repeat w-32 bg-[url('/src/images/from-protovibe/success-icon.svg')] aspect-[1/1]" data-pv-block="dce4pv">
                      {/* pv-editable-zone-start:8zn1i0 */}
                      {/* pv-editable-zone-end:8zn1i0 */}
                    </div>
                    {/* pv-block-end:dce4pv */}
                    {/* pv-block-start:nosa3g */}
                    <div data-pv-block="nosa3g" className="flex flex-col gap-0">
                      {/* pv-editable-zone-start:gm5zy0 */}
                      {/* pv-block-start:fcg1vl */}
                      <TextHeading className="text-center" data-pv-block="fcg1vl" typography="heading-lg">
                        Skills added!
                      </TextHeading>
                      {/* pv-block-end:fcg1vl */}
                      {/* pv-block-start:hiealy */}
                      <TextParagraph className="text-center" data-pv-block="hiealy" typography="secondary">
                        Succesfully imported 32 skills to 45 positions.
                      </TextParagraph>
                      {/* pv-block-end:hiealy */}
                      {/* pv-editable-zone-end:gm5zy0 */}
                    </div>
                    {/* pv-block-end:nosa3g */}
                    {/* pv-block-start:g26kql */}
                    <div data-pv-block="g26kql" className="flex flex-col gap-2 min-w-48">
                      {/* pv-editable-zone-start:66mq54 */}
                      {/* pv-block-start:y0z2d1 */}
                      <Button leftIcon="mdi:external-link" data-pv-block="y0z2d1" label="Give feedback" variant="outline" color="neutral" size="md" />
                      {/* pv-block-end:y0z2d1 */}
                      {/* pv-block-start:aviqc7 */}
                      <Button data-pv-block="aviqc7" label="Finish and close" variant="solid" color="primary" size="md" onClick={() => importDialogRef.current?.close()} />
                      {/* pv-block-end:aviqc7 */}
                      {/* pv-editable-zone-end:66mq54 */}
                    </div>
                    {/* pv-block-end:g26kql */}
                    {/* pv-editable-zone-end:q2vvul */}
                  </div>
                  {/* pv-block-end:6sjda0 */}
                  {/* pv-editable-zone-end:lgeu7v */}
                </DialogWindow>
              )}
            </>
          )}
          {/* pv-editable-zone-end:sk9901 */}
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
          <div className="flex items-center gap-1">
            <Button iconOnly variant="ghost" color="neutral"><Icon className="text-foreground-default" iconSymbol="mdi:help-circle-outline" size="md" /></Button>
            <Button iconOnly variant="ghost" color="neutral"><Icon className="text-foreground-default" iconSymbol="mdi:cog-outline" size="md" /></Button>
            <Button iconOnly variant="ghost" color="neutral"><Icon className="text-foreground-default" iconSymbol="material-symbols:inbox" size="md" /></Button>
            <div className="relative">
              <Button iconOnly variant="ghost" color="neutral"><Icon className="text-foreground-default" iconSymbol="mdi:bell-outline" size="md" /></Button>
              <span className="absolute top-2 right-2 w-2 h-2 bg-background-destructive rounded-full border border-background-default"></span>
            </div>

            {/* User Avatar Dropdown */}
            <PopoverTrigger placement="bottom" align="right">
              <Button iconOnly variant="ghost" color="neutral">
                <Avatar initials="JD" bgColor="default" size="sm" />
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