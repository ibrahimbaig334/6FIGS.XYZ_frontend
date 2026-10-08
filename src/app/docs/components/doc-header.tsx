/**
 * Handbook page header: display title, mono lede. Chapter context lives in
 * the sticky nav. Server component; pages stay static.
 */
export function DocHeader({
  title,
  lede,
}: {
  title: React.ReactNode;
  lede: React.ReactNode;
}) {
  return (
    <>
      <h1 className="docs-title">{title}</h1>
      <p className="docs-lede">{lede}</p>
    </>
  );
}
