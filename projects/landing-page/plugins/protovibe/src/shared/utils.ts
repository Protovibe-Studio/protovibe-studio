// plugins/protovibe/utils.ts

export function splitTailwindClasses(value: string | null | undefined): string[] {
  if (!value) return [];
  const tokens: string[] = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === '[') depth++;
    else if (char === ']') depth = Math.max(0, depth - 1);

    if (/\s/.test(char) && depth === 0) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

export const parseTailwindClasses = (rawStr: string | null) => {
  if (!rawStr) return null;
  const stringRegex = /(["'`])(.*?)\1/g;
  let match;
  const parsedList: any[] = [];
  const seenClasses = new Set();

  while ((match = stringRegex.exec(rawStr)) !== null) {
    const stringContent = match[2];
    const classes = splitTailwindClasses(stringContent);
    const index = match.index;
    const precedingText = rawStr.substring(Math.max(0, index - 20), index);
    const isWrappedInLogic = precedingText.includes('?') || precedingText.includes('&&');

    classes.forEach(cls => {
      if (seenClasses.has(cls)) return;
      seenClasses.add(cls);
      const parts = cls.split(':');
      const baseClass = parts.pop() || '';
      const twModifiers = parts;
      
      let category = 'Misc / Custom';
      if (/^(flex|grid|block|hidden|inline|w-|h-|min-|max-|absolute|relative|static|fixed|inset|top-|bottom-|left-|right-|m.-|p.-|m-|p-|gap-|z-|size-)/.test(baseClass)) category = 'Layout & Sizing';
      else if (/^(text-|font-|leading-|tracking-|whitespace-|align-)/.test(baseClass)) category = 'Typography';
      else if (/^(bg-|from-|via-|to-|dark:bg)/.test(baseClass)) category = 'Backgrounds & Colors';
      else if (/^(border|rounded|ring|outline-|shadow|divide-)/.test(baseClass)) category = 'Borders & Shadows';
      else if (/^(transition|duration-|opacity-|cursor-|pointer-events-|animate-)/.test(baseClass)) category = 'Interactivity & Effects';

      const appliedWhen: { type: string, text: string }[] = [];
      if (isWrappedInLogic) appliedWhen.push({ type: 'logic', text: 'JS Logic' });

      twModifiers.forEach(mod => {
        const modMap: Record<string, string> = { 'sm': '≥ 640px', 'md': '≥ 768px', 'lg': '≥ 1024px', 'xl': '≥ 1280px', 'dark': 'Dark Mode', 'hover': 'Hover', 'focus': 'Focus' };
        appliedWhen.push({ type: 'tailwind', text: modMap[mod] || mod });
      });

      parsedList.push({ cls, baseClass, category, appliedWhen });
    });
  }

  return parsedList.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, any[]>);
};
