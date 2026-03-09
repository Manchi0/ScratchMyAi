import { useStore } from "@/store/use-store";

export function TitleBar() {
  const { title, setTitle } = useStore();

  return (
    <header className="flex items-center justify-between h-12 px-2.5 border-b border-[#e8e7e2] bg-white shrink-0">
      <div className="w-24"></div>

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
          onClick={() => {
            // TODO: Implement save functionality
            console.log("Saving graph...", title);
          }}
          className="whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-neutral-900 text-white hover:bg-neutral-800 px-4 py-1.5 shadow-sm"
        >
          Save
        </button>
      </div>
    </header>
  );
}
