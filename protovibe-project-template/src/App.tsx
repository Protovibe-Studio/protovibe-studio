import { useStore } from '@/store';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TextHeading } from '@/components/ui/text-heading';
import { TextParagraph } from '@/components/ui/text-paragraph';
import { VerticalTabs } from '@/components/ui/vertical-tabs';
import { VerticalTabItem } from '@/components/ui/vertical-tab-item';
import { PopoverTrigger } from '@/components/ui/popover-trigger';
import { DropdownList } from '@/components/ui/dropdown-list';
import { DropdownItem } from '@/components/ui/dropdown-item';
import { DropdownSeparator } from '@/components/ui/dropdown-separator';
import { DropdownGroupLabel } from '@/components/ui/dropdown-group-label';
import { TooltipProvider } from '@/components/ui/tooltip-provider';
import { useThemeManager } from '@/theme-management/useThemeManager';

import { DashboardPage } from '@/pages/DashboardPage';
import { MinionsPage } from '@/pages/MinionsPage';
import { SchemesPage } from '@/pages/SchemesPage';
import { KPIsPage } from '@/pages/KPIsPage';
import { ExecutiveRetreatsPage } from '@/pages/ExecutiveRetreatsPage';
import { SurveillancePage } from '@/pages/SurveillancePage';

export default function App() {
  const { state, navigate } = useStore();
  const currentPath = state.path;
  const { themePreference, updateTheme } = useThemeManager();

  return (
    <div className="flex h-screen bg-background-default text-foreground-default font-sans overflow-hidden">
      <TooltipProvider />
      {/* Sidebar */}
      <div className="w-64 flex flex-col shrink-0 bg-background-subtle">
        <div className="h-16 flex items-center px-6 gap-3">
          <div className="w-8 h-8 rounded-lg bg-background-destructive flex items-center justify-center text-foreground-on-primary shadow-sm">
            <Icon iconSymbol="mdi:skull-crossbones" size="sm" />
          </div>
          <TextHeading typography="heading-sm" className="tracking-tight">EvilCorp HQ</TextHeading>
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
          <div>
            <VerticalTabs value={currentPath} onValueChange={navigate}>
              <VerticalTabItem value="/profile" label="Dr. Evil" prefixIcon="mdi:account-circle-outline" />
            </VerticalTabs>
          </div>

          <div>
            <TextParagraph typography="semibold-secondary" className="mb-1 text-xs px-2">Operations</TextParagraph>
            <VerticalTabs value={currentPath} onValueChange={navigate}>
              <VerticalTabItem value="/dashboard" label="Home" prefixIcon="mdi:home" />
              <VerticalTabItem value="/minions" label="Minions" prefixIcon="mdi:account-hard-hat" />
              <VerticalTabItem value="/schemes" label="Schemes" prefixIcon="game-icons:evil-love" />
              <VerticalTabItem value="/kpis" label="KPIs" prefixIcon="mdi:chart-donut" />
              <VerticalTabItem value="/retreats" label="Executive Retreats" prefixIcon="mdi:beach" />
              <VerticalTabItem value="/surveillance" label="Surveillance" prefixIcon="mdi:cctv" />
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
                    <span className="text-sm font-medium text-foreground-default">Dr. Evil</span>
                    <span className="text-xs text-foreground-tertiary">dr.evil@evilcorp.com</span>
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
                <DropdownGroupLabel label="Appearance" />
                <DropdownItem
                  label="Auto theme"
                  prefixIcon="mdi:theme-light-dark"
                  selected={themePreference === 'auto'}
                  onClick={() => updateTheme('auto')}
                />
                <DropdownItem
                  label="Light"
                  prefixIcon="mdi:white-balance-sunny"
                  selected={themePreference === 'light'}
                  onClick={() => updateTheme('light')}
                />
                <DropdownItem
                  label="Dark"
                  prefixIcon="mdi:weather-night"
                  selected={themePreference === 'dark'}
                  onClick={() => updateTheme('dark')}
                />
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
            {currentPath === '/minions' && <MinionsPage />}
            {currentPath === '/schemes' && <SchemesPage />}
            {currentPath === '/kpis' && <KPIsPage />}
            {currentPath === '/retreats' && <ExecutiveRetreatsPage />}
            {currentPath === '/surveillance' && <SurveillancePage />}
          </div>
        </main>
      </div>
    </div>
  );
}
