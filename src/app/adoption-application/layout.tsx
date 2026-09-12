import { Suspense } from "react"

export default function AdoptionApplicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="container-custom section-padding text-center text-muted-foreground">
          Loading adoption application...
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
