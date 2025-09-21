export default function CitationTag({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block text-xs text-blue-600 hover:underline px-2 py-1 bg-blue-50 rounded"
    >
      {label}
    </a>
  );
}
