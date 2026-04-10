"use client";

import {
  Building2,
  Cog,
  Factory,
  Heart,
  Users,
  Rabbit,
  Home,
  Flower2,
  Paintbrush,
  Smile,
  Circle,
  Crown,
  Coffee,
  Trophy,
  Star,
  Plane,
  Ship,
  Car,
  Footprints,
  Gamepad2,
  Book,
  Mail,
  Phone,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  structure: Building2,
  cogs: Cog,
  factory: Factory,
  hearts: Heart,
  family: Users,
  bunny: Rabbit,
  house: Home,
  flower: Flower2,
  roller: Paintbrush,
  smiley: Smile,
  yinyang: Circle,
  crown: Crown,
  cup: Coffee,
  first: Trophy,
  star: Star,
  plane: Plane,
  boat: Ship,
  car: Car,
  runner: Footprints,
  batball: Gamepad2,
  book: Book,
  letter: Mail,
  phone: Phone,
  ladder: TrendingUp,
};

type ContextSymbolProps = {
  icon: string | null | undefined;
  className?: string;
};

export function ContextSymbol({ icon, className }: ContextSymbolProps) {
  if (!icon) return null;
  const Icon = iconMap[icon];
  if (!Icon) return null;
  return <Icon className={cn("size-3.5 shrink-0", className)} />;
}
