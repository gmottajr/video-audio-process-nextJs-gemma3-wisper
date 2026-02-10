import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-zinc-700 text-zinc-100 hover:bg-zinc-700/80",
    destructive: "bg-red-500 text-white hover:bg-red-500/80",
    outline: "border border-zinc-700 text-zinc-300",
  }

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 ${variants[variant]} ${className || ''}`}
      {...props}
    />
  )
}

export { Badge }
