import { DtePayload, SiiConfig } from '../types';

export function generateBoletaXml(payload: DtePayload, config: SiiConfig): string {
  const { Encabezado, Detalles } = payload;
  
  const detallesXml = Detalles.map((item, index) => `
    <Detalle>
        <NroLinDet>${index + 1}</NroLinDet>
        <NmbItem>${item.NmbItem.substring(0, 80)}</NmbItem>
        <QtyItem>${item.QtyItem}</QtyItem>
        <PrcItem>${Math.round(item.PrcItem)}</PrcItem>
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
                <IndServicio>${Encabezado.IndServicio || 3}</IndServicio>
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
                <RUTRecep>66666666-6</RUTRecep> 
            </Receptor>
            <Totales>
                <MntTotal>${Math.round(Encabezado.MntTotal)}</MntTotal>
            </Totales>
        </Encabezado>
        ${detallesXml}
    </Documento>
</DTE>`.trim();
}
