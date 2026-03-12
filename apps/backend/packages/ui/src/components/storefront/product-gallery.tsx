export function ProductGallery({
  items
}: {
  items: { src: string; alt: string }[];
}) {
  const [featured, ...rest] = items;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-[var(--radius-xl)] border">
        <img
          src={featured?.src}
          alt={featured?.alt ?? "Featured product"}
          className="aspect-[4/3] h-full w-full object-cover"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {rest.map((item) => (
          <div key={item.src} className="overflow-hidden rounded-[var(--radius-lg)] border">
            <img src={item.src} alt={item.alt} className="aspect-square h-full w-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
