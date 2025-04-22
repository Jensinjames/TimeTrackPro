import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  BarChart, 
  Calendar, 
  Settings, 
  Menu, 
  X, 
  LogOut 
} from "lucide-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  
  const navigationItems = [
    { name: "Dashboard", path: "/", icon: <BarChart className="w-5 h-5" /> },
    { name: "History", path: "/history", icon: <Calendar className="w-5 h-5" /> },
    { name: "Settings", path: "/settings", icon: <Settings className="w-5 h-5" /> },
  ];
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };
  
  const closeSidebar = () => {
    if (isMobile && isOpen) {
      setIsOpen(false);
    }
  };
  
  return (
    <>
      {/* Mobile Hamburger Menu */}
      {isMobile && (
        <button 
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 bg-white p-2 rounded-md shadow-md"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}
      
      {/* Sidebar */}
      <div 
        className={`
          fixed md:static h-full bg-white shadow-lg z-40 transition-all duration-300
          ${isMobile ? (isOpen ? "left-0" : "-left-64") : "left-0"}
          w-64
        `}
      >
        <div className="flex flex-col h-full p-4">
          {/* App Name and Logo */}
          <div className="flex items-center mb-8 mt-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-white mr-2">
              <i className="fa-solid fa-clock text-sm"></i>
            </div>
            <h1 className="font-bold text-xl">Timetrack</h1>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex-1">
            <ul className="space-y-1">
              {navigationItems.map((item) => (
                <li key={item.path}>
                  <Link href={item.path}>
                    <a 
                      onClick={closeSidebar}
                      className={`
                        flex items-center px-3 py-2 rounded-md transition-colors
                        ${location === item.path 
                          ? "bg-primary text-white" 
                          : "text-gray-700 hover:bg-gray-100"}
                      `}
                    >
                      {item.icon}
                      <span className="ml-3">{item.name}</span>
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* User and Logout */}
          <div className="pt-4 border-t">
            <div className="flex items-center mb-4">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-white">{user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">{user?.name || user?.username}</p>
                <p className="text-xs text-gray-500 truncate max-w-[160px]">{user?.email}</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {logoutMutation.isPending ? "Logging out..." : "Log out"}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}