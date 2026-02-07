import { appConfig } from "@/config/app"
import { Map } from "lucide-react"

export function AppLogo() {
    return (
        <div className='flex items-center gap-2'>
            <Map className="h-6 w-6 text-primary" />
            <span className="font-semibold text-nowrap">{appConfig.name}</span>
        </div>
    )
}
