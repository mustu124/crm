export function Toast({
  message,
  tone = "success",
}: {
  message: string;
  tone?: "success" | "error";
}) {
  return (
    <div
      className={`fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border p-3 text-sm font-black shadow-card lg:bottom-5 ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-leaf-500/25 bg-leaf-100 text-leaf-700"
      }`}
    >
      {message}
    </div>
  );
}
