import { DtePayload, SiiConfig } from '../types';

export function generateFacturaXml(payload: DtePayload, config: SiiConfig, tedXml?: string): string {
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

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE xmlns="http://www.sii.cl/SiiDte" version="1.0">
    <Documento ID="F${Encabezado.Folio}T${Encabezado.TipoDTE}">
        <Encabezado>
            <IdDoc>
                <TipoDTE>${Encabezado.TipoDTE}</TipoDTE>
                <Folio>${Encabezado.Folio}</Folio>
                <FchEmis>${Encabezado.FchEmis}</FchEmis>
                ${Encabezado.FchVenc ? `<FchVenc>${Encabezado.FchVenc}</FchVenc>` : ''}
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
                <RznSocRecep>${(Encabezado.RznSocRecep || 'CLIENTE FACTURA').substring(0, 40)}</RznSocRecep>
                <GiroRecep>${(Encabezado.GiroRecep || 'GIRO CLIENTE').substring(0, 40)}</GiroRecep>
                <DirRecep>${(Encabezado.DirRecep || 'DIRECCION CLIENTE').substring(0, 70)}</DirRecep>
                <CmnaRecep>${(Encabezado.CmnaRecep || 'SANTIAGO').substring(0, 20)}</CmnaRecep>
                <CiudadRecep>${(Encabezado.CiudadRecep || 'SANTIAGO').substring(0, 20)}</CiudadRecep>
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
        ${tedXml || ''}
        <TmstFirma>${new Date().toISOString().replace(/\.\d{3}Z$/, '')}</TmstFirma>
    </Documento>
</DTE>`.trim();
}
