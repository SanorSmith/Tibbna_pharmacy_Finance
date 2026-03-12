export default function PharmacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden text-[#2B2D2F]">
      {children}
    </div>
  );
}
