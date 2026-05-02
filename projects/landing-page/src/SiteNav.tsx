import { Image } from '@/components/ui/image';
import { usePath } from '@/pathContext';

export function SiteNav() {
  const path = usePath();
  const isDocs = path.startsWith('/docs');
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-[20px] py-[14px] md:px-[40px] md:py-[18px] bg-gradient-to-b from-[#050509eb] via-[#05050999] to-transparent backdrop-blur-[8px]">
      <a href="/" aria-label="Protovibe home">
        <Image className="bg-cover bg-center bg-no-repeat bg-[url('/src/images/from-protovibe/protovibe-studio-logo.png')] aspect-[101/12] h-3.5 sm:h-5" />
      </a>

      <div className="flex gap-[18px] md:gap-[28px] text-[14px] text-foreground-secondary ml-auto mr-[16px] md:mr-[24px]">
        <a href="https://github.com/Protovibe-Studio/protovibe-studio" target="_blank" rel="noreferrer" className="hover:text-foreground-strong">GitHub</a>
        <a href="/docs" data-active={isDocs} className="hover:text-foreground-strong data-[active=true]:text-foreground-strong data-[active=true]:font-semibold">Docs</a>
      </div>

      <a className="appearance-none border-0 bg-[#f4f4f6] text-[#000] text-[13px] font-semibold px-[14px] py-[8px] rounded-[8px] transition-all duration-150 hover:-translate-y-[1px] hover:bg-white cursor-pointer" data-install>
        Download
      </a>
    </nav>
  );
}
