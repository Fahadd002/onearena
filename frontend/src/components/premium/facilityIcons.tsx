import {
    Car,
    Users,
    ShowerHead as Shower,
    Wifi,
    Lightbulb,
    Utensils,
    Coffee,
    Shield,
    Clock,
} from "lucide-react";
import type { ComponentType } from "react";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
    Parking: Car,
    "Changing room": Users,
    Shower: Shower,
    "Wi-Fi": Wifi,
    Floodlights: Lightbulb,
    Restaurant: Utensils,
    Cafe: Coffee,
    Security: Shield,
    Toilets: Users,
    "Seating area": Users,
};

export function FacilityIcon({
    name,
    className = "h-4 w-4",
}: {
    name: string;
    className?: string;
}) {
    const IconComponent = iconMap[name] ?? Clock;
    return <IconComponent className={className} />;
}
