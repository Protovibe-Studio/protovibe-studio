// plugins/protovibe/src/ui/components/visual/BackgroundImage.tsx
import React, { useRef, useState, useEffect } from 'react';
import { SegmentedControl } from './SegmentedControl';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { useProtovibe } from '../../context/ProtovibeContext';
import { takeSnapshot, updateSource, uploadImage } from '../../api/client';
import { buildContextPrefix } from '../../utils/tailwind';
import { useScales } from '../../hooks/useScales';
import { theme } from '../../theme';

// 3×3 position grid — row-major order
const POSITION_GRID = [
  'bg-left-top',    'bg-top',    'bg-right-top',
  'bg-left',        'bg-center', 'bg-right',
  'bg-left-bottom', 'bg-bottom', 'bg-right-bottom',
];

/**
 * Parse custom bg size:
 *   `bg-[length:200px_100px]` → { w: '200px', h: '100px' }
 *   `bg-[length:50%]`         → { w: '50%',   h: '' }       (width only)
 */
function parseCustomSize(bgSize: string): { w: string; h: string } | null {
  // Two values: bg-[length:W_H]
  const m2 = bgSize.match(/^bg-\[length:([^\]_]+)_([^\]]+)\]$/);
  if (m2) return { w: m2[1], h: m2[2] };
  // Single value: bg-[length:W]
  const m1 = bgSize.match(/^bg-\[length:([^\]]+)\]$/);
  if (m1) return { w: m1[1], h: '' };
  return null;
}

/** Strip units for display in the autocomplete (e.g. '200px' → '200px', '50%' → '50%') */
function displayVal(raw: string): string {
  if (!raw) return '';
  // If it's already a bare Tailwind token (e.g. 'full', '1/2', 'auto') return as-is
  // If wrapped in brackets from makeSafe, unwrap
  return raw.replace(/^\[|\]$/g, '');
}

/** Convert an autocomplete value to a CSS value suitable for bg-[length:...] */
function toCssValue(val: string): string {
  if (!val || val === '-') return '';
  const s = val.trim();
  // Already a CSS value with units
  if (/^[0-9.]+(px|rem|em|vh|vw|%)$/.test(s)) return s;
  // Percentage shorthand like '1/2' → '50%', 'full' → '100%'
  if (s === 'full') return '100%';
  if (s === 'auto') return 'auto';
  if (s === 'screen') return '100vw';
  // Fraction like 1/2, 1/3, etc
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return `${(Number(frac[1]) / Number(frac[2]) * 100).toFixed(4).replace(/\.?0+$/, '')}%`;
  // Pure number → px
  if (/^[0-9.]+$/.test(s)) return `${s}px`;
  // Already has units or is arbitrary
  return s;
}

/** Determine which size mode is active */
function getSizeMode(bgSize: string): 'cover' | 'contain' | 'auto' | 'custom' | '' {
  if (bgSize === 'bg-cover') return 'cover';
  if (bgSize === 'bg-contain') return 'contain';
  if (bgSize === 'bg-auto') return 'auto';
  if (bgSize.startsWith('bg-[length:')) return 'custom';
  return '';
}

export const BackgroundImage: React.FC<{ v: any; domV?: any }> = ({ v }) => {
  const { activeData, activeSourceId, activeModifiers, runLockedMutation } = useProtovibe();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLImageElement>(null);
  const scales = useScales();
  const [uploading, setUploading] = useState(false);
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);
  const [thumbHovered, setThumbHovered] = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [imgError, setImgError] = useState(false);

  const hasImage = !!v.bgImage;

  // Reset error state when the image URL changes
  useEffect(() => setImgError(false), [v.bgImage]);
  const sizeMode = getSizeMode(v.bgSize);
  const customParsed = parseCustomSize(v.bgSize);

  const [customW, setCustomW] = useState(customParsed ? displayVal(customParsed.w) : '');
  const [customH, setCustomH] = useState(customParsed ? displayVal(customParsed.h) : '');

  // Sync local custom fields when source changes
  useEffect(() => {
    const p = parseCustomSize(v.bgSize);
    if (p) {
      setCustomW(displayVal(p.w));
      setCustomH(displayVal(p.h));
    } else if (!v.bgSize.startsWith('bg-[length:')) {
      setCustomW('');
      setCustomH('');
    }
  }, [v.bgSize]);

  // ── Shared class update helper ──────────────────────────────────────────────

  const handleControlChange = async (property: string, newVal: string) => {
    if (!activeData?.file) return;

    const currentContextPrefix = buildContextPrefix(activeModifiers);
    const originalKey = `${property}_original`;
    const oldClass = v[originalKey] || '';
    const newClass = newVal ? `${currentContextPrefix}${newVal}` : '';

    if (oldClass === newClass) return;

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      let action = 'edit';
      if (!oldClass && newClass) action = 'add';
      if (oldClass && !newClass) action = 'remove';
      await updateSource({
        ...activeData,
        id: activeSourceId!,
        oldClass,
        newClass,
        action,
      });
    });
  };

  // ── Upload / Remove ─────────────────────────────────────────────────────────

  /** Load a File as an Image to read its natural dimensions */
  const getImageDimensions = (file: File): Promise<{ w: number; h: number }> =>
    new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(objectUrl); };
      img.onerror = () => { resolve({ w: 0, h: 0 }); URL.revokeObjectURL(objectUrl); };
      img.src = objectUrl;
    });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeData?.file) return;

    setUploading(true);
    try {
      const [url, dims] = await Promise.all([uploadImage(file), getImageDimensions(file)]);
      const currentContextPrefix = buildContextPrefix(activeModifiers);

      const oldClasses = [
        v.bgImage_original, v.bgSize_original, v.bgPosition_original, v.bgRepeat_original, v.aspectRatio_original,
      ].filter(Boolean);

      // Compute aspect ratio class from the uploaded image
      let aspectClass = '';
      if (dims.w && dims.h) {
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const d = gcd(Math.round(dims.w), Math.round(dims.h));
        aspectClass = `${currentContextPrefix}aspect-[${Math.round(dims.w / d)}/${Math.round(dims.h / d)}]`;
      }

      const newClasses = [
        `${currentContextPrefix}bg-[url('${url}')]`,
        `${currentContextPrefix}bg-contain`,
        `${currentContextPrefix}bg-center`,
        `${currentContextPrefix}bg-no-repeat`,
        aspectClass,
      ].filter(Boolean).join(' ');

      await runLockedMutation(async () => {
        await takeSnapshot(activeData.file, activeSourceId!);
        await updateSource({
          ...activeData,
          id: activeSourceId!,
          oldClasses,
          oldClass: '',
          newClass: newClasses,
          action: oldClasses.length > 0 ? 'replace-multiple' : 'add',
        });
      });
    } catch (err) {
      console.error('[BackgroundImage] Upload failed:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!activeData?.file) return;
    const oldClasses = [
      v.bgImage_original, v.bgSize_original, v.bgPosition_original, v.bgRepeat_original, v.aspectRatio_original,
    ].filter(Boolean);
    if (oldClasses.length === 0) return;

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      await updateSource({
        ...activeData,
        id: activeSourceId!,
        oldClasses,
        oldClass: '',
        newClass: '',
        action: 'replace-multiple',
      });
    });
  };

  /** Replace the bg-[url(...)] class, and update aspect ratio if it was set */
  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeData?.file) return;

    setUploading(true);
    try {
      const [url, dims] = await Promise.all([uploadImage(file), getImageDimensions(file)]);
      const currentContextPrefix = buildContextPrefix(activeModifiers);

      const oldImageClass = v.bgImage_original || '';
      const newImageClass = `${currentContextPrefix}bg-[url('${url}')]`;

      const oldAspectClass = v.aspectRatio_original || '';
      let newAspectClass = '';

      if (oldAspectClass && dims.w && dims.h) {
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const d = gcd(Math.round(dims.w), Math.round(dims.h));
        newAspectClass = `${currentContextPrefix}aspect-[${Math.round(dims.w / d)}/${Math.round(dims.h / d)}]`;
      }

      await runLockedMutation(async () => {
        await takeSnapshot(activeData.file, activeSourceId!);

        if (oldAspectClass) {
          await updateSource({
            ...activeData,
            id: activeSourceId!,
            oldClasses: [oldImageClass, oldAspectClass].filter(Boolean),
            oldClass: '',
            newClass: [newImageClass, newAspectClass].filter(Boolean).join(' '),
            action: 'replace-multiple',
          });
        } else {
          await updateSource({
            ...activeData,
            id: activeSourceId!,
            oldClass: oldImageClass,
            newClass: newImageClass,
            action: oldImageClass ? 'edit' : 'add',
          });
        }
      });
    } catch (err) {
      console.error('[BackgroundImage] Replace failed:', err);
    } finally {
      if (replaceInputRef.current) replaceInputRef.current.value = '';
      setUploading(false);
    }
  };

  // ── Size handlers ───────────────────────────────────────────────────────────

  const handleSizeSegment = (val: string) => {
    if (val === 'custom') {
      handleControlChange('bgSize', 'bg-[length:100%]');
    } else {
      handleControlChange('bgSize', val ? `bg-${val}` : '');
    }
  };

  const commitCustomSize = (w: string, h: string) => {
    const cssW = toCssValue(w);
    const cssH = toCssValue(h);

    // Both cleared → remove custom size entirely
    if (!cssW && !cssH) {
      handleControlChange('bgSize', '');
      return;
    }

    // Only height set → use "auto" for width so the class stays valid
    const finalW = cssW || 'auto';
    const finalH = cssH;
    const sizeVal = finalH ? `${finalW}_${finalH}` : finalW;
    handleControlChange('bgSize', `bg-[length:${sizeVal}]`);
  };

  // ── Position dot ────────────────────────────────────────────────────────────

  const handlePositionDot = (posClass: string) => {
    handleControlChange('bgPosition', v.bgPosition === posClass ? '' : posClass);
  };

  // ── Repeat toggle ───────────────────────────────────────────────────────────

  const isRepeat = v.bgRepeat === 'bg-repeat';
  const handleRepeatToggle = () => {
    handleControlChange('bgRepeat', isRepeat ? 'bg-no-repeat' : 'bg-repeat');
  };

  // ── Aspect ratio ────────────────────────────────────────────────────────────

  const hasAspectRatio = !!v.aspectRatio;

  /** Compute a simplified ratio string like "16/9" from the image's natural size */
  const computeAspectClass = (): string => {
    if (!imgNaturalSize) return '';
    const { w, h } = imgNaturalSize;
    if (!w || !h) return '';
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const d = gcd(Math.round(w), Math.round(h));
    return `aspect-[${Math.round(w / d)}/${Math.round(h / d)}]`;
  };

  const handleAspectToggle = () => {
    if (hasAspectRatio) {
      handleControlChange('aspectRatio', '');
    } else {
      const cls = computeAspectClass();
      if (cls) handleControlChange('aspectRatio', cls);
    }
  };

  // ── Header action (+/×) ─────────────────────────────────────────────────────

  const iconBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: theme.text_secondary,
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    lineHeight: 1,
  };

  const headerAction = hasImage ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <button style={iconBtnStyle} onClick={() => replaceInputRef.current?.click()} data-tooltip="Replace image" disabled={uploading}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5v4M4 3.5l2-2 2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 7v2.5a1 1 0 01-1 1H3a1 1 0 01-1-1V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button style={iconBtnStyle} onClick={handleRemove} data-tooltip="Remove background image">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </button>
    </div>
  ) : (
    <button style={iconBtnStyle} onClick={() => fileInputRef.current?.click()} data-tooltip="Add background image" disabled={uploading}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    </button>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const showBody = hasImage || uploading;

  return (
    <>
      <input ref={fileInputRef} type="file" hidden accept="image/*, image/svg+xml" onChange={handleUpload} />
      <input ref={replaceInputRef} type="file" hidden accept="image/*, image/svg+xml" onChange={handleReplaceImage} />
      <div style={{ borderTop: `1px solid ${theme.border_default}` }}>
        <div style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', color: theme.text_default, fontSize: '10px', fontWeight: '600',
        }}>
          <span>Background Image</span>
          {headerAction}
        </div>
        {showBody && (
          <div style={{ padding: '0 20px 16px 20px' }}>

      {hasImage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Thumbnail / Missing asset fallback */}
          <div
            onMouseEnter={() => setThumbHovered(true)}
            onMouseLeave={() => setThumbHovered(false)}
            onClick={!imgError && !uploading ? () => replaceInputRef.current?.click() : undefined}
            style={{
              position: 'relative',
              width: '100%', height: '80px', borderRadius: '6px', overflow: 'hidden',
              border: `1px solid ${imgError ? theme.destructive_default : theme.border_default}`,
              background: imgError ? theme.destructive_low : theme.bg_secondary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: !imgError && !uploading ? 'pointer' : 'default',
            }}>
            {imgError ? (
              <span style={{ fontSize: '11px', fontWeight: 600, color: theme.destructive_default }}>
                Missing Asset
              </span>
            ) : (
              <img
                ref={thumbRef}
                src={v.bgImage}
                alt="Background"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                }}
                onError={() => setImgError(true)}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            )}
            {!imgError && thumbHovered && (
              <div
                style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0, 0, 0, 0.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '11px', fontWeight: 600,
                  pointerEvents: 'none',
                }}
              >
                Upload new image
              </div>
            )}
          </div>

          {/* Size — segmented control with Custom option */}
          <SegmentedControl
            label=""
            value={sizeMode}
            segments={[
              { val: 'contain', label: 'Contain' },
              { val: 'cover', label: 'Cover' },
              { val: 'auto', label: 'Auto' },
              { val: 'custom', label: 'Custom' },
            ]}
            onChange={handleSizeSegment}
          />

          {/* Custom W × H fields — shown only in custom mode */}
          {sizeMode === 'custom' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', lineHeight: '11px', color: theme.text_secondary }}>Width</label>
                <AutocompleteDropdown
                  value={customW}
                  placeholder="auto"
                  options={scales.size}
                  onCommit={(val) => { setCustomW(val); commitCustomSize(val, customH); }}
                  zIndex={9999999}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', lineHeight: '11px', color: theme.text_secondary }}>Height</label>
                <AutocompleteDropdown
                  value={customH}
                  placeholder="auto"
                  options={scales.size}
                  onCommit={(val) => { setCustomH(val); commitCustomSize(customW, val); }}
                  zIndex={9999999}
                />
              </div>
            </div>
          )}

          {/* Position grid + Repeat checkbox — side by side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* 3×3 dot grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px',
              width: '44px', height: '44px', padding: '6px', flexShrink: 0,
              background: theme.bg_secondary, borderRadius: '4px',
              border: `1px solid ${theme.border_default}`,
            }}>
              {POSITION_GRID.map((posClass) => {
                const isActive = v.bgPosition === posClass;
                const isHovered = hoveredDot === posClass;
                return (
                  <button
                    key={posClass}
                    onClick={() => handlePositionDot(posClass)}
                    onMouseEnter={() => setHoveredDot(posClass)}
                    onMouseLeave={() => setHoveredDot(null)}
                    data-tooltip={posClass.replace('bg-', '')}
                    style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      border: 'none', padding: 0, cursor: 'pointer',
                      background: isActive ? theme.accent_default : isHovered ? theme.text_secondary : theme.text_tertiary,
                      transition: 'background 0.15s',
                      opacity: isActive ? 1 : isHovered ? 0.8 : 0.4,
                    }}
                  />
                );
              })}
            </div>

            {/* Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Fit aspect ratio */}
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', cursor: imgNaturalSize ? 'pointer' : 'default',
                  fontSize: '11px', color: hasAspectRatio ? theme.accent_default : theme.text_tertiary,
                  userSelect: 'none',
                  opacity: imgNaturalSize ? 1 : 0.5,
                }}
                onClick={imgNaturalSize ? handleAspectToggle : undefined}
                data-tooltip={imgNaturalSize ? `Set aspect ratio to ${imgNaturalSize.w}:${imgNaturalSize.h}` : 'Loading image dimensions...'}
              >
                <div
                  style={{
                    width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                    border: `1px solid ${hasAspectRatio ? theme.accent_default : theme.border_default}`,
                    background: hasAspectRatio ? theme.accent_default : theme.bg_secondary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {hasAspectRatio && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2.5 5L4.5 7L7.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                Fit aspect ratio
              </label>

              {/* Repeat */}
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                  fontSize: '11px', color: isRepeat ? theme.accent_default : theme.text_tertiary,
                  userSelect: 'none',
                }}
                onClick={handleRepeatToggle}
              >
                <div
                  style={{
                    width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                    border: `1px solid ${isRepeat ? theme.accent_default : theme.border_default}`,
                    background: isRepeat ? theme.accent_default : theme.bg_secondary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {isRepeat && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2.5 5L4.5 7L7.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                Repeat
              </label>
            </div>
          </div>
        </div>
      )}
      {!hasImage && uploading && (
        <div style={{ fontSize: '10px', color: theme.text_tertiary }}>Uploading...</div>
      )}

          </div>
        )}
      </div>
    </>
  );
};
