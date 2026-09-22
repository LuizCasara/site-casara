import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {RefObject} from 'react';

// Shared engine: captures a hidden content element with html2canvas and assembles
// a (possibly multi-page) A4 PDF from it. Reused by every test's PDF download
// (temperament, love languages, ...) — only the content component and filename differ.
export const renderElementToPdf = async (
    pdfContentRef: RefObject<HTMLDivElement>,
    filename: string,
    setIsPdfLoading: (loading: boolean) => void
) => {
    try {
        setIsPdfLoading(true);

        // Get the PDF content element
        const pdfContentElement = pdfContentRef.current;
        if (!pdfContentElement) {
            throw new Error('PDF content element not found');
        }

        // Make the PDF content visible for html2canvas to capture it
        pdfContentElement.style.display = 'block';
        pdfContentElement.style.position = 'absolute';
        pdfContentElement.style.left = '-9999px';

        // Use html2canvas to capture the content as an image
        const canvas = await html2canvas(pdfContentElement, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            logging: false,
            allowTaint: true
        });

        // Hide the PDF content again
        pdfContentElement.style.display = 'none';

        // Create PDF with jsPDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/png');

        // Calculate dimensions to fit the image on the page
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm

        // Calculate the total height of the image in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Add the image to the PDF, potentially across multiple pages
        let heightLeft = imgHeight;
        let position = 0;
        let page = 1;

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add additional pages if needed
        while (heightLeft > 0) {
            position = -pageHeight * page;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            page++;
        }

        // Save the PDF
        pdf.save(`${filename}.pdf`);

        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);

        // Show an alert to the user with a helpful message
        alert('Não foi possível gerar o PDF. Por favor, tente novamente mais tarde.');

        return false;
    } finally {
        setIsPdfLoading(false);
    }
};
