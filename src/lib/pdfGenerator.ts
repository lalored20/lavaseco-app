import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateForDisplay } from './dateUtils';
import QRCode from 'qrcode';

interface InvoiceData {
    ticketNumber: string;
    client: {
        name: string;
        phone: string;
        cedula: string;
    };
    items: {
        quantity: number;
        description: string;
        notes?: string;
        price: number;
    }[];
    totalValue: number;
    paidAmount: number;
    date: Date | string;
    paymentStatus: string;
    generalNote?: string;
}

// --- Placeholder for Custom Logo ---
// import logoBase64 from '@/assets/logo'; 

export const generateInvoicePDF = async (data: InvoiceData, format: 'letter' | 'ticket' = 'ticket', autoDownload: boolean = true) => {
    const isTicket = format === 'ticket';

    // Generate QR Code
    let qrCodeDataUrl = '';
    try {
        // You can encode the Ticket Number or a deep link URL here
        // Convert to string explicitly to avoid "Invalid data" error if number/null passed
        const qrText = data.ticketNumber ? String(data.ticketNumber) : '0000';
        qrCodeDataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 100 });
    } catch (err) {
        console.error("Error generating QR:", err);
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isTicket ? [80, 2000] : 'a4', // 80mm width, auto height (simulated long paper)
    });

    if (isTicket) {
        // --- 80mm TICKET FORMAT ---
        const MARGIN = 2;
        const WIDTH = 72; // 80 - 2 - 6
        let y = 10;

        // Logo Placeholder
        // doc.addImage(logoBase64, 'PNG', 20, y, 40, 20); 
        // y += 25;

        // Header
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("LAVASECO ORQUÍDEAS", 40, y, { align: "center" });
        y += 6;

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("LÍDER EN CALIDAD Y SERVICIO", 40, y, { align: "center" });
        y += 4;
        doc.text("CALLE 91 B SUR # 12-71", 40, y, { align: "center" });
        y += 3.5;
        doc.text("AV. USME - VIRREY /BOGOTÁ,D.C.", 40, y, { align: "center" });
        y += 4;
        doc.text("Tel: 300 123 4567", 40, y, { align: "center" });
        y += 8;

        // Order Info
        doc.setDrawColor(0, 0, 0);
        doc.line(MARGIN, y, 80 - MARGIN, y); // Separator
        y += 5;

        doc.setFontSize(18); // Increased size
        doc.setFont("helvetica", "bold");
        doc.text(`ORDEN #${data.ticketNumber}`, 40, y, { align: "center" });
        y += 7; // Increased spacing for larger font

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(`Fecha de entrada: ${formatDateForDisplay(data.date)}`, 40, y, { align: "center" });
        y += 3.5;

        // Calculate delivery date (2 days after entry)
        const entryDate = new Date(data.date);
        const deliveryDate = new Date(entryDate);
        deliveryDate.setDate(deliveryDate.getDate() + 2);
        const deliveryDateStr = formatDateForDisplay(deliveryDate);

        doc.text(`Fecha de entrega: ${deliveryDateStr} en la tarde`, 40, y, { align: "center" });
        y += 8;

        // Client
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("CLIENTE:", MARGIN, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.text(data.client.name.substring(0, 30), MARGIN, y);
        y += 4;
        doc.text(`C.C: ${data.client.cedula}`, MARGIN, y);
        y += 4;
        doc.text(`Tel: ${data.client.phone}`, MARGIN, y);
        y += 8;

        // General Note (if exists)
        if (data.generalNote) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("NOTA:", MARGIN, y);
            y += 4;
            doc.setFont("helvetica", "italic");
            const noteLines = doc.splitTextToSize(data.generalNote, WIDTH);
            doc.text(noteLines, MARGIN, y);
            y += (noteLines.length * 4) + 4;
        }

        // Items Table with Grid Borders
        doc.setFontSize(9);  // Increased from 8 to 9
        doc.setFont("helvetica", "bold");

        // Table Header with borders - Widths must total exactly WIDTH (72mm)
        const tableStartY = y;
        const colWidths = { cant: 10, desc: 42, valor: 20 }; // Total: 72mm

        // Verify total width
        const totalWidth = colWidths.cant + colWidths.desc + colWidths.valor; // Should be 72

        // Draw header row border
        doc.rect(MARGIN, y - 3, colWidths.cant, 5);
        doc.rect(MARGIN + colWidths.cant, y - 3, colWidths.desc, 5);
        doc.rect(MARGIN + colWidths.cant + colWidths.desc, y - 3, colWidths.valor, 5);

        doc.text("CANT", MARGIN + colWidths.cant / 2, y, { align: "center" });
        doc.text("DESCRIPCION", MARGIN + colWidths.cant + 2, y);
        doc.text("VALOR", MARGIN + colWidths.cant + colWidths.desc + colWidths.valor / 2, y, { align: "center" });
        y += 4;

        // Items with grid borders
        doc.setFont("helvetica", "normal");
        data.items.forEach(item => {
            // Text Wrapping Logic
            const descWidth = colWidths.desc - 3; // Padding
            const splitDesc = doc.splitTextToSize(item.description || '', descWidth);
            const numberOfLines = splitDesc.length;
            const hasNotes = item.notes && item.notes !== '';

            // Calculate dynamic row height
            // Base height per line of description approx 4mm
            // Extra space for notes if present
            let contentHeight = (numberOfLines * 4);
            if (hasNotes) contentHeight += 4; // Add space for note

            const rowHeight = Math.max(6, contentHeight + 2); // Min 6mm height
            const rowStartY = y - 2;

            // Draw cell borders with dynamic height
            doc.rect(MARGIN, rowStartY, colWidths.cant, rowHeight);
            doc.rect(MARGIN + colWidths.cant, rowStartY, colWidths.desc, rowHeight);
            doc.rect(MARGIN + colWidths.cant + colWidths.desc, rowStartY, colWidths.valor, rowHeight);

            // Quantity (Center vertically relative to first line)
            doc.setFontSize(9);
            doc.text(item.quantity.toString(), MARGIN + colWidths.cant / 2, y + 2, { align: "center" });

            // Description (Wrapped)
            doc.text(splitDesc, MARGIN + colWidths.cant + 2, y + 2);

            // Notes/Defects - show below description
            if (hasNotes) {
                const noteY = y + (numberOfLines * 4) + 1; // Position below description lines
                doc.setFontSize(7);
                doc.setFont("helvetica", "bolditalic"); // Bold Italic for visibility
                doc.setTextColor(0, 0, 0); // BLACK COLOR as requested
                doc.text(`(${item.notes})`, MARGIN + colWidths.cant + 2, noteY);
                doc.setFont("helvetica", "normal"); // Reset font
                doc.setFontSize(9); // Reset size
            }

            // Value - centered in the valor column
            doc.text(`$${new Intl.NumberFormat('es-CO').format(item.price)}`, MARGIN + colWidths.cant + colWidths.desc + colWidths.valor / 2, y + 2, { align: "center" });

            y += rowHeight;
        });

        y += 4;

        // Total Section with Grid
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");

        // Total box - Show pending balance
        const totalBoxY = y;
        const pendingBalance = data.totalValue - data.paidAmount;
        doc.rect(MARGIN, totalBoxY, WIDTH, 6);
        doc.text("Total $:", MARGIN + 2, totalBoxY + 4);
        // Move value more to the left (80 - MARGIN - 12 instead of -2)
        doc.text(`${new Intl.NumberFormat('es-CO').format(pendingBalance)}`, 80 - MARGIN - 12, totalBoxY + 4, { align: "right" });
        y += 8;

        // Payment Details Grid (Updated to 4 columns: Items, Abono, Total, Saldo)
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");

        const payBoxY = y;
        const payColWidth = WIDTH / 4; // Divided by 4 columns

        // Draw grid for payment details
        doc.rect(MARGIN, payBoxY, payColWidth, 5);
        doc.rect(MARGIN + payColWidth, payBoxY, payColWidth, 5);
        doc.rect(MARGIN + payColWidth * 2, payBoxY, payColWidth, 5);
        doc.rect(MARGIN + payColWidth * 3, payBoxY, payColWidth, 5);

        doc.text("No. artículos", MARGIN + payColWidth / 2, payBoxY + 3.5, { align: "center" });
        doc.text("Abono", MARGIN + payColWidth * 1.5, payBoxY + 3.5, { align: "center" });
        doc.text("Total", MARGIN + payColWidth * 2.5, payBoxY + 3.5, { align: "center" });
        doc.text("Saldo", MARGIN + payColWidth * 3.5, payBoxY + 3.5, { align: "center" });

        y += 5;

        // Values row
        doc.setFont("helvetica", "normal");
        doc.rect(MARGIN, y, payColWidth, 5);
        doc.rect(MARGIN + payColWidth, y, payColWidth, 5);
        doc.rect(MARGIN + payColWidth * 2, y, payColWidth, 5);
        doc.rect(MARGIN + payColWidth * 3, y, payColWidth, 5);

        const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
        const balance = data.totalValue - data.paidAmount;

        doc.text(totalItems.toString(), MARGIN + payColWidth / 2, y + 3.5, { align: "center" });
        doc.text(new Intl.NumberFormat('es-CO').format(data.paidAmount), MARGIN + payColWidth * 1.5, y + 3.5, { align: "center" });
        doc.text(new Intl.NumberFormat('es-CO').format(data.totalValue), MARGIN + payColWidth * 2.5, y + 3.5, { align: "center" }); // Show Full Total
        doc.text(new Intl.NumberFormat('es-CO').format(balance), MARGIN + payColWidth * 3.5, y + 3.5, { align: "center" });

        y += 8;

        // Payment Method
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Medios de pago", 40, y, { align: "center" });
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.text(balance <= 0 ? "PAGADO" : `ABONO: $${new Intl.NumberFormat('es-CO').format(data.paidAmount)}`, 40, y, { align: "center" });
        y += 8;

        // Footer - Legal Text
        doc.setFontSize(7);  // Increased from 6 to 7
        doc.setFont("helvetica", "normal");

        // Line separator before footer
        doc.line(MARGIN, y, 80 - MARGIN, y);
        y += 4;  // Increased spacing

        // Legal disclaimer text (matching physical receipt)
        // Legal Footer Section

        // Define a safe width for text (60mm) to absolutely ensure no cutoff
        const SAFE_WIDTH = 60;

        // 1. Services Block (CENTERED)
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const servicesText = "SERVICIO DE TINTORERÍA, LAVADO EN SECO Y PLANCHADO. SE LAVAN TODAS SUS PRENDAS DELICADAS. LAVAMOS EDREDONES, CORTINAS, COBIJAS, FALDAS, ABRIGOS, CHAQUETAS, CAMISAS, PANTALONES, SACOS, VESTIDOS, ETC.";
        const splitServices = doc.splitTextToSize(servicesText, SAFE_WIDTH);
        doc.text(splitServices, 40, y, { align: "center", maxWidth: SAFE_WIDTH });
        y += (splitServices.length * 3) + 4;

        // 2. Conditions Block (CENTERED)
        const legalText = "CONDICIONES: Es obligatorio presentar este recibo; tras 30 días cesa nuestra responsabilidad. Las prendas quedan por cuenta y riesgo del dueño en casos fortuitos (robo o incendio). No respondemos por objetos olvidados, botones, broches ni daños por telas inconsistentes (encogimiento o decoloración). Una vez retirada la prenda, no se aceptan reclamos. En caso de extravío o cambio, se indemnizará hasta por 5 veces el valor del lavado (Art. 2057 C.C. sobre responsabilidad del artífice). La recepción de este tiquete implica la aceptación de estas condiciones y autoriza el tratamiento de datos personales según la Ley 1581 de 2012 (Habeas Data).";
        const splitLegal = doc.splitTextToSize(legalText, SAFE_WIDTH);
        doc.text(splitLegal, 40, y, { align: "center", maxWidth: SAFE_WIDTH });
        y += (splitLegal.length * 3) + 4;

        // 3. Reminder Block (CENTERED)
        const reminderText = "RECUERDE PRESENTAR LA FACTURA AL RETIRAR SUS PRENDAS Y EN CASO DE PÉRDIDA DE LA FACTURA PRESENTAR DOCUMENTO DE IDENTIDAD.";
        const splitReminder = doc.splitTextToSize(reminderText, SAFE_WIDTH);
        doc.text(splitReminder, 40, y, { align: "center", maxWidth: SAFE_WIDTH });
        y += (splitReminder.length * 3) + 4;

        y += 2;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("¡Gracias por su preferencia!", 40, y, { align: "center" });
        y += 6;

        // QR Code at the very end (like reference receipt)
        if (qrCodeDataUrl) {
            doc.addImage(qrCodeDataUrl, 'PNG', 25, y, 30, 30); // Centered QR
            y += 32;

            // QR Label
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.text("Representación Gráfica", 40, y, { align: "center" });
        }

        // Auto-print script (Optional, works in some viewers)
        // doc.autoPrint();

    } else {
        // --- STANDARD LETTER FORMAT ---
        // Header
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text("LAVASECO ORQUÍDEAS", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Limpieza Profesional de Prendas", 105, 26, { align: "center" });
        doc.text("Calle Principal #123 - Tel: 300 123 4567", 105, 30, { align: "center" });

        // Invoice Info Box
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(248, 248, 248);
        doc.roundedRect(15, 40, 180, 25, 3, 3, "FD");

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`ORDEN DE SERVICIO #${data.ticketNumber}`, 20, 52);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(`Fecha: ${data.date.toLocaleString('es-CO')}`, 20, 60);

        // Client Info
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("DATOS DEL CLIENTE:", 15, 80);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Nombre: ${data.client.name}`, 15, 86);
        doc.text(`Cédula: ${data.client.cedula}`, 15, 91);
        doc.text(`Teléfono: ${data.client.phone}`, 15, 96);

        // General Note (if exists)
        if (data.generalNote) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("NOTA / OBSERVACIONES:", 140, 80);

            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            const noteLines = doc.splitTextToSize(data.generalNote, 60);
            doc.text(noteLines, 140, 86);
        }

        // Table
        autoTable(doc, {
            startY: 105,
            head: [['Cant.', 'Descripción', 'Novedades', 'Total']],
            body: data.items.map(item => [
                item.quantity,
                item.description,
                item.notes || '-',
                `$${new Intl.NumberFormat('es-CO').format(item.price)}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [75, 85, 99], textColor: 255, fontStyle: 'bold' }, // Slate-600
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 60 },
                3: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
            },
        });

        // Totals
        // @ts-ignore
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        doc.setFontSize(10);
        doc.text("Valor Total:", 140, finalY);
        doc.setFont("helvetica", "bold");
        doc.text(`$${new Intl.NumberFormat('es-CO').format(data.totalValue)}`, 195, finalY, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.text("Abono / Pagado:", 140, finalY + 6);
        doc.setFont("helvetica", "bold");
        doc.text(`$${new Intl.NumberFormat('es-CO').format(data.paidAmount)}`, 195, finalY + 6, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        if ((data.totalValue - data.paidAmount) <= 0) {
            doc.setTextColor(0, 150, 0); // Green
            doc.text("¡PAGADO!", 195, finalY + 14, { align: "right" });
        } else {
            doc.setTextColor(200, 0, 0); // Red
            doc.text("PENDIENTE:", 140, finalY + 14);
            doc.text(`$${new Intl.NumberFormat('es-CO').format(data.totalValue - data.paidAmount)}`, 195, finalY + 14, { align: "right" });
        }

        // QR handling for Letter format could be done here too if needed, but keeping it simple for Ticket as requested
        if (qrCodeDataUrl) {
            doc.addImage(qrCodeDataUrl, 'PNG', 20, finalY + 20, 30, 30);
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text("Gracias por confiar en Lavaseco Orquídeas.", 105, 280, { align: "center" });
        doc.text("No se responde por prendas después de 30 días.", 105, 284, { align: "center" });
    }

    // Return blob for auto-print instead of auto-download
    const pdfBlob = doc.output('blob');

    // Only trigger download/print if requested
    if (autoDownload) {
        // Standard Download (Backup)
        // doc.save(`Recibo_Lavaseco_${data.ticketNumber}.pdf`);

        // Auto-Print Logic
        const blobUrl = URL.createObjectURL(pdfBlob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
    }

    return pdfBlob;

    return pdfBlob;
};
