import { PathContext } from '@/pathContext';
import App from '@/App';
import DocsPage from '@/DocsPage';

export function Root({ path }: { path: string }) {
  const Page = path.startsWith('/docs') ? DocsPage : App;
  return (
    <PathContext.Provider value={path}>
      <Page />
    </PathContext.Provider>
  );
}
