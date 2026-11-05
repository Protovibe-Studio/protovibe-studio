import type { BlockClipboard } from '../shared/state';

export function getPastePositions(data: BlockClipboard, pasteX = 100, pasteY = 100) {
  const blocks = data.blocks.map(block => {
    const attrs = block.match(/<[A-Za-z0-9_.-]+([^>]*?)(?:>|\/>)/)?.[1] ?? '';
    const id = block.match(/pv-block-start:([a-zA-Z0-9_-]+)/)?.[1];
    const measured = id ? data.geometry?.[id] : undefined;
    const styles = attrs.match(/style=\{\s*\{([\s\S]*?)\}\s*\}/)?.[1] ?? '';
    const numericStyle = (name: string) => {
      const value = styles.match(new RegExp(`(?:^|,)\\s*${name}\\s*:\\s*(-?[\\d.]+)\\s*(?=,|$)`));
      return value ? Number(value[1]) : undefined;
    };
    const isFlow = measured?.isFlow ?? !/data-pv-sketchpad-el=/.test(attrs);
    const positive = (value: number | undefined) => Number.isFinite(value) && value! > 0 ? value : undefined;
    return {
      measured,
      isFlow,
      left: numericStyle('left'),
      top: numericStyle('top'),
      width: positive(measured?.width) ?? positive(numericStyle('width')),
      height: positive(measured?.height) ?? positive(numericStyle('height')),
    };
  });
  // Legacy clipboard payloads can still preserve an absolute group's offsets.
  // Never mix incomplete coordinates with flow roots that have no left/top.
  const hasAbsolutePositions = blocks.every(b => !b.isFlow && Number.isFinite(b.left) && Number.isFinite(b.top));
  // Existing absolute offsets already account for margin/transform styles that
  // stay on those roots. Prefer them so a rendered margin isn't applied twice.
  const hasGeometry = !hasAbsolutePositions && blocks.every(({ measured }) => measured
    && [measured.left, measured.top, measured.width, measured.height].every(Number.isFinite)
    && measured.width > 0 && measured.height > 0);
  const positions = hasGeometry ? blocks.map(b => b.measured!) : blocks;
  const minLeft = Math.min(...positions.map(b => b.left ?? 0));
  const minTop = Math.min(...positions.map(b => b.top ?? 0));
  let nextTop = pasteY;
  return blocks.map((block, index) => {
    const position = positions[index];
    const preserveOffsets = hasGeometry || hasAbsolutePositions;
    const top = preserveOffsets ? pasteY + position.top! - minTop : nextTop;
    // Without usable bounds, reserve each known height plus a small gap.
    // Older payloads with no dimensions get a visible 100px slot, not (0, 0).
    nextTop += (block.height ?? 100) + 16;
    return {
      left: preserveOffsets ? pasteX + position.left! - minLeft : pasteX,
      top,
      width: block.isFlow ? block.width : undefined,
      height: block.isFlow ? block.height : undefined,
      fromFlow: block.isFlow && (block.width != null || block.height != null),
    };
  });
}
