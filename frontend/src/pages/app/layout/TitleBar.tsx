import { useStore } from "@/store/use-store";

export function TitleBar() {
  const { title, setTitle } = useStore();

  return (
    <header className="flex items-center justify-center h-12 px-4 border-b border-[#e8e7e2] bg-white shrink-0">
      <div className="flex items-center h-8 px-1 rounded-md hover:bg-[#f8f7f4] transition-colors group">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-sm font-medium text-[#57534e] bg-transparent border-none outline-none focus:text-[#1c1917] w-64 px-1 text-center"
          placeholder="Workflow Name"
          spellCheck={false}
        />
      </div>
    </header>
  );
}
