import React, { useState } from 'react';
import { useStore } from '@/store';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { InfoBoxBanner } from '@/components/ui/info-box-banner';
import { Card } from '@/components/ui/card';
import { TextBlock } from '@/components/ui/text-block';
import { Tabs } from '@/components/ui/tabs';
import { TabItem } from '@/components/ui/tab-item';
import { VerticalTabs } from '@/components/ui/vertical-tabs';
import { VerticalTabItem } from '@/components/ui/vertical-tab-item';
import { DialogTrigger } from '@/components/ui/dialog-trigger';
import { DialogOverlay } from '@/components/ui/dialog-overlay';
import { DialogWindow } from '@/components/ui/dialog-window';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { PopoverTrigger } from '@/components/ui/popover-trigger';
import { DropdownList } from '@/components/ui/dropdown-list';
import { DropdownItem } from '@/components/ui/dropdown-item';
import { DropdownSeparator } from '@/components/ui/dropdown-separator';

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
    <div className="flex flex-col animate-in fade-in duration-300 gap-4">
      {/* pv-editable-zone-start:d8z9a1 */}
        
        {/* pv-block-start:i3b4c5 */}
        <InfoBoxBanner
          data-pv-block="i3b4c5"
          heading="Welcome back, HR Admin!"
          secondaryText="You have 4 pending time-off requests and 2 upcoming performance reviews to manage."
          color="primary"
          icon="Sparkles"
          primaryActionLabel="Review Requests"
          actionsLayout="right"
        />
        {/* pv-block-end:i3b4c5 */}
        
        {/* pv-block-start:g6h7j8 */}
        <div data-pv-block="g6h7j8" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* pv-editable-zone-start:w2x3y4 */}

            {/* pv-block-start:z5a6b7 */}
            <Card data-pv-block="z5a6b7" variant="bordered" shadow="sm" className="bg-background-default">
              {/* pv-editable-zone-start:c8d9e1 */}
                {/* pv-block-start:f2g3h4 */}
                <div data-pv-block="f2g3h4" className="flex items-center gap-3 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:i5j6k7 */}
                    {/* pv-block-start:l8m9n1 */}
                    <Icon data-pv-block="l8m9n1" name="Users" size="sm" />
                    {/* pv-block-end:l8m9n1 */}
                    {/* pv-block-start:o2p3q4 */}
                    <TextBlock data-pv-block="o2p3q4" typography="all-caps" className="uppercase tracking-wider">Total Headcount</TextBlock>
                    {/* pv-block-end:o2p3q4 */}
                  {/* pv-editable-zone-end:i5j6k7 */}
                </div>
                {/* pv-block-end:f2g3h4 */}
                {/* pv-block-start:r5s6t7 */}
                <TextBlock data-pv-block="r5s6t7" typography="heading-xxl" className="mb-2">142</TextBlock>
                {/* pv-block-end:r5s6t7 */}
                {/* pv-block-start:u8v9w1 */}
                <Badge data-pv-block="u8v9w1" label="+12% vs last year" color="success" prefixIcon="TrendingUp" />
                {/* pv-block-end:u8v9w1 */}
              {/* pv-editable-zone-end:c8d9e1 */}
            </Card>
            {/* pv-block-end:z5a6b7 */}

            {/* pv-block-start:x2y3z4 */}
            <Card data-pv-block="x2y3z4" variant="bordered" shadow="sm" className="bg-background-default">
              {/* pv-editable-zone-start:a5b6c7 */}
                {/* pv-block-start:d8e9f1 */}
                <div data-pv-block="d8e9f1" className="flex items-center gap-3 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:g2h3i4 */}
                    {/* pv-block-start:j5k6l7 */}
                    <Icon data-pv-block="j5k6l7" name="Briefcase" size="sm" />
                    {/* pv-block-end:j5k6l7 */}
                    {/* pv-block-start:m8n9o1 */}
                    <TextBlock data-pv-block="m8n9o1" typography="all-caps" className="uppercase tracking-wider">Open Roles</TextBlock>
                    {/* pv-block-end:m8n9o1 */}
                  {/* pv-editable-zone-end:g2h3i4 */}
                </div>
                {/* pv-block-end:d8e9f1 */}
                {/* pv-block-start:p2q3r4 */}
                <TextBlock data-pv-block="p2q3r4" typography="heading-xxl" className="mb-2">18</TextBlock>
                {/* pv-block-end:p2q3r4 */}
                {/* pv-block-start:s5t6u7 */}
                <Badge data-pv-block="s5t6u7" label="4 critical to fill" color="warning" prefixIcon="AlertCircle" />
                {/* pv-block-end:s5t6u7 */}
              {/* pv-editable-zone-end:a5b6c7 */}
            </Card>
            {/* pv-block-end:x2y3z4 */}

            {/* pv-block-start:v8w9x1 */}
            <Card data-pv-block="v8w9x1" variant="bordered" shadow="sm" className="bg-background-default">
              {/* pv-editable-zone-start:y2z3a4 */}
                {/* pv-block-start:b5c6d7 */}
                <div data-pv-block="b5c6d7" className="flex items-center gap-3 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:e8f9g1 */}
                    {/* pv-block-start:h2i3j4 */}
                    <Icon data-pv-block="h2i3j4" name="CalendarHeart" size="sm" />
                    {/* pv-block-end:h2i3j4 */}
                    {/* pv-block-start:k5l6m7 */}
                    <TextBlock data-pv-block="k5l6m7" typography="all-caps" className="uppercase tracking-wider">On Leave</TextBlock>
                    {/* pv-block-end:k5l6m7 */}
                  {/* pv-editable-zone-end:e8f9g1 */}
                </div>
                {/* pv-block-end:b5c6d7 */}
                {/* pv-block-start:n8o9p1 */}
                <TextBlock data-pv-block="n8o9p1" typography="heading-xxl" className="mb-2">6</TextBlock>
                {/* pv-block-end:n8o9p1 */}
                {/* pv-block-start:q2r3s4 */}
                <Badge data-pv-block="q2r3s4" label="2 returning this week" color="info" prefixIcon="Clock" />
                {/* pv-block-end:q2r3s4 */}
              {/* pv-editable-zone-end:y2z3a4 */}
            </Card>
            {/* pv-block-end:v8w9x1 */}

          {/* pv-editable-zone-end:w2x3y4 */}
        </div>
        {/* pv-block-end:g6h7j8 */}
        
      {/* pv-editable-zone-end:d8z9a1 */}
    </div>
  );
}

function EmployeesPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* pv-editable-zone-start:e1z2x3 */}
        
        {/* pv-block-start:h4e5k6 */}
        <div data-pv-block="h4e5k6" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* pv-editable-zone-start:t5u6v7 */}
            {/* pv-block-start:w8x9y1 */}
            <Input data-pv-block="w8x9y1" placeholder="Search employees by name or role..." prefixIcon="Search" className="max-w-md bg-background-default" />
            {/* pv-block-end:w8x9y1 */}
            {/* pv-block-start:z2a3b4 */}
            <div data-pv-block="z2a3b4" className="flex gap-2">
              <Button label="Export CSV" variant="outline" color="neutral" leftIcon="Download" />
              <Button label="Add Employee" variant="solid" color="primary" leftIcon="Plus" />
            </div>
            {/* pv-block-end:z2a3b4 */}
          {/* pv-editable-zone-end:t5u6v7 */}
        </div>
        {/* pv-block-end:h4e5k6 */}

        {/* pv-block-start:t7m8n9 */}
        <div data-pv-block="t7m8n9" className="flex flex-col border border-border-default rounded-lg bg-background-default overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="flex items-center px-6 py-3 border-b border-border-default bg-background-default">
            <TextBlock typography="small" className="flex-1 font-semibold uppercase tracking-wider">Employee</TextBlock>
            <TextBlock typography="small" className="w-48 font-semibold uppercase tracking-wider hidden md:block">Role</TextBlock>
            <TextBlock typography="small" className="w-40 font-semibold uppercase tracking-wider hidden lg:block">Department</TextBlock>
            <TextBlock typography="small" className="w-32 font-semibold uppercase tracking-wider">Status</TextBlock>
            <div className="w-10"></div>
          </div>

          {/* Table Body - Dynamic mapping omits pv-block tags */}
          <div className="flex flex-col divide-y divide-border-default">
            {mockEmployees.map(emp => (
              <DialogTrigger key={emp.id} closeOnEscape>
                <div className="flex items-center px-6 py-4 hover:bg-background-secondary cursor-pointer transition-colors group grow">
                  <div className="flex-1 flex items-center gap-4">
                    <Avatar initials={emp.name} size="md" bgColor="primary" />
                    <div className="flex flex-col">
                      <TextBlock typography="heading-sm" className="group-hover:text-primary transition-colors">{emp.name}</TextBlock>
                      <TextBlock typography="small">{emp.email}</TextBlock>
                    </div>
                  </div>
                  <div className="w-48 hidden md:block">
                    <TextBlock typography="regular" className="truncate">{emp.role}</TextBlock>
                  </div>
                  <div className="w-40 hidden lg:block">
                    <TextBlock typography="regular">{emp.department}</TextBlock>
                  </div>
                  <div className="w-32">
                    <Badge 
                      label={emp.status} 
                      color={emp.status === 'Active' ? 'success' : emp.status === 'On Leave' ? 'warning' : 'neutral'} 
                    />
                  </div>
                  <div className="w-10 text-right">
                    <Icon name="ChevronRight" size="sm" className="text-foreground-tertiary group-hover:text-primary" />
                  </div>
                </div>

                {/* Detail Dialog */}
                <DialogOverlay>
                  <DialogWindow size="lg" className="bg-background-default">
                    <EmployeeDetailsDialog emp={emp} />
                  </DialogWindow>
                </DialogOverlay>
              </DialogTrigger>
            ))}
          </div>
        </div>
        {/* pv-block-end:t7m8n9 */}
        
      {/* pv-editable-zone-end:e1z2x3 */}
    </div>
  );
}

function PositionsPage() {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      {/* pv-editable-zone-start:p1z2q3 */}
        
        {/* pv-block-start:h4p5w6 */}
        <div data-pv-block="h4p5w6" className="flex justify-between items-center mb-2">
          {/* pv-editable-zone-start:e1f2g3 */}
            {/* pv-block-start:h3i4j5 */}
            <TextBlock data-pv-block="h3i4j5" typography="heading-md">Open Positions</TextBlock>
            {/* pv-block-end:h3i4j5 */}
            {/* pv-block-start:k6l7m8 */}
            <Button data-pv-block="k6l7m8" label="Create Requisition" leftIcon="Plus"  color="primary" />
            {/* pv-block-end:k6l7m8 */}
          {/* pv-editable-zone-end:e1f2g3 */}
        </div>
        {/* pv-block-end:h4p5w6 */}
        
        {mockPositions.map(pos => (
          <Card key={pos.id} shadow="sm" className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full hover:border-primary cursor-pointer group bg-background-default">
            {/* pv-editable-zone-start:f2a3b4 */}
              {/* pv-block-start:c5d6e7 */}
              <div data-pv-block="c5d6e7" className="flex items-center gap-4">
                {/* pv-editable-zone-start:w9x1y2 */}
                  {/* pv-block-start:z3a4b5 */}
                  <div data-pv-block="z3a4b5" className="w-12 h-12 rounded-lg bg-background-secondary flex items-center justify-center text-foreground-secondary">
                    <Icon name="Briefcase" size="md" />
                  </div>
                  {/* pv-block-end:z3a4b5 */}
                  {/* pv-block-start:c6d7e8 */}
                  <div data-pv-block="c6d7e8">
                    <TextBlock typography="heading-sm" className="group-hover:text-primary transition-colors">{pos.title}</TextBlock>
                    <div className="flex items-center gap-3 mt-1">
                      <TextBlock typography="small">{pos.department}</TextBlock>
                      <span className="text-foreground-tertiary text-xs">•</span>
                      <TextBlock typography="small">{pos.location}</TextBlock>
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
                  <Button data-pv-block="o9p1q2" iconOnly variant="ghost" leftIcon="ChevronRight" />
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
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      {/* pv-editable-zone-start:d1z2r3 */}
      
        {/* pv-block-start:h4d5v6 */}
        <div data-pv-block="h4d5v6" className="flex justify-between items-center mb-2">
          {/* pv-editable-zone-start:n9o1p2 */}
            {/* pv-block-start:q3r4s5 */}
            <TextBlock data-pv-block="q3r4s5" typography="heading-md">Departments</TextBlock>
            {/* pv-block-end:q3r4s5 */}
            {/* pv-block-start:t6u7v8 */}
            <Button data-pv-block="t6u7v8" label="Add Department" leftIcon="Plus"  color="primary" />
            {/* pv-block-end:t6u7v8 */}
          {/* pv-editable-zone-end:n9o1p2 */}
        </div>
        {/* pv-block-end:h4d5v6 */}
        
        {mockDepartments.map(dept => (
          <Card key={dept.id} shadow="sm" className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full hover:border-primary cursor-pointer group bg-background-default">
            {/* pv-editable-zone-start:m2n3p4 */}
              {/* pv-block-start:q5r6s7 */}
              <div data-pv-block="q5r6s7" className="flex items-center gap-4">
                {/* pv-editable-zone-start:r3s4t5 */}
                  {/* pv-block-start:u6v7w8 */}
                  <Avatar data-pv-block="u6v7w8" icon="Building2" size="lg" bgColor="info" />
                  {/* pv-block-end:u6v7w8 */}
                  {/* pv-block-start:x9y1z2 */}
                  <div data-pv-block="x9y1z2">
                    <TextBlock typography="heading-sm" className="group-hover:text-primary transition-colors">{dept.name}</TextBlock>
                    <TextBlock typography="small" className="mt-1">Manager: {dept.manager}</TextBlock>
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
                    <TextBlock typography="heading-sm">{dept.headcount}</TextBlock>
                    <TextBlock typography="small">Employees</TextBlock>
                  </div>
                  {/* pv-block-end:d6e7f8 */}
                  {/* pv-block-start:j3k4l5 */}
                  <Button data-pv-block="j3k4l5" iconOnly variant="ghost" leftIcon="ChevronRight" />
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
            <TextBlock typography="heading-lg">{emp.name}</TextBlock>
            <TextBlock typography="secondary">{emp.role}</TextBlock>
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
          leftIcon={isEditing ? "Save" : "Edit2"}
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
      <TextBlock typography="all-caps">{label}</TextBlock>
      
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
          <TextBlock typography="regular" className="font-medium">{value}</TextBlock>
        </div>
      )}
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
      {/* Sidebar */}
      <div className="w-64 border-r border-border-default bg-background-secondary flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border-default gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <Icon name="Hexagon" size="sm" />
          </div>
          <TextBlock typography="heading-sm" className="tracking-tight">CoreHR</TextBlock>
        </div>
        
        <div className="p-4 flex-1">
          <TextBlock typography="all-caps" className="mb-3 px-3">Main Menu</TextBlock>
          <VerticalTabs value={currentPath} onValueChange={navigate}>
            <VerticalTabItem value="/dashboard" label="Dashboard" prefixIcon="LayoutDashboard" />
            <VerticalTabItem value="/employees" label="Employees" prefixIcon="Users" />
            <VerticalTabItem value="/positions" label="Positions" prefixIcon="Briefcase" />
            <VerticalTabItem value="/departments" label="Departments" prefixIcon="Building2" />
          </VerticalTabs>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-border-default flex items-center justify-between px-8 bg-background-default shrink-0">
          <TextBlock typography="heading-lg">{pageTitle}</TextBlock>
          
          <div className="flex items-center gap-3">
            <div className="relative mr-2">
              <Button iconOnly variant="ghost" color="neutral" size="md" leftIcon="Bell" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border border-background-default"></span>
            </div>
            
            {/* User Avatar Dropdown */}
            <PopoverTrigger placement="bottom" align="right">
              <button className="flex items-center gap-2 hover:bg-background-secondary p-1.5 pr-3 rounded-full border border-transparent hover:border-border-default transition-all focus:outline-none">
                <Avatar initials="JD" bgColor="info" size="sm" />
                <TextBlock typography="small" className="font-medium hidden sm:block">Jane Doe</TextBlock>
                <Icon name="ChevronDown" size="sm" className="text-foreground-tertiary hidden sm:block" />
              </button>
              
              <DropdownList width="sm" className="mt-1">
                <DropdownItem label="Profile" prefixIcon="User" />
                <DropdownItem label="Account Settings" prefixIcon="Settings" />
                <DropdownItem label="Help & Support" prefixIcon="HelpCircle" />
                <DropdownSeparator />
                <DropdownItem label="Sign out" prefixIcon="LogOut" destructive />
              </DropdownList>
            </PopoverTrigger>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-background-default">
          <div className="max-w-6xl mx-auto">
            {currentPath === '/dashboard' && <DashboardPage />}
            {currentPath === '/employees' && <EmployeesPage />}
            {currentPath === '/positions' && <PositionsPage />}
            {currentPath === '/departments' && <DepartmentsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}