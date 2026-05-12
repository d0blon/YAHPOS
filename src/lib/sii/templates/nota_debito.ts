import { DtePayload, SiiConfig } from '../types';

export function generateNotaDebitoXml(payload: DtePayload, config: SiiConfig, tedXml?: string): string {
  const { Encabezado, Detalles } = payload;
  
  const detallesXml = Detalles.map((item, index) => `
    <Detalle>
        <NroLinDet>${index + 1}</NroLinDet>
        <NmbItem>${item.NmbItem.substring(0, 80).replace(/[<>&"']/g, '')}</NmbItem>
        <QtyItem>${item.QtyItem}</QtyItem>
        <PrcItem>${Math.round(item.PrcItem)}</PrcItem>
        ${item.IndExe ? `<IndExe>${item.IndExe}</IndExe>` : ''}
        <MontoItem>${Math.round(item.MontoItem)}</MontoItem>
    </Detalle>`).join('');

  const referenciasXml = (Encabezado.Referencias || []).map((ref, index) => `
    <Referencia>
        <NroLinRef>${index + 1}</NroLinRef>
        <TpoDocRef>${ref.TpoDocRef}</TpoDocRef>
        <FolioRef>${ref.FolioRef}</FolioRef>
        <FchRef>${ref.FchRef}</FchRef>
        <CodRef>${ref.CodRef || 1}</CodRef>
        <RazonRef>${(ref.RazonRef || 'AUMENTO DE MONTO').substring(0, 90)}</RazonRef>
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
                <RUTEmisor>${config.rutEmisor}</RUTEmisor>
                <RznSoc>${config.razonSocial.substring(0, 100)}</RznSoc>
                <GiroEmis>${config.giro.substring(0, 80)}</GiroEmis>
                <DirOrigen>${config.direccion.substring(0, 70)}</DirOrigen>
                <CmnaOrigen>${config.comuna.substring(0, 20)}</CmnaOrigen>
                <CiudadOrigen>${config.ciudad.substring(0, 20)}</CiudadOrigen>
            </Emisor>
            <Receptor>
                <RUTRecep>${Encabezado.RUTRecep}</RUTRecep>
                <RznSocRecep>${(Encabezado.RznSocRecep || 'CLIENTE').substring(0, 40)}</RznSocRecep>
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
        <TmstFirma>${new Date().toISOString().replace(/\.\d{3}Z$/, '')}</TmstFirma>
    </Documento>
</DTE>`.trim();
}
