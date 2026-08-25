export function NailIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Nail polish bottle */}
      <path d="M12 2C10.9 2 10 2.9 10 4V8L7.5 10.5C6.7 11.3 6.2 12.3 6.2 13.4V18C6.2 20.2 8 22 10.2 22H13.8C16 22 17.8 20.2 17.8 18V13.4C17.8 12.3 17.3 11.3 16.5 10.5L14 8V4C14 2.9 13.1 2 12 2Z" />
      <path d="M10 8H14" />
      <path d="M9 14H15" />
      <path d="M12 14V18" />
    </svg>
  )
}
