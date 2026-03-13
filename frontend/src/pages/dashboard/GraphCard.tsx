import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

interface GraphCardProps {
    id: string;
    title: string;
    updatedAt: string;
    onDelete: (id: string) => void;
}

export function GraphCard({ id, title, updatedAt, onDelete }: GraphCardProps) {
    const navigate = useNavigate();

    const formattedDate = new Date(updatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    return (
        <div
            onClick={() => navigate(`/graph/${id}`)}
            className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md cursor-pointer transition-shadow relative group"
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete workflow"
            >
                <Trash2 size={16} />
            </button>

            <div className="h-32 bg-neutral-50 rounded-lg mb-4 flex items-center justify-center border border-dashed border-neutral-300">
                <span className="text-neutral-400">Model Preview</span>
            </div>
            <h3 className="font-medium text-neutral-800">{title}</h3>
            <p className="text-sm text-neutral-500 mt-1">{formattedDate}</p>
        </div>
    );
}
