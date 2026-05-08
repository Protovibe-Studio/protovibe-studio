// Render a filesystem path with a 1px gap on each side of every separator.
// Splits on both POSIX (/) and Windows (\) separators so it works either way.
export default function PathDisplay({ path, className, title }) {
  const parts = path.split(/([\\/])/)
  return (
    <span className={className} title={title ?? path}>
      {parts.map((part, i) =>
        part === '/' || part === '\\' ? (
          <span key={i} className="mx-px">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}
