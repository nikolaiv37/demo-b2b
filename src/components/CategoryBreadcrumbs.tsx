import { Link } from 'react-router-dom'
import { ChevronRight, Home, Grid3X3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface CategoryBreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function CategoryBreadcrumbs({ items, className }: CategoryBreadcrumbsProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 flex-wrap">
        {/* Home link */}
        <li className="flex items-center">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="sr-only sm:not-sr-only">Home</span>
          </Link>
        </li>

        <li className="flex items-center">
          <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
        </li>

        {/* Categories link */}
        <li className="flex items-center">
          <Link
            to="/dashboard/categories"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Grid3X3 className="w-4 h-4" />
            <span>Categories</span>
          </Link>
        </li>

        {/* Dynamic breadcrumb items */}
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
            {item.href ? (
              <Link
                to={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

