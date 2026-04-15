export interface SketchpadFrame {
  id: string;
  name: string;
  width: number;
  height: number;
  canvasX: number;
  canvasY: number;
}

export interface Sketchpad {
  id: string;
  name: string;
  createdAt: string;
  frames: SketchpadFrame[];
}

export interface Registry {
  sketchpads: Sketchpad[];
}

export interface CanvasTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export interface PlacedElement {
  blockId: string;
  componentName: string;
  x: number;
  y: number;
  props: Record<string, string>;
}

export interface ComponentEntry {
  name: string;
  displayName: string;
  description: string;
  importPath: string;
  defaultProps: string;
  defaultContent: string;
  additionalImportsForDefaultContent: Array<{ name: string; path: string }>;
  props: Record<string, { type: string; options?: string[] }>;
  Component: React.ComponentType<any>;
  DefaultContent?: React.ComponentType<any>;
  PreviewWrapper?: React.ComponentType<any>;
}
