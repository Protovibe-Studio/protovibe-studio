# AGENTS.md: Protovibe AI Engineering Rules

Protovibe is an AST-based visual builder that reads and writes React code directly. Because it relies on static AST parsing and specific DOM data-attributes to map the canvas to the code, you must adhere to these strict architectural rules based on the task you are performing.

## 1. Creating New Views and Elements

When building out application pages (e.g., `Dashboard.tsx`, `App.tsx`), Protovibe requires specific AST structures to track, move, and edit elements safely on the canvas.

### Rule: Always check component definitions from component/ui folder before using them
Never guess the components structure! Always read the files from @src/components/ui before creating a new view.

### Rule: Zone and Block IDs in Application Pages

When writing blocks anywhere outside a component's `PvDefaultContent` definition, you MUST manually assign a matching random 6-character alphanumeric ID to the comment tags and the root element's `data-pv-block` attribute. Without IDs, the visual builder's Cut, Copy, and Delete actions will fail.

* **❌ BAD: Missing IDs in an app page**

  ```jsx
  {/* pv-editable-zone-start */}
    {/* pv-block-start */}
    <h2 data-pv-block="">Heading</h2>
    {/* pv-block-end */}
  {/* pv-editable-zone-end */}
  ```

* **✅ GOOD: Explicit IDs in an app page**

  ```jsx
  {/* pv-editable-zone-start:x1y2z3 */}
    {/* pv-block-start:a4b5c6 */}
    <h2 data-pv-block="a4b5c6">Heading</h2>
    {/* pv-block-end:a4b5c6 */}
  {/* pv-editable-zone-end:x1y2z3 */}
  ```

### Rule: Block Granularity

Every direct sibling inside a zone gets its own `pv-block` pair. Do not collapse simple static UI into one large block. If a section contains elements that can be reordered or edited independently, break it down. Dividers made with custom divs should also be a separate block so that user can delete them.

* **❌ BAD: Too coarse (One block wrapping an entire grid of cards)**

  ```jsx
  {/* pv-block-start:g6h7j8 */}
  <div data-pv-block="g6h7j8" className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card variant="bordered">...</Card>
    <Card variant="bordered">...</Card>
  </div>
  {/* pv-block-end:g6h7j8 */}
  ```

* **✅ GOOD: Granular blocks and inner zones**

  ```jsx
  {/* pv-block-start:g6h7j8 */}
  <div data-pv-block="g6h7j8" className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* pv-editable-zone-start:a1b2c3 */}
    
      {/* pv-block-start:d4e5f6 */}
      <Card data-pv-block="d4e5f6" variant="bordered">
        {/* pv-editable-zone-start:g7h8i9 */}
          {/* pv-block-start:m4n5o6 */}
          <TextBlock data-pv-block="m4n5o6" typography="heading-xxl">142</TextBlock>
          {/* pv-block-end:m4n5o6 */}
        {/* pv-editable-zone-end:g7h8i9 */}
      </Card>
      {/* pv-block-end:d4e5f6 */}

      {/* pv-block-start:x1y2z3 */}
      <div data-pv-block="x1y2z3" className="w-full h-px bg-border-default" />
      {/* pv-block-end:x1y2z3 */}

      {/* pv-block-start:p9q8r7 */}
      <Card data-pv-block="p9q8r7" variant="bordered">
        {/* pv-editable-zone-start:v4b5n6 */}
          {/* pv-block-start:k1l2m3 */}
          <TextBlock data-pv-block="k1l2m3" typography="heading-xxl">87</TextBlock>
          {/* pv-block-end:k1l2m3 */}
        {/* pv-editable-zone-end:v4b5n6 */}
      </Card>
      {/* pv-block-end:p9q8r7 */}

    {/* pv-editable-zone-end:a1b2c3 */}
  </div>
  {/* pv-block-end:g6h7j8 */}
  ```

### Rule: The Root Node & `...props` Forwarding

A Protovibe-compatible component must return a concrete root HTML element (e.g., `<div>`, `<button>`) and spread `...props` onto it. Never use fragments as the root. If rendering a wrapper `<div>` around a native input, spread props on the outer div, not the inner input.

* **❌ BAD: Fragment root or spreading on inner element**

  ```tsx
  export function Input({ placeholder, onChange, ...props }) {
    return (
      <div className="border">
        <input placeholder={placeholder} onChange={onChange} {...props} /> 
      </div>
    );
  }
  ```

* **✅ GOOD: Spread on root element**

  ```tsx
  export interface InputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    placeholder?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
  }
  export function Input({ placeholder, onChange, ...rest }: InputProps) {
    return (
      <div {...rest} className="border">
        <input placeholder={placeholder} onChange={onChange} />
      </div>
    );
  }
  ```

### Rule: Reuse Existing Components

Never create custom HTML elements (`<button>`, `<input>`) when an existing component can achieve the same result.

* **❌ BAD: Custom HTML for standard UI**

  ```tsx
  <button className="flex items-center justify-center p-2 rounded hover:bg-gray-100">
    <Icon name="close" />
  </button>
  ```

* **✅ GOOD: Reuse existing components**

  ```tsx
  <Button variant="ghost" iconOnly leftIcon="close" />
  ```

## 2. Components Editing (Configuring for the Visual Builder)

When creating or editing reusable components in `src/components/ui/`, they must be registered via `pvConfig`.

### Rule: One `pvConfig` Per File

The scanner strictly looks for `export const pvConfig`. You cannot rename it or have multiple configurations in a single file.

* **❌ BAD: Renamed or multiple configs**

  ```ts
  export const dropdownListPvConfig = { ... };
  export const dropdownItemPvConfig = { ... };
  ```

* **✅ GOOD: Exact naming, one per file**

  ```ts
  export const pvConfig = { name: 'DropdownList', ... };
  ```

### Rule: Component Identity (`componentId`)

Every component with a config must explicitly render a `data-pv-component-id` matching its name to resolve the properties panel.

* **❌ BAD: Missing tracking ID**

  ```tsx
  export function DropdownItem({ ...props }) {
    return <div {...props} />;
  }
  ```

* **✅ GOOD: Explicit tracking ID placed AFTER `...props`**

  ```tsx
  export function DropdownItem({ ...props }) {
    return <div {...props} data-pv-component-id="DropdownItem" />;
  }
  ```

### Rule: Import Paths (Always use `@/` alias)

All application imports and `pvConfig.importPath` values must use the `@/` alias. Never use relative paths (`./` or `../`) anywhere in `src/`.

* **❌ BAD: Relative imports**

  ```ts
  import { Button } from './components/ui/button';
  export const pvConfig = { importPath: 'components/ui/button', ... };
  ```

* **✅ GOOD: Aliased imports**

  ```ts
  import { Button } from '@/components/ui/button';
  export const pvConfig = { importPath: '@/components/ui/button', ... };
  ```

### Rule: `pvConfig` Schema and Example

Every editable component must export a `pvConfig` object that defines how it is handled in the visual editor.

| **Field** | **Type** | **Description** | 
| **`name`** | `string` | The exact exported name of the React component. | 
| **`displayName`** | `string` | The human-readable name shown in the menu. | 
| **`description`** | `string` | A short subtitle explaining what the component does. | 
| **`importPath`** | `string` | The absolute or aliased path to inject (e.g., `"@/components/ui/button"`). | 
| **`defaultProps`** | `string` | Default props injected into the opening tag (e.g., `variant="outline" label="New"`). | 
| **`defaultContent`** | `JSX` | Always a JSX reference to an exported `<PvDefaultContent />` component defined in the same file.| 
| **`additionalImportsForDefaultContent`** | `{ name, path }[]` | Component imports needed if `defaultContent` is complex JSX. | 
| **`props`** | `object` | Schema defining which props are editable (`string`, `boolean`, `select`). | 
| **`invalidCombinations`** | `array` | Optional array of predicates filtering broken states from the UI matrix. | 

* **❌ BAD: Config missing required fields**

  ```typescript
  export const pvConfig = {
    name: "Button",
    // Missing importPath, componentId, etc.
    props: { label: "string" } // Invalid schema syntax
  };
  ```

* **✅ GOOD: Full `pvConfig` example**

  ```typescript
  import { icons } from 'lucide-react';
  
  export function PvDefaultContent() {
    return (
      <>
        {/* pv-editable-zone-start */}
        {/* pv-editable-zone-end */}
      </>
    );
  }
  
  export const pvConfig = {
    name: "Button", 
    componentId: "Button",
    displayName: "Button", 
    description: "A standard button with variants and icon support.",
    importPath: "@/components/ui/button", 
    defaultProps: `variant="default" label="Click me"`, 
    defaultContent: <PvDefaultContent />,
    props: {
      variant: { type: "select", options: ["default", "destructive", "outline", "ghost"] },
      size: { type: "select", options: ["default", "sm", "lg", "icon"] },
      disabled: { type: "boolean" },
      label: { type: "string" },
      suffixIcon: { type: "select", options: Object.keys(icons) },
    }
  };
  ```

### Rule: Safe Prop Types

Only expose `string`, `boolean`, and `select` (string enums) inside `pvConfig.props`. Never expose functions (`onClick`) or React Nodes (`children`, `asChild`). Atomic elements must expose text via a `label` prop, while container elements must use `children`.

* **❌ BAD: Exposing complex, unserializable React props**

  ```typescript
  props: {
    onClick: { type: 'function' },
    asChild: { type: 'boolean' },
    children: { type: 'node' }
  }
  ```

* **✅ GOOD: Exposing primitive visual variants and string labels**

  ```typescript
  props: {
    variant: { type: 'select', options: ['default', 'destructive'] },
    disabled: { type: 'boolean' },
    label: { type: 'string' }
  }
  ```

### Rule: Text in Children vs. Props (`allowTextInChildren`)

Components strictly dictate how they receive text. If a component's `pvConfig` contains `allowTextInChildren: true` (e.g., `TextBlock`), you MUST pass text as a direct JSX child. If it does not contain this property, you MUST NOT pass text as a child; you must use the designated props (like `label`, `heading`, or `primaryText`).

* **❌ BAD: Passing text as a child when not allowed**

  ```tsx
  <InfoBoxBanner>Welcome back!</InfoBoxBanner>
  ```

* **✅ GOOD: Using props for restricted components, and children for allowed components**

  ```tsx
  <InfoBoxBanner heading="Welcome back!" />
  <TextBlock>This text is perfectly fine here.</TextBlock>
  ```

### Rule: Suppress Invalid Combinations (`invalidCombinations`)

Use `invalidCombinations` in `pvConfig` to suppress nonsensical or visually broken prop combinations from the Component Playground matrix.

* **❌ BAD: Allowing impossible states to be tested**

  ```typescript
  // The matrix will attempt to render a button with iconOnly=true but no icons selected
  props: { iconOnly: { type: 'boolean' }, leftIcon: { type: 'select', options: [...] } }
  ```

* **✅ GOOD: Filtering broken combinations**

  ```typescript
  invalidCombinations: [
    (props) => !!props.iconOnly && !props.leftIcon && !props.rightIcon,
    (props) => !!props.prefixIcon && !!props.prefixText,
  ],
  ```

### Rule: Always Use `PvDefaultContent` for `defaultContent`

To maintain consistency `defaultContent` in `pvConfig` MUST ALWAYS reference an exported component named `PvDefaultContent`, defined *before* `pvConfig` in the same file. Never use strings (like `''` or `'Text'`) or inline JSX.

If the component is self-closing and has no default children, `PvDefaultContent` must return an empty fragment `<></>`.

* **❌ BAD: String values or inline JSX**

  ```tsx
  export const pvConfig = {
    defaultContent: '', // ❌ BAD: Empty string instead of component
    // OR
    defaultContent: 'Just text', // ❌ BAD: Text string instead of component
    // OR
    defaultContent: <div data-pv-block="">Static</div> // ❌ BAD: Inline JSX breaks HMR
  };
  ```

* **✅ GOOD: Empty `PvDefaultContent` (For self-closing components like Button or Icon)**

  ```tsx
  export function PvDefaultContent() {
    return <></>;
  }
  export const pvConfig = { defaultContent: <PvDefaultContent /> };
  ```

* **✅ GOOD:  `PvDefaultContent` with bare ID-less pv tags (For containers like Card that expect other children elements)**

  ```tsx
  export function PvDefaultContent() {
    return (
      <>
        {/* pv-editable-zone-start */}
        {/* pv-editable-zone-end */}
      </>
    );
  }
  export const pvConfig = { defaultContent: <PvDefaultContent /> };
  ```

* **✅ GOOD: Complex `PvDefaultContent` with bare ID-less pv tags (For components that should have multiple children composed from other components like Select dropdown)**

  ```tsx
  export function PvDefaultContent() {
    return (
      <>
        {/* pv-editable-zone-start */}
          {/* pv-block-start */}
          <ChildComponent data-pv-block="" label="Example" />
          {/* pv-block-end */}
          {/* pv-block-start */}
          <ChildComponent data-pv-block="" label="Example" />
          {/* pv-block-end */}
        {/* pv-editable-zone-end */}
      </>
    );
  }
  export const pvConfig = { defaultContent: <PvDefaultContent /> };
  ```

### Rule: Optional Protovibe Preview Wrapper for Special Cases

If previewing a component requires semantic parent HTML (for example, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`, `<li>`), export `PvPreviewWrapper` in the same file as `pvConfig`.

Most components should NOT define `PvPreviewWrapper`. Leave it out by default, and add it only when standalone preview markup would be invalid.

* **✅ GOOD: Add PvPreviewWrapper only for semantic-context components**

  ```tsx
  export function TableCellContent({ children, ...props }: TableCellContentProps) {
    return <td {...props}>{children}</td>;
  }

  export function PvPreviewWrapper({ children }: { children: React.ReactNode }) {
    return <table className="w-full"><tbody><tr>{children}</tr></tbody></table>;
  }

  export function PvDefaultContent() {
    ...
  }

  export const pvConfig = {
    ...
  };
  ```

## 3. Styling Elements

The visual editor directly manipulates Tailwind class strings in the AST.

### Rule: Static Tailwind Strings

Do not use JS evaluation, `cva`, conditional logic (`&&`), or ternaries inside `className`. Express all variants and boolean states via native data-attribute modifiers. Use `cn()` ONLY to merge a single, static string of internal classes with the external `className` prop.

* **❌ BAD: Dynamic compilation or JS logic that the AST parser cannot safely read**

  ```tsx
  <div className={`bg-${color}-500`} />
  <div className={variant === 'ghost' ? 'bg-transparent' : 'bg-blue'} />
  <Icon className={cn("base-classes", selected && "opacity-100")} />
  ```

* **✅ GOOD: Static strings using data attributes for variants and booleans**

  ```tsx
  <button 
    data-variant={variant}
    data-selected={selected} 
    className={cn("base-classes data-[variant=ghost]:bg-transparent data-[selected=true]:opacity-100", className)}
  />
  ```

### Rule: Expose Variant Props to the DOM

Every prop that dictates a visual variant (e.g., `variant`, `size`) MUST be explicitly passed to the root DOM element as a `data-*` attribute. This allows the editor to read the active state.

* **❌ BAD: Hiding variants from the DOM**

  ```tsx
  <button className={cn("base-classes", className)}>
  ```

* **✅ GOOD: Exposing variants via data attributes**

  ```tsx
  <button data-variant={variant} data-size={size} className={cn("...", className)}>
  ```

### Rule: Semantic Color Tokens Only

Never use Tailwind's default palette colors (`bg-blue-500`) or hardcoded hexes. Always reference the semantic design tokens defined in `src/index.css`.

* **❌ BAD: Hardcoded or default palette tokens**

  ```tsx
  <span className="text-gray-600 bg-blue-300 border-[#9CA3AF]">
  ```

* **✅ GOOD: Semantic design tokens**

  ```tsx
  <span className="text-foreground-secondary bg-background-tertiary border-border-primary">
  ```

### Rule: Strict Composition (No Style Exports)

Do not export variant functions (like `cva` configs). Components must be entirely independent. 

* **❌ BAD: Exporting style variants**

  ```tsx
  export const buttonVariants = cva(...)
  // In another file: <div className={buttonVariants({ variant: 'ghost' })} />
  ```

## 4. Adding Interaction

### Rule: Compound Components (Context State)

Certain parent-child component pairs manage item state implicitly via React Context (e.g., `Tabs`, `RadioGroup`).

* **❌ BAD: Manually wiring state to a grouped child**

  ```tsx
  <RadioGroup value={val}>
    <RadioItem value="a" selected={val === 'a'} onClick={() => setVal('a')} />
  </RadioGroup>
  ```

* **✅ GOOD: Letting Context handle it implicitly**

  ```tsx
  <RadioGroup value={val} onValueChange={setVal}>
    <RadioItem value="a" label="Option A" />
  </RadioGroup>
  ```

### Rule: Floating UI

Inspector containers clip descendants due to `overflow: hidden`. Floating UI must escape this.

* **❌ BAD: Absolute positioning inside the component wrapper**

  ```tsx
  {isOpen && <div className="absolute top-10 left-0">Dropdown</div>}
  ```

* **✅ GOOD: Fixed positioning via Portals**

  ```tsx
  {isOpen && createPortal(
    <div ref={dropdownRef} style={{ ...style, position: 'fixed' }} />,
    document.body
  )}
  ```

### Rule: Unified Icons

Do not import specific icons directly. Use the centralized `Icon` component so the visual builder can swap them dynamically.

* **❌ BAD: Direct Lucide imports**

  ```tsx
  import { Download } from 'lucide-react';
  <Download className="w-4 h-4" />
  ```

* **✅ GOOD: Unified wrapper**

  ```tsx
  import { Icon } from '@/components/ui/icon';
  <Icon name="Download" size="sm" />
  ```

### Rule: Don't set component size property unless it's justified

Components should have a default size when property size is not set. Use a different size like (`sm`) only when the component is intentionally de-emphasized—such as in secondary actions, nested containers, or auxiliary controls. 


* **❌ BAD: Small as default**

  ```tsx
  <Button size="sm" label="Create Project" />
  ```

* **✅ GOOD: no size defined

  ```tsx
  <Button label="Create Project" />
  ```

### Rule: Avoid Custom Text Styles—Use TextBlock with Typography Property

Never add custom Tailwind classes for text styling. Instead, use the `TextBlock` component with its `typography` property to apply predefined, consistent text styles. This keeps your design system cohesive and makes the visual builder's text variant control work properly.

* **❌ BAD: Custom classes for styling**
  ```tsx
  <TextBlock className="uppercase font-bold text-sm">Section Title</TextBlock>
  ```

* **❌ BAD: all caps hardcoded**
  ```tsx
  <TextBlock className="font-bold text-sm">SECTION TITLE</TextBlock>
  ```

* **✅ GOOD: Typography property selects predefined style**
  ```tsx
  <TextBlock typography="all-caps">Section Title</TextBlock>
  ```

### Rule: Use Tailwind Background Images Instead of `<img>` Tags

When adding static images (PNG, JPG, SVG) as visual elements in application pages, use a `<div>` with Tailwind's `bg-[url(...)]` arbitrary value instead of an `<img>` tag. This allows the visual builder's Background Image inspector to manage the image — including replacing, repositioning, and removing it — without manual code edits. Images uploaded through Protovibe are stored in `src/images/from-protovibe/`.

* **❌ BAD: Using an `<img>` tag for a decorative/layout image**

  ```tsx
  <img src="/src/images/from-protovibe/hero-bg.svg" width="400" height="300" alt="" />
  ```

* **✅ GOOD: Tailwind background image on a container `<div>`**

  ```tsx
  <div className="bg-[url('/src/images/from-protovibe/hero-bg.svg')] bg-contain bg-center bg-no-repeat aspect-[4/3]" />
  ```
