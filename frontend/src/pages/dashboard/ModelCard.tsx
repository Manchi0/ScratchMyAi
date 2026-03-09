import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ModelCardProps {
    id: string;
    title: string;
    lastEdited: string;
    // thumbnailUrl?: string; // For future approach #1
}

export function ModelCard({ id, title, lastEdited }: ModelCardProps) {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/graph`)} // Passing ID for future `/graph/${id}`
            className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
        >
            <div className="h-32 bg-neutral-50 rounded-lg mb-4 flex items-center justify-center border border-dashed border-neutral-300">
                <span className="text-neutral-400">Model Preview</span>
            </div>
            <h3 className="font-medium text-neutral-800">{title}</h3>
            <p className="text-sm text-neutral-500 mt-1">Edited {lastEdited}</p>
        </div>
    );
}
