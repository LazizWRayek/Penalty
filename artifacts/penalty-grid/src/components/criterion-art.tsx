import {
  Award,
  Crown,
  Flag,
  Shield,
  Sun,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const artByCriterion: Record<string, LucideIcon> = {
  argentina: Flag,
  "world-cup": Trophy,
  liverpool: Shield,
  "premier-league": Crown,
  "la-liga": Sun,
  "serie-a": Award,
};

export function CriterionArt({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const Icon = artByCriterion[id] ?? Shield;
  return <Icon aria-hidden="true" className={cn("shrink-0", className)} />;
}