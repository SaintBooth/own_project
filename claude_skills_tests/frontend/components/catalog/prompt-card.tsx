import Link from "next/link";
import { Tag, Eye, ShoppingBag, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PromptListItem } from "@/lib/api";

interface PromptCardProps {
  prompt: PromptListItem;
}

function formatPrice(price: string, isFree: boolean): string {
  if (isFree || price === "0" || price === "0.00") return "Бесплатно";
  const num = parseFloat(price);
  return `${num.toLocaleString("ru-RU")} ₽`;
}

export function PromptCard({ prompt }: PromptCardProps) {
  return (
    <Link
      href={`/prompts/${prompt.slug}`}
      className="group block"
      prefetch={false}
    >
      <article className="relative h-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 hover:border-purple-500/40 hover:bg-zinc-900/80 transition-all duration-200">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          {prompt.category && (
            <Badge
              variant="outline"
              className="border-zinc-700 text-zinc-500 bg-zinc-800/50 text-[10px] font-mono shrink-0"
            >
              {prompt.category.name}
            </Badge>
          )}
          <span
            className={cn(
              "text-sm font-semibold font-mono ml-auto shrink-0",
              prompt.is_free ? "text-green-400" : "text-purple-300",
            )}
          >
            {formatPrice(prompt.price, prompt.is_free)}
          </span>
        </div>

        {/* Title */}
        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2 group-hover:text-purple-300 transition-colors">
            {prompt.title}
          </h3>
          <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">
            {prompt.short_description}
          </p>
        </div>

        {/* Tags */}
        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {prompt.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-zinc-600 bg-zinc-800 font-mono"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag.name}
              </span>
            ))}
            {prompt.tags.length > 3 && (
              <span className="text-[10px] text-zinc-700 font-mono">
                +{prompt.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
          <div className="flex items-center gap-1 text-zinc-600 text-xs">
            <User className="w-3 h-3" />
            <span className="font-mono">{prompt.seller.username}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-zinc-700 text-xs">
              <Eye className="w-3 h-3" />
              <span>{prompt.views_count.toLocaleString("ru-RU")}</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-700 text-xs">
              <ShoppingBag className="w-3 h-3" />
              <span>{prompt.purchases_count.toLocaleString("ru-RU")}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function PromptCardSkeleton() {
  return (
    <div className="h-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 w-20 bg-zinc-800 rounded" />
        <div className="h-5 w-16 bg-zinc-800 rounded ml-auto" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-4/5" />
        <div className="h-3 bg-zinc-800/60 rounded w-full" />
        <div className="h-3 bg-zinc-800/60 rounded w-3/4" />
      </div>
      <div className="flex gap-1">
        <div className="h-4 w-14 bg-zinc-800 rounded" />
        <div className="h-4 w-14 bg-zinc-800 rounded" />
      </div>
      <div className="flex justify-between pt-2 border-t border-zinc-800/60">
        <div className="h-3 w-20 bg-zinc-800 rounded" />
        <div className="h-3 w-12 bg-zinc-800 rounded" />
      </div>
    </div>
  );
}
