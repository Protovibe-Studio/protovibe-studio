import React, { useState, useEffect } from 'react';
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
      {/* pv-editable-zone-start */}
        
        {/* pv-block-start */}
        <InfoBoxBanner
          data-pv-block=""
          heading="Welcome back, HR Admin!"
          secondaryText="You have 4 pending time-off requests and 2 upcoming performance reviews to manage."
          color="primary"
          icon="Sparkles"
          primaryActionLabel="Review Requests"
          actionsLayout="right"
        />
        {/* pv-block-end */}
        
        {/* pv-block-start */}
        <div data-pv-block="" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="bordered" shadow="sm">
            <div className="flex items-center gap-3 mb-2 text-foreground-secondary">
              <Icon name="Users" size="sm" />
              <TextBlock typography="small" className="font-semibold uppercase tracking-wider">Total Headcount</TextBlock>
            </div>
            <TextBlock typography="heading-xxl" className="mb-2">142</TextBlock>
            <Badge label="+12% vs last year" color="success" prefixIcon="TrendingUp" />
          </Card>

          <Card variant="bordered" shadow="sm">
            <div className="flex items-center gap-3 mb-2 text-foreground-secondary">
              <Icon name="Briefcase" size="sm" />
              <TextBlock typography="small" className="font-semibold uppercase tracking-wider">Open Roles</TextBlock>
            </div>
            <TextBlock typography="heading-xxl" className="mb-2">18</TextBlock>
            <Badge label="4 critical to fill" color="warning" prefixIcon="AlertCircle" />
          </Card>

          <Card variant="bordered" shadow="sm">
            <div className="flex items-center gap-3 mb-2 text-foreground-secondary">
              <Icon name="CalendarHeart" size="sm" />
              <TextBlock typography="small" className="font-semibold uppercase tracking-wider">On Leave</TextBlock>
            </div>
            <TextBlock typography="heading-xxl" className="mb-2">6</TextBlock>
            <Badge label="2 returning this week" color="info" prefixIcon="Clock" />
          </Card>
        </div>
        {/* pv-block-end */}
        
      {/* pv-editable-zone-end */}
    </div>
  );
}

function EmployeesPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* pv-editable-zone-start */}
        
        {/* pv-block-start */}
        <div data-pv-block="" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Input placeholder="Search employees by name or role..." prefixIcon="Search" className="max-w-md" />
          <div className="flex gap-2">
            <Button label="Export CSV" variant="outline" color="neutral" leftIcon="Download" />
            <Button label="Add Employee" variant="solid" color="primary" leftIcon="Plus" />
          </div>
        </div>
        {/* pv-block-end */}

        {/* pv-block-start */}
        <div data-pv-block="" className="flex flex-col border border-border-default rounded-lg bg-background-default overflow-hidden shadow-sm">
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
                  <DialogWindow size="lg">
                    <EmployeeDetailsDialog emp={emp} />
                  </DialogWindow>
                </DialogOverlay>
              </DialogTrigger>
            ))}
          </div>
        </div>
        {/* pv-block-end */}
        
      {/* pv-editable-zone-end */}
    </div>
  );
}

function PositionsPage() {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      {/* pv-editable-zone-start */}
        
        {/* pv-block-start */}
        <div data-pv-block="" className="flex justify-between items-center mb-2">
          <TextBlock typography="heading-md">Open Positions</TextBlock>
          <Button label="Create Requisition" leftIcon="Plus" size="sm" color="primary" />
        </div>
        {/* pv-block-end */}
        
        {/* Dynamic mapping omits pv-block tags */}
        {mockPositions.map(pos => (
          <Card key={pos.id} shadow="sm" className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full hover:border-primary cursor-pointer group bg-background-default">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-background-secondary flex items-center justify-center text-foreground-secondary">
                <Icon name="Briefcase" size="md" />
              </div>
              <div>
                <TextBlock typography="heading-sm" className="group-hover:text-primary transition-colors">{pos.title}</TextBlock>
                <div className="flex items-center gap-3 mt-1">
                  <TextBlock typography="small">{pos.department}</TextBlock>
                  <span className="text-foreground-tertiary text-xs">•</span>
                  <TextBlock typography="small">{pos.location}</TextBlock>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-8 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex flex-col items-start sm:items-end">
                <TextBlock typography="heading-sm">{pos.applicants}</TextBlock>
                <TextBlock typography="small">Applicants</TextBlock>
              </div>
              <Badge label={pos.status} color={pos.status === 'Open' ? 'success' : 'info'} />
              <Button iconOnly variant="ghost" leftIcon="ChevronRight" />
            </div>
          </Card>
        ))}
        
      {/* pv-editable-zone-end */}
    </div>
  );
}

function DepartmentsPage() {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      {/* pv-editable-zone-start */}
      
        {/* pv-block-start */}
        <div data-pv-block="" className="flex justify-between items-center mb-2">
          <TextBlock typography="heading-md">Departments</TextBlock>
          <Button label="Add Department" leftIcon="Plus" size="sm" color="primary" />
        </div>
        {/* pv-block-end */}
        
        {/* Dynamic mapping omits pv-block tags */}
        {mockDepartments.map(dept => (
          <Card key={dept.id} shadow="sm" className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full hover:border-primary cursor-pointer group bg-background-default">
            <div className="flex items-center gap-4">
              <Avatar icon="Building2" size="lg" bgColor="info" />
              <div>
                <TextBlock typography="heading-sm" className="group-hover:text-primary transition-colors">{dept.name}</TextBlock>
                <TextBlock typography="small" className="mt-1">Manager: {dept.manager}</TextBlock>
              </div>
            </div>
            <div className="flex items-center gap-8 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex flex-col items-start sm:items-end">
                <TextBlock typography="heading-sm">{dept.headcount}</TextBlock>
                <TextBlock typography="small">Employees</TextBlock>
              </div>
              <div className="flex flex-col items-start sm:items-end">
                <Badge label={dept.budget} color={dept.budget === 'At Risk' ? 'warning' : 'success'} />
              </div>
              <Button iconOnly variant="ghost" leftIcon="ChevronRight" />
            </div>
          </Card>
        ))}
        
      {/* pv-editable-zone-end */}
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
            e.stopPropagation(); // prevent dialog from closing if clicking weirdly
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
          <Input defaultValue={value} type={type} />
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
  
  // Enforce default routing if on the root path
  useEffect(() => {
    if (!state.path || state.path === '/' || state.path === '/index.html') {
      navigate('/dashboard');
    }
  }, [state.path, navigate]);
  
  // Normalize root path to dashboard robustly to prevent null reads before effect applies
  const currentPath = (!state.path || state.path === '/' || state.path === '/index.html') ? '/dashboard' : state.path;

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