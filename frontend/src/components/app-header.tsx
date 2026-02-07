import { Link, NavLink } from 'react-router-dom'
import { mainMenu } from '@/config/menu'
import { cn } from '@/lib/utils'
import { AppLogo } from './app-logo'
import { AppSidebar } from './app-sidebar'
import { ModeToggle } from './mode-toggle'

export function AppHeader() {
    return (
        <header className="bg-background sticky top-0 z-50 border-b">
            <div className="w-full max-w-7xl mx-auto flex items-center gap-2 h-14 px-4 md:px-8">
                <div className='flex items-center gap-2 md:gap-0'>
                    <AppSidebar />
                    <Link to="/">
                        <AppLogo />
                    </Link>
                </div>

                <div className='ml-4 flex-1 flex items-center justify-between'>
                    <nav className="hidden md:flex gap-1">
                        {mainMenu.map((item, index) => (
                            <NavLink
                                key={index}
                                to={item.url}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-2 overflow-hidden rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}>
                                {item.icon && <item.icon className="h-4 w-4" />}
                                <span>{item.title}</span>
                            </NavLink>
                        ))}
                    </nav>
                    <ModeToggle />
                </div>
            </div>
        </header>
    )
}
