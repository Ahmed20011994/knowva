import { AlertTriangle } from "lucide-react";

export default function InsightCard({ message }: { message: string }) {
  return (
    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
      <div className="flex items-center gap-2 text-yellow-700">
        <AlertTriangle size={18} />
        <span className="font-semibold">Insight:</span>
      </div>
      <p className="text-sm text-yellow-700 mt-1">{message}</p>
    </div>
  );
}
