import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download, ExternalLink, Printer } from 'lucide-react';
import { TOTAL_TABLES } from '../utils/format';

interface TableQrItem {
  tableNumber: number;
  label: string;
  url: string;
  dataUrl: string;
}

export function AdminQrCodes() {
  const [baseUrl, setBaseUrl] = useState(() => window.location.origin);
  const [qrItems, setQrItems] = useState<TableQrItem[]>([]);
  const [copiedTable, setCopiedTable] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cleanBase = baseUrl.trim().replace(/\/+$/, '') || window.location.origin;

    (async () => {
      const generated: TableQrItem[] = [];
      for (let i = 1; i <= TOTAL_TABLES; i++) {
        const url = `${cleanBase}/?table=${i}`;
        try {
          const dataUrl = await QRCode.toDataURL(url, {
            width: 440,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#141413',
              light: '#FFFFFF',
            },
          });
          generated.push({
            tableNumber: i,
            label: `Стол ${i}`,
            url,
            dataUrl,
          });
        } catch {
          generated.push({
            tableNumber: i,
            label: `Стол ${i}`,
            url,
            dataUrl: '',
          });
        }
      }
      if (!cancelled) {
        setQrItems(generated);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  const handleCopy = async (tableNumber: number, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTable(tableNumber);
      setTimeout(() => setCopiedTable(null), 1800);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const handleDownload = (item: TableQrItem) => {
    if (!item.dataUrl) return;
    const link = document.createElement('a');
    link.href = item.dataUrl;
    link.download = `stol-${item.tableNumber}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="no-print bg-white border border-stone-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex-1 max-w-xl">
          <label
            htmlFor="qr-base-url"
            className="block text-xs font-medium text-stone-700 mb-1.5"
          >
            Домен сайта для QR-кодов (при сканировании откроется меню с уже выбранным столом)
          </label>
          <input
            id="qr-base-url"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full px-3.5 py-2 text-sm font-mono bg-[#F8F8F6] border border-stone-200 rounded-lg text-[#141413] focus:outline-none focus:border-[#1B4332]"
          />
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143326] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Печать всех 10 QR-кодов</span>
        </button>
      </div>

      <div className="print-qr-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {qrItems.map((item) => (
          <article
            key={item.tableNumber}
            className="print-qr-card bg-white border border-stone-200 rounded-xl p-5 flex flex-col items-center text-center"
          >
            <div className="w-full pb-3 border-b border-stone-100">
              <p className="text-xs text-stone-500">Сезон</p>
              <h3 className="font-display text-xl font-semibold text-[#141413] mt-0.5 tabular-nums">
                {item.label}
              </h3>
            </div>

            <div className="my-4 w-44 h-44 bg-white border border-stone-200 rounded-lg p-2 flex items-center justify-center">
              {item.dataUrl ? (
                <img
                  src={item.dataUrl}
                  alt={`QR-код для ${item.label}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-stone-400">Генерация...</span>
              )}
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Наведите камеру, чтобы открыть меню и отправить заказ на этот стол
            </p>

            <div className="no-print mt-4 pt-3 border-t border-stone-100 w-full flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDownload(item)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#141413] bg-[#F8F8F6] hover:bg-stone-200/70 border border-stone-200 rounded-md transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(item.tableNumber, item.url)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#141413] bg-[#F8F8F6] hover:bg-stone-200/70 border border-stone-200 rounded-md transition-colors cursor-pointer"
                >
                  {copiedTable === item.tableNumber ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Ссылка</span>
                    </>
                  )}
                </button>
              </div>
              <a
                href={`/?table=${item.tableNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#1B4332] hover:bg-[#1B4332]/8 rounded-md transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Проверить меню стола</span>
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
