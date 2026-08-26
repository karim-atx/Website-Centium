import React from "react";
import { Outlet } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

export const MarketingLayout: React.FC = () => (
  <div className="min-h-screen bg-cream flex flex-col">
    <Nav />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);
