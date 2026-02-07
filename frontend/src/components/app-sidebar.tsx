import { Menu } from "lucide-react"
import { mainMenu } from '@/config/menu'
import { NavLink } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { cn } from '@/lib/utils'

export function AppSidebar() {
    return (
        <SidebarProvider>
            <div className="flex items-center md:hidden">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-56 overflow-hidden rounded-lg p-0"
                        align="start">
                        <Sidebar collapsible="none" className="bg-transparent">
                            <SidebarContent>
                                <SidebarGroup>
                                    <SidebarGroupContent className="gap-0">
                                        <SidebarMenu>
                                            {mainMenu.map((item, index) => (
                                                <SidebarMenuItem key={index}>
                                                    <SidebarMenuButton asChild>
                                                        <NavLink
                                                            to={item.url}
                                                            className={({ isActive }) => cn(
                                                                'flex items-center gap-2 cursor-pointer',
                                                                isActive && 'bg-muted'
                                                            )}>
                                                            {item.icon && <item.icon className="h-4 w-4" />}
                                                            <span>{item.title}</span>
                                                        </NavLink>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            ))}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                            </SidebarContent>
                        </Sidebar>
                    </PopoverContent>
                </Popover>
            </div>
        </SidebarProvider>
    )
}
