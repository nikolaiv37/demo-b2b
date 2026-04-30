import { cn } from '@/lib/utils'
import { HTMLAttributes, ReactNode } from 'react'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function GlassCard({ children, className, hover = false, ...props }: GlassCardProps) {
  return (
    <div
      {...props}
      className={cn(
        'glass-card',
        hover && 'glass-hover cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}
