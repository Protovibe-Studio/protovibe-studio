// plugins/protovibe/src/ui/context/ProtovibeContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ActiveModifiers } from '../utils/tailwind';
import { fetchSourceInfo, fetchComponents, fetchZones, fetchThemeColors, fetchThemeTokens, type ThemeColor, type ThemeToken } from '../api/client';

interface SourceData {
  id: string;
  data: any;
}

interface Zone {
  id: string;
  name: string;
  isPristine: boolean;
}

interface ProtovibeContextType {
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
  activeSourceId: string | null;
  setActiveSourceId: (id: string | null) => void;
  currentBaseTarget: HTMLElement | null;
  setCurrentBaseTarget: (el: HTMLElement | null) => void;
  selectedTargets: HTMLElement[];
  activeModifiers: ActiveModifiers;
  setActiveModifiers: React.Dispatch<React.SetStateAction<ActiveModifiers>>;
  availableComponents: any[];
  refreshComponents: () => Promise<void>;
  sourceDataList: SourceData[];
  activeData: any | null;
  isLoading: boolean;
  refreshActiveData: () => Promise<void>;
  toggleInspector: (forceState?: boolean) => void;
  highlightedElement: HTMLElement | null;
  setHighlightedElement: (el: HTMLElement | null) => void;
  sources: string[];
  setSources: (ids: string[]) => void;
  zones: Zone[];
  focusElement: (el: HTMLElement) => void;
  clearFocus: () => void;
  focusNewBlock: (blockId: string, options?: { maxAttempts?: number; initialDelay?: number; interval?: number }) => void;
  isMutationLocked: boolean;
  runLockedMutation: <T>(mutation: () => Promise<T>) => Promise<T | undefined>;
  themeColors: ThemeColor[];
  refreshThemeColors: () => Promise<void>;
  themeTokens: ThemeToken[];
  refreshThemeTokens: () => Promise<void>;
  htmlFontSize: number;
  setHtmlFontSize: (size: number) => void;
}

const ProtovibeContext = createContext<ProtovibeContextType | undefined>(undefined);

export const ProtovibeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [currentBaseTarget, setCurrentBaseTarget] = useState<HTMLElement | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<HTMLElement[]>([]);
  const [activeModifiers, setActiveModifiers] = useState<ActiveModifiers>({ interaction: [], breakpoint: null, dataAttrs: {} });
  const [availableComponents, setAvailableComponents] = useState<any[]>([]);
  const [sourceDataList, setSourceDataList] = useState<SourceData[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedElement, _setHighlightedElement] = useState<HTMLElement | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isMutationLocked, setIsMutationLocked] = useState(false);
  const [themeColors, setThemeColors] = useState<ThemeColor[]>([]);
  const [themeTokens, setThemeTokens] = useState<ThemeToken[]>([]);
  const [htmlFontSize, setHtmlFontSize] = useState(16);
  const sourcesRef = useRef<string[]>([]);
  const activeSourceIdRef = useRef<string | null>(null);
  const componentIdOverrideRef = useRef<string | null>(null);
  const mutationLockRef = useRef(false);

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    activeSourceIdRef.current = activeSourceId;
  }, [activeSourceId]);

  const setHighlightedElement = useCallback((el: HTMLElement | null) => {
    // In iframe architecture, the actual DOM manipulation for outlines 
    // happens entirely inside bridge.ts to avoid cross-frame sync bugs.
    _setHighlightedElement(el);
  }, []);

  const refreshActiveData = useCallback(async () => {
    const currentSources = sourcesRef.current;
    const requestSourcesKey = currentSources.join('|');

    if (currentSources.length === 0) {
      setSourceDataList([]);
      setZones([]);
      return;
    }

    setIsLoading(true);
    const results: SourceData[] = [];
    for (const id of currentSources) {
      try {
        const data = await fetchSourceInfo(id, componentIdOverrideRef.current ?? undefined);
        results.push({ id, data });
      } catch (err) {
        console.error('Failed to fetch source info for', id, err);
      }
    }

    // Do not apply stale results when focus/source selection changed during fetch.
    if (sourcesRef.current.join('|') !== requestSourcesKey) {
      return;
    }

    const normalizePath = (filePath: string) => filePath.replace(/\\/g, '/');
    const isComponentsSource = (filePath: string) => /(^|\/)src\/components(\/|$)/.test(normalizePath(filePath));

    // Sort sources: non-src/components first, src/components last.
    // If tie, consumer components (Capitalized) first, then shallower file paths.
    results.sort((a, b) => {
      const aIsCompFolder = isComponentsSource(a.data.file || '');
      const bIsCompFolder = isComponentsSource(b.data.file || '');

      // Components folder files go to the far right
      if (aIsCompFolder && !bIsCompFolder) return 1;
      if (!aIsCompFolder && bIsCompFolder) return -1;

      const aIsUpper = /^[A-Z]/.test(a.data.compName || '');
      const bIsUpper = /^[A-Z]/.test(b.data.compName || '');
      if (aIsUpper && !bIsUpper) return -1;
      if (!aIsUpper && bIsUpper) return 1;
      
      const aDepth = normalizePath(a.data.file || '').split('/').length;
      const bDepth = normalizePath(b.data.file || '').split('/').length;
      return aDepth - bDepth;
    });

    setSourceDataList(results);
    setIsLoading(false);

    // Fetch theme colors alongside source data
    fetchThemeColors().then((colors) => {
      setThemeColors(colors);
    }).catch(() => {});

    // Fetch other tokens so the "Other" tab syncs after an undo
    fetchThemeTokens().then(setThemeTokens).catch(() => {});
    
    const currentActiveSourceId = activeSourceIdRef.current;
    if (results.length > 0 && (!currentActiveSourceId || !currentSources.includes(currentActiveSourceId))) {
      setActiveSourceId(results[0].id);
    }
  }, []);

  useEffect(() => {
    refreshActiveData();
  }, [sources]);

  // Refetch zones whenever the active tab (source) changes
  useEffect(() => {
    const active = sourceDataList.find(s => s.id === activeSourceId) || sourceDataList[0];
    if (active?.data?.file) {
      fetchZones(active.data.file, active.data.startLine, active.data.startCol, active.data.endLine)
        .then(zData => {
          if (zData.zones) setZones(zData.zones);
          else setZones([]);
        })
        .catch(() => setZones([]));
    } else {
      setZones([]);
    }
  }, [activeSourceId, sourceDataList]);

  const refreshThemeColors = useCallback(async () => {
    try {
      const colors = await fetchThemeColors();
      setThemeColors(colors);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const refreshThemeTokens = useCallback(async () => {
    try {
      const tokens = await fetchThemeTokens();
      setThemeTokens(tokens);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const refreshComponents = useCallback(async () => {
    try {
      const data = await fetchComponents();
      if (data.components) setAvailableComponents(data.components);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refreshComponents();
  }, []);

  useEffect(() => {
    fetchThemeColors().then(setThemeColors).catch(() => {});
  }, []);

  useEffect(() => {
    fetchThemeTokens().then(setThemeTokens).catch(() => {});
  }, []);

  // When the user clicks inside any iframe, dispatch a synthetic mousedown on the
  // shell document so all click-outside handlers (dropdowns, menus, etc.) close automatically.
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'PV_IFRAME_POINTER_DOWN') {
        document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const focusElement = useCallback((inputEl: HTMLElement | HTMLElement[]) => {
    (document.activeElement as HTMLElement | null)?.blur?.();

    const els = Array.isArray(inputEl) ? inputEl : [inputEl];
    if (els.length === 0) return;

    const primaryEl = els[els.length - 1];
    let t: HTMLElement | null = primaryEl;
    let matchedIds = new Set<string>();
    const docRoot = primaryEl.ownerDocument?.documentElement ?? document.documentElement;
    while (t && t !== docRoot) {
      if (t.attributes) {
        for (let i = 0; i < t.attributes.length; i++) {
          if (t.attributes[i].name.startsWith('data-pv-loc-')) {
            const rawId = t.attributes[i].name.replace('data-pv-loc-', '');
            const id = rawId.replace(/^(app|ui)-/, '');
            matchedIds.add(id);
          }
        }
      }
      if (matchedIds.size > 0) break;
      t = t.parentElement as HTMLElement;
    }
    componentIdOverrideRef.current = t?.getAttribute?.('data-pv-component-id') ?? null;

    const runtimeIds = els.map(element => {
      let rId = element.getAttribute('data-pv-runtime-id');
      if (!rId) {
        rId = 'pv-' + Math.random().toString(36).substring(2);
        element.setAttribute('data-pv-runtime-id', rId);
      }
      return rId;
    });

    setCurrentBaseTarget(primaryEl);
    setSelectedTargets(els);
    setHighlightedElement(primaryEl);
    setActiveModifiers({ interaction: [], breakpoint: null, dataAttrs: {} });
    if (matchedIds.size > 0) {
      setSources(Array.from(matchedIds));
    }

    const allIframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
    const iframeEl = allIframes.find(f => f.contentDocument === primaryEl.ownerDocument) ?? null;
    iframeEl?.contentWindow?.postMessage({ type: 'PV_SET_SELECTION', runtimeIds }, '*');

  }, [setHighlightedElement]);

  const clearFocus = useCallback(() => {
    setHighlightedElement(null);
    setCurrentBaseTarget(null);
    setSelectedTargets([]);
    setActiveSourceId(null);
    setSources([]);
    // Clear outline in all iframes
    (Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[]).forEach(iframe => {
      iframe.contentWindow?.postMessage({ type: 'PV_CLEAR_SELECTION' }, '*');
    });
  }, [setHighlightedElement]);

  const focusNewBlock = useCallback((blockId: string, options: { maxAttempts?: number; initialDelay?: number; interval?: number } = {}) => {
    const { maxAttempts = 20, initialDelay = 300, interval = 100 } = options;
    let attempts = 0;
    const tryFocus = () => {
      // Search across all iframes, then fall back to the parent document.
      const allIframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
      let target: HTMLElement | null = null;
      for (const iframe of allIframes) {
        target = (iframe.contentDocument?.querySelector(`[data-pv-block="${blockId}"]`) as HTMLElement | null) ?? null;
        if (target) break;
      }
      if (!target) target = document.querySelector(`[data-pv-block="${blockId}"]`) as HTMLElement;
      const hasPvLoc = !!target && Array.from(target.attributes).some(a => a.name.startsWith('data-pv-loc-'));
      if (hasPvLoc) {
        focusElement(target);
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(tryFocus, interval);
          return;
        }
        if (target) focusElement(target);
        refreshActiveData();
      }
    };
    setTimeout(tryFocus, initialDelay);
  }, [focusElement, refreshActiveData]);

  const runLockedMutation = useCallback(async <T,>(mutation: () => Promise<T>): Promise<T | undefined> => {
    if (mutationLockRef.current) {
      return undefined;
    }

    mutationLockRef.current = true;
    setIsMutationLocked(true);

    try {
      const result = await mutation();
      await refreshActiveData();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      return result;
    } finally {
      mutationLockRef.current = false;
      setIsMutationLocked(false);
    }
  }, [refreshActiveData]);

  const toggleInspector = useCallback((forceState?: boolean) => {
    const nextOpen = forceState !== undefined ? forceState : !inspectorOpen;
    setInspectorOpen(nextOpen);
    if (!nextOpen) {
      setHighlightedElement(null);
      setCurrentBaseTarget(null);
      setActiveSourceId(null);
      setSources([]);
      setZones([]);
    }
  }, [inspectorOpen, setHighlightedElement]);

  const activeData = sourceDataList.find(s => s.id === activeSourceId)?.data || null;

  return (
    <ProtovibeContext.Provider value={{
      inspectorOpen, setInspectorOpen,
      activeSourceId, setActiveSourceId,
      currentBaseTarget, setCurrentBaseTarget,
      selectedTargets,
      activeModifiers, setActiveModifiers,
      availableComponents,
      refreshComponents,
      sourceDataList,
      activeData,
      isLoading,
      refreshActiveData,
      toggleInspector,
      highlightedElement, setHighlightedElement,
      sources, setSources,
      zones,
      focusElement,
      clearFocus,
      focusNewBlock,
      isMutationLocked,
      runLockedMutation,
      themeColors,
      refreshThemeColors,
      themeTokens,
      refreshThemeTokens,
      htmlFontSize,
      setHtmlFontSize,
    }}>
      {children}
    </ProtovibeContext.Provider>
  );
};

export const useProtovibe = () => {
  const context = useContext(ProtovibeContext);
  if (context === undefined) {
    throw new Error('useProtovibe must be used within a ProtovibeProvider');
  }
  return context;
};
