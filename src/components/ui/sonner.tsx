import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      offset={20}
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg text-[15px] sm:text-base px-4 py-3 rounded-xl",
          title: "text-[15px] sm:text-base font-semibold",
          description: "group-[.toast]:text-muted-foreground text-[14px] sm:text-[15px]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground text-[14px] px-3 py-1.5",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground text-[14px] px-3 py-1.5",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
