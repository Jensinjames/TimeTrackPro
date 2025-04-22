import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, BarChart, PlusCircle, History, LineChart, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const menuItems = [
    {
      icon: <BarChart className="h-5 w-5" />,
      text: "Dashboard",
      path: "/",
    },
    {
      icon: <PlusCircle className="h-5 w-5" />,
      text: "Add Entry",
      path: "/add",
    },
    {
      icon: <History className="h-5 w-5" />,
      text: "History",
      path: "/history",
    },
    {
      icon: <LineChart className="h-5 w-5" />,
      text: "Reports",
      path: "/reports",
    },
    {
      icon: <Settings className="h-5 w-5" />,
      text: "Settings",
      path: "/settings",
    },
  ];
  
  return (
    <aside className="w-16 sm:w-64 bg-white shadow-md flex-shrink-0 border-r border-gray-200">
      <div className="h-full flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="text-blue-600 text-2xl sm:text-xl">
              <i className="fas fa-clock"></i>
            </div>
            <h1 className="ml-2 text-xl font-bold hidden sm:block">Rollen</h1>
          </div>
        </div>
        
        <nav className="flex-1 py-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center py-2 px-4 hover:bg-gray-100 transition-colors",
                location === item.path ? "bg-gray-100 text-gray-700" : "text-gray-600"
              )}
            >
              <div className="w-6 flex justify-center sm:mr-3">
                {item.icon}
              </div>
              <span className="hidden sm:block">{item.text}</span>
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center py-2 px-4 text-gray-600 hover:bg-gray-100 rounded-md w-full transition-colors"
            disabled={logoutMutation.isPending}
          >
            <div className="w-6 flex justify-center sm:mr-3">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="hidden sm:block">
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
