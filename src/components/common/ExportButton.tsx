import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

interface ExportButtonProps {
  data: any[];
  filename?: string;
  headers?: Record<string, string>;
  label?: string;
  className?: string;
}

export function ExportButton({
  data,
  filename = "data",
  headers,
  label = "تصدير Excel",
  className,
}: ExportButtonProps) {
  const handleExport = () => {
    // 1. Prepare data with headers if provided
    let exportData = data;

    if (headers) {
      exportData = data.map((item) => {
        const row: Record<string, any> = {};
        Object.keys(item).forEach((key) => {
          // Only include keys defined in headers if headers are provided
          if (headers[key]) {
            row[headers[key]] = item[key];
          }
          // If a key is not in headers, we skip it
        });
        return row;
      });
    }

    // 2. Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // 3. Adjust column width (optional, basic auto-width approximation)
    const wscols = Object.keys(exportData[0] || {}).map((key) => ({ wch: 20 }));
    ws["!cols"] = wscols;

    // 4. Append worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    // 5. Generate file download
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const fullFilename = `${filename}_${dateStr}.xlsx`;

    XLSX.writeFile(wb, fullFilename);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`gap-2 ${className}`}
      onClick={handleExport}
      disabled={!data || data.length === 0}
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
