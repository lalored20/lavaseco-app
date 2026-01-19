-- Vista para ver Facturas completas con Cliente y Total de Items
-- Ejecuta esto en el Editor SQL de Supabase

CREATE OR REPLACE VIEW vista_resumen_facturas AS
SELECT 
    o.id AS "Folio",
    c.name AS "Cliente",
    c.phone AS "Teléfono",
    TO_CHAR(o."createdAt", 'DD/MM/YYYY HH24:MI') AS "Fecha Creación",
    TO_CHAR(o."scheduledDate", 'DD/MM/YYYY') AS "Fecha Entrega",
    o."status" AS "Estado Proceso",
    o."paymentStatus" AS "Estado Pago",
    o."totalValue" AS "Total a Pagar",
    o."paidAmount" AS "Abonado",
    (o."totalValue" - o."paidAmount") AS "Saldo Pendiente",
    (SELECT COUNT(*) FROM "OrderItem" oi WHERE oi."orderId" = o.id) AS "Total Prendas"
FROM "Order" o
JOIN "Client" c ON o."clientId" = c.id
ORDER BY o.id DESC;

-- Comentario:
-- Esta vista te mostrará una tabla "virtual" llamada vista_resumen_facturas
-- Puedes consultarla igual que una tabla normal para ver todo junto.
