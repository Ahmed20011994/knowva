import { AlertCircle } from "lucide-react";

export default function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded">
      <div className="flex items-center gap-2 text-red-700">
        <AlertCircle size={18} />
        <span className="font-semibold">Error:</span>
      </div>
      <p className="text-sm text-red-700 mt-1">{message}</p>
    </div>
  );
}
