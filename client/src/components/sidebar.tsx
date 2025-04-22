import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  History, 
  Settings, 
  Menu, 
  ChevronLeft,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(isMobile);
  
  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Navigation links
  const navItems = [
    { 
      href: "/", 
      label: "Dashboard", 
      icon: <LayoutDashboard size={20} />
    },
    { 
      href: "/history", 
      label: "History", 
      icon: <History size={20} />
    },
    { 
      href: "/settings", 
      label: "Settings", 
      icon: <Settings size={20} />
    }
  ];
  
  return (
    <>
      {/* Mobile header */}
      {isMobile && (
        <div className="h-16 md:hidden fixed top-0 left-0 right-0 bg-background z-30 border-b flex items-center justify-between px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleToggle}
          >
            <Menu size={24} />
          </Button>
          
          <h1 className="text-lg font-bold">Time Tracker</h1>
          
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://avatar.vercel.sh/${user?.username || 'user'}.png`} />
            <AvatarFallback>{user?.name?.[0] || user?.username?.[0] || 'U'}</AvatarFallback>
          </Avatar>
        </div>
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 md:top-0 ${isMobile ? "z-40 left-0 h-full w-64 transition-transform duration-300 ease-in-out transform shadow-lg" : "h-screen w-64 md:w-auto"}
        ${isCollapsed ? "-translate-x-full md:translate-x-0 md:w-16" : "translate-x-0"}
        bg-background border-r
      `}>
        <div className="flex flex-col h-full">
          {/* Desktop header */}
          {!isMobile && (
            <div className="h-16 flex items-center justify-between p-4 border-b">
              {!isCollapsed && <h1 className="text-lg font-bold">Time Tracker</h1>}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleToggle}
                className={isCollapsed ? "mx-auto" : ""}
              >
                {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
              </Button>
            </div>
          )}
          
          {/* Mobile header (only shows when menu is open) */}
          {isMobile && (
            <div className="h-16 flex items-center justify-between p-4 border-b">
              <h1 className="text-lg font-bold">Time Tracker</h1>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleToggle}
              >
                <ChevronLeft size={20} />
              </Button>
            </div>
          )}
          
          {/* User profile */}
          <div className={`p-4 flex ${isCollapsed ? "justify-center" : "items-center space-x-3"}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://avatar.vercel.sh/${user?.username || 'user'}.png`} />
              <AvatarFallback>{user?.name?.[0] || user?.username?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="font-medium truncate">{user?.name || user?.username}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          
          <Separator className="my-2" />
          
          {/* Navigation */}
          <nav className="flex-1 p-2">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>
                    <div className={`
                      flex items-center px-2 py-2 rounded-md cursor-pointer
                      ${location === item.href ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-gray-600 hover:text-foreground"}
                    `}>
                      <span className={isCollapsed ? "mx-auto" : "mr-3"}>{item.icon}</span>
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Logout */}
          <div className="p-2 mt-auto">
            <Button 
              variant="ghost" 
              className={`
                w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50
                ${isCollapsed ? "justify-center px-0" : ""}
              `}
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut size={20} className={isCollapsed ? "" : "mr-2"} />
              {!isCollapsed && "Logout"}
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Overlay for mobile */}
      {isMobile && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={handleToggle}
        />
      )}
    </>
  );
}