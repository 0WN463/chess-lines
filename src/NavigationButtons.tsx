const NavigationButtons = ({
  className,
  options,
  withBack,
  onClick,
  onBack,
  onHover,
}: {
  className: string;
  options: string[];
  withBack: boolean;
  onClick: (_: number) => void;
  onBack: () => void;
  onHover: (_: string) => void;
}) => {
  return (
    <div className={className}>
      {options.map((c, i) => (
        <button
          key={i}
          className="border-4 rounded p-2 basis-0 grow max-w-xs hover:bg-gray-100"
          onClick={() => onClick(i)}
          onMouseEnter={(e) => onHover((e.target as Element).innerHTML)}
          onMouseLeave={() => onHover("")}
        >
          {c}
        </button>
      ))}
      {withBack && (
        <button
          className="border-4 p-2 basis-0 grow max-w-xs hover:bg-gray-100"
          onClick={onBack}
        >
          Back
        </button>
      )}
    </div>
  );
};

export default NavigationButtons;
