import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-cream flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-28 lg:pb-12">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
};
