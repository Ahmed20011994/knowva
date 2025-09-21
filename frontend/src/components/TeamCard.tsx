// components/TeamCard.tsx
import React from 'react';
import { Users, Zap } from 'lucide-react';

interface TeamCardProps {
  id: string;
  name: string;
  users: number;
  integrations: string[];
}

const TeamCard: React.FC<TeamCardProps> = ({ 
  id, 
  name, 
  users, 
  integrations 
}) => {

  return (
    <div className="flex flex-col p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{name}</h3>
      <div className="flex items-center text-gray-500 mb-2">
        <Users size={16} className="mr-2" />
        <span className="text-sm">{users} Members</span>
      </div>
      <div className="flex items-center text-gray-500">
        <Zap size={16} className="mr-2" />
        <span className="text-sm">{integrations.length} Integrations</span>
      </div>
      {integrations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {integrations.slice(0, 3).map((integration) => (
            <span
              key={integration}
              className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
            >
              {integration}
            </span>
          ))}
          {integrations.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
              +{integrations.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamCard;