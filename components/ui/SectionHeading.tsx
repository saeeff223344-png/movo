export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-sm font-bold text-brand-400">{eyebrow}</span>
      <h2 className="mt-3 text-balance text-3xl font-extrabold text-primary sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-balance text-secondary">{description}</p>
      )}
    </div>
  );
}
