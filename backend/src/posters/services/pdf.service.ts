import { Resvg } from '@resvg/resvg-js'
import PDFDocument from 'pdfkit'

/**
 * Convert SVG content to a PDF buffer.
 * Renders SVG → PNG via resvg at full resolution, then embeds the PNG in a PDF
 * at the correct physical dimensions.
 */
export async function svgToPdfBuffer(
  svgContent: string,
  widthPx: number,
  heightPx: number,
  dpi = 300
): Promise<Buffer> {
  // Render SVG to PNG at full resolution
  const resvg = new Resvg(svgContent, {
    font: { loadSystemFonts: true },
    fitTo: { mode: 'width' as const, value: widthPx },
  })
  const pngData = resvg.render()
  const pngBuffer = Buffer.from(pngData.asPng())

  // Calculate physical dimensions in PDF points (1 point = 1/72 inch)
  const widthPt = (widthPx / dpi) * 72
  const heightPt = (heightPx / dpi) * 72

  // Create PDF and embed the PNG
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: [widthPt, heightPt],
      margin: 0,
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.image(pngBuffer, 0, 0, { width: widthPt, height: heightPt })
    doc.end()
  })
}
