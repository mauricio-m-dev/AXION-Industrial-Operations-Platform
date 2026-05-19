import * as React from "react"
import { useTheme } from "../../src/contexts/ThemeContext"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-emerald-500 dark:text-emerald-400" />
        ),
        info: (
          <InfoIcon className="size-4 text-blue-500 dark:text-blue-400" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-amber-500 dark:text-amber-400" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-red-600 dark:text-red-400" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-zinc-500 dark:text-zinc-400" />
        ),
      }}
      style={
        {
          "--border-radius": "0px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group-[.toaster]:bg-white dark:group-[.toaster]:bg-[#0C0C0E] group-[.toaster]:text-zinc-900 dark:group-[.toaster]:text-zinc-100 group-[.toaster]:border-zinc-200 dark:group-[.toaster]:border-zinc-800 rounded-none shadow-2xl border-l-4 border-l-[#DC2626] p-4 flex items-center gap-3 font-semibold transition-colors duration-300",
          description: "text-zinc-500 dark:text-zinc-400 font-medium",
          success: "group-[.toaster]:border-l-emerald-500",
          error: "group-[.toaster]:border-l-red-600",
          info: "group-[.toaster]:border-l-zinc-500",
          warning: "group-[.toaster]:border-l-amber-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
