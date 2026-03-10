import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import { saveWorkflow } from "@/lib/supabaseFunctions";

export function TitleBar() {
  const { workflowId, setWorkflowId, title, setTitle, nodes, edges } = useStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);

    try {
      const id = await saveWorkflow(user.id, {
        id: workflowId,
        title,
        nodes,
        edges,
      });
      setWorkflowId(id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save workflow:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="flex items-center justify-between h-12 px-2.5 border-b border-[#e8e7e2] bg-white shrink-0">
      <div className="w-24">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          title="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="flex items-center h-8 px-1 rounded-md hover:bg-[#f8f7f4] transition-colors group">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-sm font-medium text-[#57534e] bg-transparent border-none outline-none focus:text-[#1c1917] w-64 px-1 text-center"
          placeholder="Untitled"
          spellCheck={false}
        />
      </div>

      <div className="w-24 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-neutral-900 text-white hover:bg-neutral-800 px-4 py-1.5 shadow-sm"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>
    </header>
  );
}
