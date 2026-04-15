/** Parse a pvConfig.defaultProps string like `variant="default" label="Click me"` into plain props. */
export function parseDefaultProps(defaultProps: string): Record<string, any> {
  const result: Record<string, any> = {};
  const re = /(\w[\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|\{(true|false)\}))?(?=[\s>]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(defaultProps)) !== null) {
    const [, key, dq, sq, boolStr] = m;
    if (dq !== undefined) result[key] = dq;
    else if (sq !== undefined) result[key] = sq;
    else if (boolStr !== undefined) result[key] = boolStr === 'true';
    else result[key] = true;
  }
  return result;
}
