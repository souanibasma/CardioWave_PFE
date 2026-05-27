export function ECGPattern() {
  return (
    <svg 
      className="absolute inset-0 w-full h-full pointer-events-none opacity-5" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ zIndex: 0 }}
    >
      <defs>
        <pattern id="ecg-pattern" x="0" y="0" width="200" height="100" patternUnits="userSpaceOnUse">
          <path
            d="M0,50 L40,50 L45,30 L50,70 L55,40 L60,50 L200,50"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ecg-pattern)" />
    </svg>
  );
}
