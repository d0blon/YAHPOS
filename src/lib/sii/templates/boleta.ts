import { DtePayload, SiiConfig } from '../types';
import { xmlText } from '../xml-text';
import { timestampChile } from '../fecha-chile';

export function generateBoletaXml(payload: DtePayload, config: SiiConfig, tedXml?: string): string {
  const { Encabezado, Detalles } = payload;
  
  const detallesXml = Detalles.map((item, index) => `
    <Detalle>
        <NroLinDet>${index + 1}</NroLinDet>
        ${item.IndExe ? `<IndExe>${item.IndExe}</IndExe>` : ''}
        <NmbItem>${xmlText(item.NmbItem, 80)}</NmbItem>
        <QtyItem>${item.QtyItem}</QtyItem>
        ${item.Unmd ? `<Unmd>${xmlText(item.Unmd, 4)}</Unmd>` : ''}
        <PrcItem>${item.PrcItem}</PrcItem>
        <MontoItem>${Math.round(item.MontoItem)}</MontoItem>
    </Detalle>`).join('');

  const referencias = [];
  if (Encabezado.CodRef) referencias.push(`        <CodRef>${xmlText(Encabezado.CodRef)}</CodRef>`);
  if (Encabezado.RazonRef) referencias.push(`        <RazonRef>${xmlText(Encabezado.RazonRef)}</RazonRef>`);
  if (Encabezado.Referencias) {
    for (const ref of Encabezado.Referencias) {
      referencias.push(`        <Referencia>
            <NroLinRef>${referencias.length / 2 + 1}</NroLinRef>
            <TpoDocRef>${ref.TpoDocRef}</TpoDocRef>
            <FolioRef>${ref.FolioRef}</FolioRef>
            <FchRef>${ref.FchRef}</FchRef>
            ${ref.CodRef !== undefined ? `<CodRef>${ref.CodRef}</CodRef>` : ''}
            ${ref.RazonRef ? `<RazonRef>${xmlText(ref.RazonRef)}</RazonRef>` : ''}
        </Referencia>`);
    }
  }

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE xmlns="http://www.sii.cl/SiiDte" version="1.0">
    <Documento ID="F${Encabezado.Folio}T${Encabezado.TipoDTE}">
        <Encabezado>
            <IdDoc>
                <TipoDTE>${Encabezado.TipoDTE}</TipoDTE>
                <Folio>${Encabezado.Folio}</Folio>
                <FchEmis>${Encabezado.FchEmis}</FchEmis>
                <IndServicio>${Encabezado.IndServicio || 3}</IndServicio>
                ${referencias.length > 0 ? '\n' + referencias.join('\n') : ''}
            </IdDoc>
            <Emisor>
                <RUTEmisor>${xmlText(config.rutEmisor)}</RUTEmisor>
                <RznSocEmisor>${xmlText(config.razonSocial, 100)}</RznSocEmisor>
                <GiroEmisor>${xmlText(config.giro, 80)}</GiroEmisor>
                <DirOrigen>${xmlText(config.direccion, 70)}</DirOrigen>
                <CmnaOrigen>${xmlText(config.comuna, 20)}</CmnaOrigen>
                <CiudadOrigen>${xmlText(config.ciudad, 20)}</CiudadOrigen>
            </Emisor>
            <Receptor>
                <RUTRecep>${xmlText(Encabezado.RUTRecep || '66666666-6')}</RUTRecep>
                ${Encabezado.RznSocRecep ? `<RznSocRecep>${xmlText(Encabezado.RznSocRecep, 40)}</RznSocRecep>` : ''}
            </Receptor>
            <Totales>
                ${Encabezado.MntNeto ? `<MntNeto>${Math.round(Encabezado.MntNeto)}</MntNeto>` : ''}
                ${Encabezado.MntExe ? `<MntExe>${Math.round(Encabezado.MntExe)}</MntExe>` : ''}
                ${Encabezado.IVA ? `<IVA>${Math.round(Encabezado.IVA)}</IVA>` : ''}
                <MntTotal>${Math.round(Encabezado.MntTotal)}</MntTotal>
            </Totales>
        </Encabezado>
        ${detallesXml}
        ${tedXml || ''}
        <TmstFirma>${timestampChile()}</TmstFirma>
    </Documento>
</DTE>`.trim();
}
