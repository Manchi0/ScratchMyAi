import React from "react";
import { Brain, Network, GraduationCap, Blocks, LogOut } from "lucide-react";
import { Avatar, Badge, Button } from "@heroui/react";
import { useAuthStore } from '@/store/useAuthStore';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

interface DashboardSidebarProps {
  activeTab: "graphs" | "inference" | "learn";
  setActiveTab: (tab: "graphs" | "inference" | "learn") => void;
}

export function DashboardSidebar({ activeTab, setActiveTab }: DashboardSidebarProps) {
  const { user, signOut } = useAuthStore();
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'User');

  return (
    <Sidebar className="border-r border-[#e8e8e8] bg-white">
      <SidebarHeader className="p-4 flex flex-row items-center gap-3 border-b border-[#e8e8e8]">
        <div className="flex flex-col justify-center">
          <span className="text-xl font-bold text-[#111] tracking-tight leading-none">
            Axon<span className="text-3xl">X</span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-white pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "graphs"}
                  onClick={() => setActiveTab("graphs")}
                  className={`h-9 px-3 rounded-md transition-colors ${
                    activeTab === "graphs"
                      ? "bg-[#f5f5f5] text-[#111] font-semibold border border-[#e8e8e8]"
                      : "text-[#555] hover:bg-[#fafafa] hover:text-[#111] border border-transparent font-medium"
                  }`}
                >
                  <Network size={15} className="mr-2 opacity-80" />
                  <span className="text-[13px]">My Graphs</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "inference"}
                  onClick={() => setActiveTab("inference")}
                  className={`h-9 px-3 rounded-md transition-colors ${
                    activeTab === "inference"
                      ? "bg-[#f5f5f5] text-[#111] font-semibold border border-[#e8e8e8]"
                      : "text-[#555] hover:bg-[#fafafa] hover:text-[#111] border border-transparent font-medium"
                  }`}
                >
                  <Brain size={15} className="mr-2 opacity-80" />
                  <span className="text-[13px]">Inference Models</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "learn"}
                  onClick={() => setActiveTab("learn")}
                  className={`h-9 px-3 rounded-md transition-colors ${
                    activeTab === "learn"
                      ? "bg-[#f5f5f5] text-[#111] font-semibold border border-[#e8e8e8]"
                      : "text-[#555] hover:bg-[#fafafa] hover:text-[#111] border border-transparent font-medium"
                  }`}
                >
                  <GraduationCap size={15} className="mr-2 opacity-80" />
                  <span className="text-[13px]">Learning ML</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="p-4 border-t border-[#e8e8e8] bg-white mt-auto">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Avatar size="sm" className="bg-stone-200 text-stone-700">
              <Avatar.Fallback className="text-xs font-medium">{displayName.charAt(0).toUpperCase()}</Avatar.Fallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#111] leading-none line-clamp-1">
                {displayName}
               </span>
             </div>
          </div>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            onPress={() => signOut()}
            className="text-[#888] hover:text-[#111] hover:bg-[#f5f5f5]"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </Sidebar>
  );
}
