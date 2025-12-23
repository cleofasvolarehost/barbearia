-- View to aggregate client stats for churn analysis
CREATE OR REPLACE VIEW churn_analysis_view AS
SELECT 
    a.usuario_id AS client_id,
    u.nome AS client_name,
    u.telefone AS client_phone,
    a.establishment_id,
    MAX(a.data) AS last_visit_date,
    COUNT(a.id) AS total_visits,
    SUM(a.preco_total) AS ltv
FROM 
    agendamentos a
JOIN 
    usuarios u ON a.usuario_id = u.id
WHERE 
    a.status = 'concluido' -- Only count completed appointments as valid history
GROUP BY 
    a.usuario_id, u.nome, u.telefone, a.establishment_id;

-- Grant access to the view
GRANT SELECT ON churn_analysis_view TO authenticated;
GRANT SELECT ON churn_analysis_view TO anon;
