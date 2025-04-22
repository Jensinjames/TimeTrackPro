import Dashboard from "../components/dashboard";
import Sidebar from "../components/sidebar";

export default function HomePage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50">
        <Dashboard />
      </main>
    </div>
  );
}