import { DtePayload, SiiConfig } from '../types';
import { xmlText } from '../xml-text';
import { timestampChile } from '../fecha-chile';

export function generateNotaCreditoXml(payload: DtePayload, config: SiiConfig, tedXml?: string): string {
  const { Encabezado, Detalles } = payload;
  
  const detallesXml = Detalles.map((item, index) => `
    <Detalle>
        <NroLinDet>${index + 1}</NroLinDet>
        ${item.IndExe ? `<IndExe>${item.IndExe}</IndExe>` : ''}
        <NmbItem>${xmlText(item.NmbItem, 80)}</NmbItem>
        <QtyItem>${item.QtyItem}</QtyItem>
        <PrcItem>${item.PrcItem}</PrcItem>
        <MontoItem>${Math.round(item.MontoItem)}</MontoItem>
    </Detalle>`).join('');

  const referenciasXml = (Encabezado.Referencias || []).map((ref, index) => `
    <Referencia>
        <NroLinRef>${index + 1}</NroLinRef>
        <TpoDocRef>${ref.TpoDocRef}</TpoDocRef>
        <FolioRef>${ref.FolioRef}</FolioRef>
        <FchRef>${ref.FchRef}</FchRef>
        <CodRef>${ref.CodRef || 1}</CodRef>
        <RazonRef>${xmlText(ref.RazonRef || 'ANULA DOCUMENTO', 90)}</RazonRef>
    </Referencia>`).join('');

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE xmlns="http://www.sii.cl/SiiDte" version="1.0">
    <Documento ID="F${Encabezado.Folio}T${Encabezado.TipoDTE}">
        <Encabezado>
            <IdDoc>
                <TipoDTE>${Encabezado.TipoDTE}</TipoDTE>
                <Folio>${Encabezado.Folio}</Folio>
                <FchEmis>${Encabezado.FchEmis}</FchEmis>
            </IdDoc>
            <Emisor>
                <RUTEmisor>${xmlText(config.rutEmisor)}</RUTEmisor>
                <RznSoc>${xmlText(config.razonSocial, 100)}</RznSoc>
                <GiroEmis>${xmlText(config.giro, 80)}</GiroEmis>
                ${config.acteco ? `<Acteco>${config.acteco}</Acteco>` : ''}
                <DirOrigen>${xmlText(config.direccion, 70)}</DirOrigen>
                <CmnaOrigen>${xmlText(config.comuna, 20)}</CmnaOrigen>
                <CiudadOrigen>${xmlText(config.ciudad, 20)}</CiudadOrigen>
            </Emisor>
            <Receptor>
                <RUTRecep>${xmlText(Encabezado.RUTRecep)}</RUTRecep>
                <RznSocRecep>${xmlText(Encabezado.RznSocRecep || 'CLIENTE', 40)}</RznSocRecep>
            </Receptor>
            <Totales>
                <MntNeto>${Math.round(Encabezado.MntNeto || 0)}</MntNeto>
                ${Encabezado.MntExe ? `<MntExe>${Math.round(Encabezado.MntExe)}</MntExe>` : ''}
                <TasaIVA>${Encabezado.TasaIVA || 19}</TasaIVA>
                <IVA>${Math.round(Encabezado.IVA || 0)}</IVA>
                <MntTotal>${Math.round(Encabezado.MntTotal)}</MntTotal>
            </Totales>
        </Encabezado>
        ${detallesXml}
        ${referenciasXml}
        ${tedXml || ''}
        <TmstFirma>${timestampChile()}</TmstFirma>
    </Documento>
</DTE>`.trim();
}
