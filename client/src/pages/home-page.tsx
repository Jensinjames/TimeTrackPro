import Sidebar from "@/components/sidebar";
import Dashboard from "@/components/dashboard";

export default function HomePage() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Dashboard />
      </main>
    </div>
  );
}
