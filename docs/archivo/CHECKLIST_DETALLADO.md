# ✅ CHECKLIST TÉCNICO DE PENDIENTES

### 🔐 SEGURIDAD Y NÚCLEO
- [ ] **Auditoría de Roles:** Confirmar que `cajero` no pueda acceder a `/admin/configuracion` vía URL directa.
- [ ] **Manejo de Errores POS:** Guardado local (Offline mode) si se cae el internet.

### 📦 GESTIÓN DE PEDIDOS (ADMIN)
- [ ] **Estado de Pedidos:** Implementar `PATCH /api/orders/[id]` para cambiar estados.
- [ ] **Historial de Caja:** Reporte detallado de cierres pasados.

### 🧾 FACTURACIÓN (SII)
- [ ] **Generación PDF:** Crear PDF real para las boletas.
- [ ] **Set de Pruebas SII:** Ejecutar certificación.

### 🛒 E-COMMERCE (WEB)
- [ ] **Pasarela de Pago:** Conexión real Flow/Webpay.
- [ ] **Notificaciones:** Email automático al comprar/enviar.
- [ ] **Cupones:** Sistema de descuentos.

### 📊 DASHBOARD & MÉTRICAS
- [ ] **Gráficos Reales:** Ventas semanales/mensuales.
- [ ] **Stock Crítico:** Alerta visual de bajo inventario.

### 💳 INTEGRACIÓN TERMINALES (HARDWARE)
- [ ] **SumUp / Mercado Pago:** Integración vía API/Bluetooth para enviar el monto automáticamente.
- [ ] **TUU / Getnet:** Configuración de comunicación directa para evitar errores de digitación.
- [ ] **Lector de Tarjetas:** Soporte para lectura de chip/contactless desde el navegador.

### 🚀 EXTRAS Y CIERRE FINAL
- [ ] **Exportación de Datos:** Botón para descargar ventas e inventario en Excel/CSV.
- [ ] **Log de Auditoría:** Registro de quién modificó el stock (evitar errores/robos).
- [ ] **Envío Automático:** Mandar boleta por WhatsApp/Email al finalizar la venta.
- [ ] **Multi-sucursal:** Lógica para manejar diferentes bodegas (Plan Élite).
