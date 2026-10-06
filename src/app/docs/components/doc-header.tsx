/**
 * Handbook page header: chapter eyebrow, display title, mono lede.
 * Server component — pages stay static.
 */
export function DocHeader({
  index,
  chapter,
  title,
  lede,
}: {
  index: string;
  chapter: string;
  title: React.ReactNode;
  lede: React.ReactNode;
}) {
  return (
    <>
      <p className="docs-eyebrow">
        {index} — {chapter}
      </p>
      <h1 className="docs-title">{title}</h1>
      <p className="docs-lede">{lede}</p>
    </>
  );
}
