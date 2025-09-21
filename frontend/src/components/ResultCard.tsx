export default function ResultCard({
  title,
  snippet,
  source,
  link,
}: {
  title: string;
  snippet: string;
  source: string;
  link: string;
}) {
  return (
    <div className="p-4 bg-white rounded-lg shadow hover:shadow-md transition">
      <a href={link} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">
        {title}
      </a>
      <p className="text-sm text-gray-600 mt-1">{snippet}</p>
      <p className="text-xs text-gray-400 mt-2">{source}</p>
    </div>
  );
}
