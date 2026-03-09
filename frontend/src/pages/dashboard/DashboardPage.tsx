import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelCard } from './ModelCard';

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8f7f4] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold text-neutral-800">Your Models</h1>
          <button
            onClick={() => navigate('/graph')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + New Model
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ModelCard
            id="1"
            title="My First Neural Net"
            lastEdited="2 hours ago"
          />
        </div>
      </div>
    </div>
  );
}
