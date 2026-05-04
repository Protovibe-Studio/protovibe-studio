import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { InfoBoxBanner } from '@/components/ui/info-box-banner';
import { TextHeading } from '@/components/ui/text-heading';
import { TextParagraph } from '@/components/ui/text-paragraph';
import { Table } from '@/components/ui/table';
import { TableRowHeading } from '@/components/ui/table-row-heading';
import { TableBody } from '@/components/ui/table-body';
import { TableRowContent } from '@/components/ui/table-row-content';
import { TableCellHeading } from '@/components/ui/table-cell-heading';
import { TableCellContent } from '@/components/ui/table-cell-content';

const mockSchemes = [
  { id: 's1', name: 'Operation Moonbase Alpha', priority: 'Critical', status: 'In Progress', budget: '$4.2B', lead: 'Dr. Evil' },
  { id: 's2', name: 'Steal the Eiffel Tower', priority: 'High', status: 'Planning', budget: '$840M', lead: 'Vasquez, M.' },
  { id: 's3', name: 'Hack the Pentagon (Again)', priority: 'Medium', status: 'Foiled', budget: '$120K', lead: 'Natasha Volkov' },
  { id: 's4', name: 'Shrink Ray Prototype', priority: 'High', status: 'In Progress', budget: '$2.1B', lead: 'Igor Krauss' },
  { id: 's5', name: 'Weather Control Device', priority: 'Low', status: 'Planning', budget: '$890M', lead: 'Grunt #47' },
];

export function SchemesPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 p-8">
      {/* pv-editable-zone-start:sc1z2x3 */}

        {/* pv-block-start:schead1 */}
        <div data-pv-block="schead1" className="flex gap-2 flex-row items-start justify-between">
          {/* pv-editable-zone-start:schn3m1 */}
          {/* pv-block-start:sctitle */}
          <TextHeading data-pv-block="sctitle" typography="heading-lg">Schemes</TextHeading>
          {/* pv-block-end:sctitle */}
          {/* pv-block-start:scbtn1 */}
          <Button data-pv-block="scbtn1" label="New Scheme" variant="solid" color="primary" leftIcon="plus" />
          {/* pv-block-end:scbtn1 */}
          {/* pv-editable-zone-end:schn3m1 */}
        </div>
        {/* pv-block-end:schead1 */}

        {/* pv-block-start:scinfo1 */}
        <InfoBoxBanner data-pv-block="scinfo1" color="warning" heading="3 schemes over budget!" secondaryText="Operation Moonbase Alpha has exceeded its quarterly allocation by 340%. Please submit a revised funding request to the Supreme Council." icon="alert-triangle" primaryActionLabel="Request Funds" actionsLayout="right" />
        {/* pv-block-end:scinfo1 */}

        {/* pv-block-start:sctable1 */}
        <Table data-pv-block="sctable1">
          <TableRowHeading>
            {/* pv-editable-zone-start:scth1 */}
              {/* pv-block-start:scth2 */}
              <TableCellHeading data-pv-block="scth2" label="Scheme Name" />
              {/* pv-block-end:scth2 */}
              {/* pv-block-start:scth3 */}
              <TableCellHeading data-pv-block="scth3" label="Lead Villain" />
              {/* pv-block-end:scth3 */}
              {/* pv-block-start:scth4 */}
              <TableCellHeading data-pv-block="scth4" label="Priority" />
              {/* pv-block-end:scth4 */}
              {/* pv-block-start:scth5 */}
              <TableCellHeading data-pv-block="scth5" label="Budget" />
              {/* pv-block-end:scth5 */}
              {/* pv-block-start:scth6 */}
              <TableCellHeading data-pv-block="scth6" label="Status" />
              {/* pv-block-end:scth6 */}
              {/* pv-block-start:scth7 */}
              <TableCellHeading data-pv-block="scth7" label="" className="w-12" />
              {/* pv-block-end:scth7 */}
            {/* pv-editable-zone-end:scth1 */}
          </TableRowHeading>
          <TableBody>
            {mockSchemes.map(scheme => (
              <TableRowContent key={scheme.id} className="hover:bg-background-subtle">
                <TableCellContent>
                  <TextParagraph typography="regular">{scheme.name}</TextParagraph>
                </TableCellContent>
                <TableCellContent>
                  <div className="flex items-center gap-2">
                    <Avatar initials={scheme.lead} size="sm" bgColor="warning" />
                    <TextParagraph typography="regular">{scheme.lead}</TextParagraph>
                  </div>
                </TableCellContent>
                <TableCellContent>
                  <Badge label={scheme.priority} color={scheme.priority === 'Critical' ? 'destructive' : scheme.priority === 'High' ? 'warning' : scheme.priority === 'Medium' ? 'info' : 'neutral'} />
                </TableCellContent>
                <TableCellContent>
                  <TextParagraph typography="regular">{scheme.budget}</TextParagraph>
                </TableCellContent>
                <TableCellContent>
                  <Badge label={scheme.status} color={scheme.status === 'In Progress' ? 'success' : scheme.status === 'Planning' ? 'info' : 'neutral'} />
                </TableCellContent>
                <TableCellContent className="text-right">
                  <Button iconOnly variant="ghost" color="neutral" leftIcon="MoreHorizontal" />
                </TableCellContent>
              </TableRowContent>
            ))}
          </TableBody>
        </Table>
        {/* pv-block-end:sctable1 */}

      {/* pv-editable-zone-end:sc1z2x3 */}
    </div>
  );
}
