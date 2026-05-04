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
      {/* pv-block-start:sb1001 */}
      <div data-pv-block="sb1001" className="w-64 flex flex-col shrink-0 border-border-default bg-background-elevated">
        {/* pv-editable-zone-start:szn101 */}
          {/* pv-block-start:br2002 */}
          <div data-pv-block="br2002" className="flex items-center gap-3 border-b border-border-default h-12 pl-4 pr-6">
            {/* pv-editable-zone-start:bzn202 */}
              {/* pv-block-start:smg8v8 */}
              <div className="flex flex-col bg-contain bg-center bg-no-repeat h-7 bg-[url('/src/images/from-protovibe/logo2-6.png')] aspect-[55/14] dark:hidden" data-pv-block="smg8v8">
                {/* pv-editable-zone-start:h5hz60 */}
                {/* pv-editable-zone-end:h5hz60 */}
              </div>
              {/* pv-block-end:smg8v8 */}
              {/* pv-block-start:lgd2k9 */}
              <div className="hidden flex-col bg-contain bg-center bg-no-repeat h-7 dark:flex bg-[url('/src/images/from-protovibe/logo-dark-mode.png')] aspect-[55/14]" data-pv-block="lgd2k9">
                {/* pv-editable-zone-start:dkz3p4 */}
                {/* pv-editable-zone-end:dkz3p4 */}
              </div>
              {/* pv-block-end:lgd2k9 */}
            {/* pv-editable-zone-end:bzn202 */}
          </div>
          {/* pv-block-end:br2002 */}

          {/* pv-block-start:nv2005 */}
          <div data-pv-block="nv2005" className="p-4 flex-1 overflow-y-auto flex flex-col gap-4 border-r border-border-default">
            {/* pv-editable-zone-start:nzn205 */}
              {/* pv-block-start:ns2009 */}
              <div data-pv-block="ns2009">
                {/* pv-editable-zone-start:nzn209 */}
                  {/* pv-block-start:vt3011 */}
                  <VerticalTabs data-pv-block="vt3011" value={currentPath} onValueChange={navigate}>
                    {/* pv-editable-zone-start:vzn311 */}
                      {/* pv-block-start:vi4012 */}
                      <VerticalTabItem data-pv-block="vi4012" value="/dashboard" label="Home" prefixIcon="mdi:home" />
                      {/* pv-block-end:vi4012 */}
                      {/* pv-block-start:vi4013 */}
                      <VerticalTabItem data-pv-block="vi4013" value="/minions" label="Minions" prefixIcon="mdi:account-hard-hat" />
                      {/* pv-block-end:vi4013 */}
                      {/* pv-block-start:vi4014 */}
                      <VerticalTabItem data-pv-block="vi4014" value="/schemes" label="Schemes" prefixIcon="game-icons:evil-love" />
                      {/* pv-block-end:vi4014 */}
                      {/* pv-block-start:vi4015 */}
                      <VerticalTabItem data-pv-block="vi4015" value="/kpis" label="KPIs" prefixIcon="mdi:chart-donut" />
                      {/* pv-block-end:vi4015 */}
                      {/* pv-block-start:vi4016 */}
                      <VerticalTabItem data-pv-block="vi4016" value="/retreats" label="Executive Retreats" prefixIcon="mdi:beach" />
                      {/* pv-block-end:vi4016 */}
                      {/* pv-block-start:vi4017 */}
                      <VerticalTabItem data-pv-block="vi4017" value="/surveillance" label="Surveillance" prefixIcon="mdi:cctv" />
                      {/* pv-block-end:vi4017 */}
                    {/* pv-editable-zone-end:vzn311 */}
                  </VerticalTabs>
                  {/* pv-block-end:vt3011 */}
                {/* pv-editable-zone-end:nzn209 */}
              </div>
              {/* pv-block-end:ns2009 */}
            {/* pv-editable-zone-end:nzn205 */}
          </div>
          {/* pv-block-end:nv2005 */}
        {/* pv-editable-zone-end:szn101 */}
      </div>
      {/* pv-block-end:sb1001 */}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background-subtle">
        {/* Topbar */}
        {/* pv-block-start:hd5001 */}
        <header data-pv-block="hd5001" className="flex items-center justify-end shrink-0 h-12 pl-8 pr-2 border-b border-border-default bg-background-elevated">
          {/* pv-editable-zone-start:hzn501 */}
            {/* pv-block-start:nv5002 */}
            <div data-pv-block="nv5002" className="flex items-center gap-1">
              {/* pv-editable-zone-start:nzn502 */}
                {/* pv-block-start:bw6006 */}
                <div data-pv-block="bw6006" className="relative">
                  {/* pv-editable-zone-start:bzn606 */}
                    {/* pv-block-start:bt7007 */}
                    <Button data-pv-block="bt7007" iconOnly variant="ghost" color="neutral"><Icon className="text-foreground-default" iconSymbol="mdi:bell-outline" size="md" /></Button>
                    {/* pv-block-end:bt7007 */}
                    {/* pv-block-start:dt7008 */}
                    <span data-pv-block="dt7008" className="absolute top-2 right-2 w-2 h-2 bg-background-destructive rounded-full border border-background-default"></span>
                    {/* pv-block-end:dt7008 */}
                  {/* pv-editable-zone-end:bzn606 */}
                </div>
                {/* pv-block-end:bw6006 */}
                {/* pv-block-start:bt6004 */}
                <Button data-pv-block="bt6004" iconOnly variant="ghost" color="neutral"><Icon className="text-foreground-default" iconSymbol="mdi:cog-outline" size="md" /></Button>
                {/* pv-block-end:bt6004 */}
                {/* pv-block-start:bt6003 */}
                <Button data-pv-block="bt6003" iconOnly variant="ghost" color="neutral"><Icon className="text-foreground-default" iconSymbol="mdi:help-circle-outline" size="md" /></Button>
                {/* pv-block-end:bt6003 */}

                {/* User Avatar Dropdown */}
                {/* pv-block-start:pt6009 */}
                <PopoverTrigger data-pv-block="pt6009" placement="bottom" align="right">
                  {/* pv-editable-zone-start:pzn609 */}
                    {/* pv-block-start:tg7010 */}
                    <Button data-pv-block="tg7010" iconOnly variant="ghost" color="neutral">
                      <Avatar initials="JD" bgColor="default" size="sm" />
                    </Button>
                    {/* pv-block-end:tg7010 */}

                    {/* pv-block-start:dl7011 */}
                    <DropdownList data-pv-block="dl7011" width="lg" className="">
                      {/* pv-editable-zone-start:dzn711 */}
                        {/* pv-block-start:di8012 */}
                        <DropdownItem data-pv-block="di8012">
                          {/* pv-editable-zone-start:izn812 */}
                            {/* pv-block-start:av9013 */}
                            <Avatar data-pv-block="av9013" initials="JD" bgColor="info" size="sm" />
                            {/* pv-block-end:av9013 */}
                            {/* pv-block-start:nm9014 */}
                            <div data-pv-block="nm9014" className="flex flex-col">
                              {/* pv-editable-zone-start:nzn914 */}
                                {/* pv-block-start:sp1015 */}
                                <span data-pv-block="sp1015" className="text-sm font-medium text-foreground-default">Dr. Evil</span>
                                {/* pv-block-end:sp1015 */}
                                {/* pv-block-start:sp1016 */}
                                <span data-pv-block="sp1016" className="text-xs text-foreground-tertiary">dr.evil@evilcorp.com</span>
                                {/* pv-block-end:sp1016 */}
                              {/* pv-editable-zone-end:nzn914 */}
                            </div>
                            {/* pv-block-end:nm9014 */}
                          {/* pv-editable-zone-end:izn812 */}
                        </DropdownItem>
                        {/* pv-block-end:di8012 */}
                        {/* pv-block-start:sp8017 */}
                        <DropdownSeparator data-pv-block="sp8017" />
                        {/* pv-block-end:sp8017 */}
                        {/* pv-block-start:di8018 */}
                        <DropdownItem className="" data-pv-block="di8018">
                          {/* pv-editable-zone-start:izn818 */}
                            {/* pv-block-start:fmcrx5 */}
                            <div data-pv-block="fmcrx5" className="flex flex-row gap-2 items-center">
                              {/* pv-editable-zone-start:yfc4ca */}
                              {/* pv-block-start:ic9019 */}
                              <Icon data-pv-block="ic9019" iconSymbol="bell" size="sm" className="text-foreground-secondary" />
                              {/* pv-block-end:ic9019 */}
                              {/* pv-block-start:sp9020 */}
                              <span data-pv-block="sp9020" className="text-foreground-default">Notifications</span>
                              {/* pv-block-end:sp9020 */}
                              {/* pv-block-start:bd9021 */}
                              <Badge data-pv-block="bd9021" label="4" color="destructive" />
                              {/* pv-block-end:bd9021 */}
                              {/* pv-editable-zone-end:yfc4ca */}
                            </div>
                            {/* pv-block-end:fmcrx5 */}

                          {/* pv-editable-zone-end:izn818 */}
                        </DropdownItem>
                        {/* pv-block-end:di8018 */}
                        {/* pv-block-start:di8022 */}
                        <DropdownItem data-pv-block="di8022" label="Account Settings" prefixIcon="settings" />
                        {/* pv-block-end:di8022 */}
                        {/* pv-block-start:di8023 */}
                        <DropdownItem data-pv-block="di8023" label="Help & Support" prefixIcon="help-circle" />
                        {/* pv-block-end:di8023 */}
                        {/* pv-block-start:sp8024 */}
                        <DropdownSeparator data-pv-block="sp8024" />
                        {/* pv-block-end:sp8024 */}
                        {/* pv-block-start:gl8025 */}
                        <DropdownGroupLabel data-pv-block="gl8025" label="Appearance" />
                        {/* pv-block-end:gl8025 */}
                        {/* pv-block-start:di8026 */}
                        <DropdownItem
                          data-pv-block="di8026"
                          label="Auto theme"
                          prefixIcon="mdi:theme-light-dark"
                          selected={themePreference === 'auto'}
                          onClick={() => updateTheme('auto')}
                        />
                        {/* pv-block-end:di8026 */}
                        {/* pv-block-start:di8027 */}
                        <DropdownItem
                          data-pv-block="di8027"
                          label="Light"
                          prefixIcon="mdi:white-balance-sunny"
                          selected={themePreference === 'light'}
                          onClick={() => updateTheme('light')}
                        />
                        {/* pv-block-end:di8027 */}
                        {/* pv-block-start:di8028 */}
                        <DropdownItem
                          data-pv-block="di8028"
                          label="Dark"
                          prefixIcon="mdi:weather-night"
                          selected={themePreference === 'dark'}
                          onClick={() => updateTheme('dark')}
                        />
                        {/* pv-block-end:di8028 */}
                        {/* pv-block-start:sp8029 */}
                        <DropdownSeparator data-pv-block="sp8029" />
                        {/* pv-block-end:sp8029 */}
                        {/* pv-block-start:di8030 */}
                        <DropdownItem data-pv-block="di8030" label="Sign out" prefixIcon="log-out" destructive />
                        {/* pv-block-end:di8030 */}
                      {/* pv-editable-zone-end:dzn711 */}
                    </DropdownList>
                    {/* pv-block-end:dl7011 */}
                  {/* pv-editable-zone-end:pzn609 */}
                </PopoverTrigger>
                {/* pv-block-end:pt6009 */}
              {/* pv-editable-zone-end:nzn502 */}
            </div>
            {/* pv-block-end:nv5002 */}
          {/* pv-editable-zone-end:hzn501 */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background-default border rounded-lg border-transparent">
          {/* pv-block-start:m1x4ar */}
          <div data-pv-block="m1x4ar" className="mx-auto">
            {/* pv-editable-zone-start:p2g7vc */}
              {/* pv-block-start:dsh9k1 */}
              {currentPath === '/dashboard' && <DashboardPage data-pv-block="dsh9k1" />}
              {/* pv-block-end:dsh9k1 */}
              {/* pv-block-start:mn4t2q */}
              {currentPath === '/minions' && <MinionsPage data-pv-block="mn4t2q" />}
              {/* pv-block-end:mn4t2q */}
              {/* pv-block-start:sc6b8w */}
              {currentPath === '/schemes' && <SchemesPage data-pv-block="sc6b8w" />}
              {/* pv-block-end:sc6b8w */}
              {/* pv-block-start:kp3r5y */}
              {currentPath === '/kpis' && <KPIsPage data-pv-block="kp3r5y" />}
              {/* pv-block-end:kp3r5y */}
              {/* pv-block-start:rt7n9e */}
              {currentPath === '/retreats' && <ExecutiveRetreatsPage data-pv-block="rt7n9e" />}
              {/* pv-block-end:rt7n9e */}
              {/* pv-block-start:sv2j4u */}
              {currentPath === '/surveillance' && <SurveillancePage data-pv-block="sv2j4u" />}
              {/* pv-block-end:sv2j4u */}
            {/* pv-editable-zone-end:p2g7vc */}
          </div>
          {/* pv-block-end:m1x4ar */}
        </main>
      </div>
    </div>
  );
}
