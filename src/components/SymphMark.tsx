type Props = {
  className?: string;
};

export function SymphMark({ className = "" }: Props) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
    >
      <circle cx="16" cy="16" r="16" fill="#000000" />
      <text
        x="16"
        y="16"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        style={{ fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif", fontSize: "17px", fontWeight: 700 }}
      >
        S
      </text>
    </svg>
  );
}
